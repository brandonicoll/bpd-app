import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllSessions, getCurrentProgram, getCustomExercises } from './storage';
import { exercises as builtInExercises } from '../data/exercises';
import { getBestE1RM } from '../utils/workoutHelpers';

const PHOTOS_KEY = 'progressPhotos';
const PHOTO_DIR = FileSystem.documentDirectory + 'progress_photos/';

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

export async function captureStatSnapshot() {
  const [sessions, program] = await Promise.all([getAllSessions(), getCurrentProgram()]);

  const e1rms = {};
  for (const session of sessions) {
    for (const ex of (session.exercises || [])) {
      const best = getBestE1RM(ex.sets);
      if (best > 0) {
        e1rms[ex.exerciseId] = Math.max(e1rms[ex.exerciseId] || 0, best);
      }
    }
  }

  return {
    capturedAt: new Date().toISOString(),
    e1rms,
    currentWeek: program?.currentWeek || null,
    currentBlock: program?.currentBlock || null,
    weightUnit: 'lbs',
  };
}

export async function saveProgressPhoto({ pickedUri, date, weight, note }) {
  await ensureDir();
  const id = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const dest = `${PHOTO_DIR}${id}.jpg`;

  await FileSystem.copyAsync({ from: pickedUri, to: dest });

  const snapshot = await captureStatSnapshot();

  const photo = {
    id,
    date: date || new Date().toISOString(),
    imageUri: dest,
    weight: weight ? Number(weight) : null,
    weightUnit: 'lbs',
    note: note || '',
    snapshot,
    createdAt: new Date().toISOString(),
  };

  const all = await getAllPhotosRaw();
  all.push(photo);
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(all));
  return photo;
}

async function getAllPhotosRaw() {
  const raw = await AsyncStorage.getItem(PHOTOS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getProgressPhotos() {
  const photos = await getAllPhotosRaw();
  return photos.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function deleteProgressPhoto(id) {
  const all = await getAllPhotosRaw();
  const photo = all.find(p => p.id === id);
  if (photo?.imageUri) {
    try { await FileSystem.deleteAsync(photo.imageUri, { idempotent: true }); } catch {}
  }
  const remaining = all.filter(p => p.id !== id);
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(remaining));
}

export async function getExerciseNameMap() {
  const custom = await getCustomExercises();
  const map = {};
  [...builtInExercises, ...custom].forEach(e => { map[e.id] = e.name; });
  return map;
}

export function compareSnapshots(olderSnap, newerSnap, nameMap) {
  const results = [];
  const ids = new Set([
    ...Object.keys(olderSnap?.e1rms || {}),
    ...Object.keys(newerSnap?.e1rms || {}),
  ]);

  for (const id of ids) {
    const oldE1RM = olderSnap?.e1rms?.[id] || 0;
    const newE1RM = newerSnap?.e1rms?.[id] || 0;
    if (oldE1RM > 0 && newE1RM > 0) {
      const deltaPercent = Math.round(((newE1RM - oldE1RM) / oldE1RM) * 1000) / 10;
      results.push({
        exerciseId: id,
        name: nameMap[id] || id,
        oldE1RM,
        newE1RM,
        deltaPercent,
      });
    }
  }

  return results.sort((a, b) => b.deltaPercent - a.deltaPercent);
}
