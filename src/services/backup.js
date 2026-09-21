import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS, clearAllData } from './storage';

const SCHEMA_VERSION = 1;
const PHOTO_DIR = FileSystem.documentDirectory + 'progress_photos/';

async function ensurePhotoDir() {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

// iOS app UUID in the documentDirectory path can change across builds/reinstalls,
// same rebasing progressPhotos.js does when reading stored photo URIs.
function rebaseUri(storedUri) {
  if (!storedUri) return storedUri;
  const marker = 'progress_photos/';
  const idx = storedUri.indexOf(marker);
  if (idx === -1) return storedUri;
  return FileSystem.documentDirectory + storedUri.slice(idx);
}

// Bundles every AsyncStorage key plus progress-photo files (base64-embedded) into
// a single JSON file, then hands it to the native share sheet so the user can save
// it wherever they like (Files, iCloud Drive, AirDrop to a new phone, etc).
export async function exportBackup() {
  const keys = Object.values(KEYS);
  const pairs = await AsyncStorage.multiGet(keys);
  const data = {};
  for (const [key, value] of pairs) {
    data[key] = value ? JSON.parse(value) : null;
  }

  const photos = data[KEYS.PROGRESS_PHOTOS] || [];
  const photoAssets = {};
  for (const photo of photos) {
    if (!photo?.imageUri) continue;
    try {
      photoAssets[photo.id] = await FileSystem.readAsStringAsync(rebaseUri(photo.imageUri), {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (e) {
      // Photo file is missing on disk — skip it rather than failing the whole export.
    }
  }

  const backup = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
    photoAssets,
  };

  const fileName = `BPF-Backup-${new Date().toISOString().slice(0, 10)}.json`;
  const fileUri = FileSystem.cacheDirectory + fileName;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backup));

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Save your BPF Programming backup',
    UTI: 'public.json',
  });

  return {
    sessionCount: (data[KEYS.SESSIONS] || []).length,
    photoCount: Object.keys(photoAssets).length,
  };
}

// Opens the document picker and validates the chosen file. Returns null if the
// user canceled, or throws if the file isn't a recognizable backup.
export async function pickAndValidateBackup() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
  let backup;
  try {
    backup = JSON.parse(raw);
  } catch (e) {
    throw new Error("That file doesn't look like a valid BPF backup.");
  }
  if (!backup || typeof backup !== 'object' || !backup.data || backup.schemaVersion !== SCHEMA_VERSION) {
    throw new Error("That file doesn't look like a valid BPF backup.");
  }
  return backup;
}

// Full replace: clears everything currently on this device, then writes the
// backup's data and photo files back in. Not a merge — matches the "moving to a
// new phone" use case, where the backup should become the device's only source
// of truth rather than mixing with whatever's already here.
export async function restoreBackup(backup) {
  await clearAllData();

  const toSet = Object.entries(backup.data)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, JSON.stringify(value)]);
  if (toSet.length) await AsyncStorage.multiSet(toSet);

  const dirInfo = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (dirInfo.exists) {
    await FileSystem.deleteAsync(PHOTO_DIR, { idempotent: true });
  }
  await ensurePhotoDir();

  const assets = backup.photoAssets || {};
  for (const [id, base64] of Object.entries(assets)) {
    await FileSystem.writeAsStringAsync(`${PHOTO_DIR}${id}.jpg`, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  return {
    sessionCount: (backup.data[KEYS.SESSIONS] || []).length,
    photoCount: Object.keys(assets).length,
  };
}
