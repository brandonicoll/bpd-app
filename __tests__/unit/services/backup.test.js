import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { KEYS } from '../../../src/services/storage';
import { exportBackup, pickAndValidateBackup, restoreBackup } from '../../../src/services/backup';

// In-memory fake filesystem shared by the mocked expo-file-system module below,
// so exportBackup/restoreBackup round-trip through it exactly as they would
// through the real native module. Must be prefixed "mock" so Jest allows the
// jest.mock() factory below to close over it.
let mockFiles = {};

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  getInfoAsync: jest.fn(async (uri) => ({
    exists: Object.prototype.hasOwnProperty.call(mockFiles, uri) || Object.keys(mockFiles).some(k => k.startsWith(uri)),
  })),
  makeDirectoryAsync: jest.fn(async () => {}),
  writeAsStringAsync: jest.fn(async (uri, content) => { mockFiles[uri] = content; }),
  readAsStringAsync: jest.fn(async (uri) => {
    if (!(uri in mockFiles)) throw new Error(`ENOENT: ${uri}`);
    return mockFiles[uri];
  }),
  deleteAsync: jest.fn(async (uri) => {
    Object.keys(mockFiles).forEach(k => { if (k === uri || k.startsWith(uri)) delete mockFiles[k]; });
  }),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

beforeEach(() => {
  AsyncStorage._reset();
  jest.clearAllMocks();
  mockFiles = {};
});

describe('backup export/restore round trip', () => {
  it('restores AsyncStorage data and photo files exactly as exported', async () => {
    const session = { id: 's1', date: '2026-01-01T00:00:00.000Z', exercises: [] };
    const profile = { trainingAge: 'beginner', daysPerWeek: 4 };
    const photoBase64 = 'ZmFrZS1qcGVnLWJ5dGVz'; // arbitrary base64 payload
    const photoPath = 'file:///doc/progress_photos/photo_1.jpg';
    mockFiles[photoPath] = photoBase64;

    await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify([session]));
    await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
    await AsyncStorage.setItem(KEYS.PROGRESS_PHOTOS, JSON.stringify([
      { id: 'photo_1', imageUri: photoPath, date: '2026-01-01T00:00:00.000Z' },
    ]));

    const exportResult = await exportBackup();
    expect(exportResult).toEqual({ sessionCount: 1, photoCount: 1 });

    // Simulate a fresh device: wipe AsyncStorage and the photo directory, but
    // keep the exported backup file in place (as if it were AirDropped over).
    const backupFileUri = Object.keys(mockFiles).find(k => k.startsWith('file:///cache/BPF-Backup-'));
    expect(backupFileUri).toBeDefined();
    const backupContent = mockFiles[backupFileUri];

    AsyncStorage._reset();
    delete mockFiles[photoPath];

    DocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: backupFileUri }],
    });
    // pickAndValidateBackup copies to cache and reads it back — the mock
    // filesystem already has it at this uri, so re-seed it post-reset.
    mockFiles[backupFileUri] = backupContent;

    const backup = await pickAndValidateBackup();
    expect(backup.schemaVersion).toBe(1);

    const restoreResult = await restoreBackup(backup);
    expect(restoreResult).toEqual({ sessionCount: 1, photoCount: 1 });

    const restoredSessions = JSON.parse(await AsyncStorage.getItem(KEYS.SESSIONS));
    const restoredProfile = JSON.parse(await AsyncStorage.getItem(KEYS.USER_PROFILE));
    expect(restoredSessions).toEqual([session]);
    expect(restoredProfile).toEqual(profile);
    expect(mockFiles[photoPath]).toBe(photoBase64);
  });

  it('returns null when the user cancels the picker', async () => {
    DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: true });
    const backup = await pickAndValidateBackup();
    expect(backup).toBeNull();
  });

  it('rejects a file that is not valid JSON', async () => {
    mockFiles['file:///cache/garbage.json'] = 'not json';
    DocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/garbage.json' }],
    });
    await expect(pickAndValidateBackup()).rejects.toThrow("doesn't look like a valid BPF backup");
  });

  it('rejects a file with an unrecognized schema version', async () => {
    mockFiles['file:///cache/old.json'] = JSON.stringify({ schemaVersion: 999, data: {} });
    DocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/old.json' }],
    });
    await expect(pickAndValidateBackup()).rejects.toThrow("doesn't look like a valid BPF backup");
  });
});
