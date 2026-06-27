import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  SafeAreaView, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSizes, borderRadius } from '../../theme';
import {
  getProgressPhotos, saveProgressPhoto, deleteProgressPhoto,
} from '../../services/progressPhotos';

const { width } = Dimensions.get('window');
const GAP = 12;
const COL = 2;
const TILE = (width - spacing.lg * 2 - GAP) / COL;

export default function ProgressPhotosScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState([]);

  const load = useCallback(async () => {
    const all = await getProgressPhotos();
    setPhotos(all);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
  }, [load]));

  async function pickImage(fromCamera) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow access to add a progress photo.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'], quality: 0.8,
        });

    if (result.canceled) return;
    const uri = result.assets[0].uri;

    setUploading(true);
    try {
      await saveProgressPhoto({ pickedUri: uri, date: new Date().toISOString() });
      await load();
    } catch (e) {
      console.error('saveProgressPhoto error:', e);
      Alert.alert('Error', 'Could not save the photo.');
    } finally {
      setUploading(false);
    }
  }

  function handleAdd() {
    Alert.alert('Add progress photo', null, [
      { text: 'Take photo', onPress: () => pickImage(true) },
      { text: 'Choose from library', onPress: () => pickImage(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function toggleSelect(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  function handleCompare() {
    if (selected.length < 2) {
      Alert.alert('Select at least 2 photos', 'Pick two or more photos to compare.');
      return;
    }
    navigation.navigate('PhotoComparison', { photoIds: selected });
    setSelectMode(false);
    setSelected([]);
  }

  function handleLongPress(photo) {
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteProgressPhoto(photo.id);
        load();
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Progress photos</Text>
        <View style={styles.topActions}>
          {photos.length >= 2 && (
            <TouchableOpacity
              onPress={() => { setSelectMode(!selectMode); setSelected([]); }}
              style={styles.selectToggle}
              activeOpacity={0.7}
            >
              <Text style={styles.selectToggleText}>{selectMode ? 'Cancel' : 'Compare'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleAdd} style={styles.addBtn} disabled={uploading} activeOpacity={0.8}>
            {uploading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.addBtnText}>+ Add</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {selectMode && (
        <Text style={styles.selectHint}>
          Tap photos to select ({selected.length} selected)
        </Text>
      )}

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {photos.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="camera-outline" size={48} color={colors.textTertiary} style={{ marginBottom: spacing.md }} />
            <Text style={styles.emptyTitle}>No progress photos yet</Text>
            <Text style={styles.emptyBody}>
              Add your first photo to start tracking visual progress alongside your strength gains.
            </Text>
            <TouchableOpacity onPress={handleAdd} style={styles.emptyBtn} activeOpacity={0.8}>
              <Text style={styles.emptyBtnText}>+ Add photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.gridInner}>
            {photos.map(photo => {
              const isSelected = selected.includes(photo.id);
              const selIndex = selected.indexOf(photo.id);
              return (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.tile}
                  activeOpacity={0.85}
                  onPress={() =>
                    selectMode
                      ? toggleSelect(photo.id)
                      : navigation.navigate('PhotoComparison', { photoIds: [photo.id] })
                  }
                  onLongPress={() => !selectMode && handleLongPress(photo)}
                >
                  <Image source={{ uri: photo.imageUri }} style={styles.tileImage} />
                  <View style={styles.tileOverlay}>
                    <Text style={styles.tileDate}>
                      {new Date(photo.date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </Text>
                  </View>
                  {selectMode && (
                    <View style={[styles.selectBadge, isSelected && styles.selectBadgeOn]}>
                      {isSelected && (
                        <Text style={styles.selectBadgeText}>{selIndex + 1}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {selectMode && selected.length >= 2 && (
        <View style={styles.compareBar}>
          <TouchableOpacity onPress={handleCompare} style={styles.compareBtn} activeOpacity={0.8}>
            <Text style={styles.compareBtnText}>Compare {selected.length} photos →</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  title: { fontSize: fontSizes.xxl, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  selectToggle: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border,
  },
  selectToggleText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.textSecondary },
  addBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.full,
    paddingHorizontal: 12, paddingVertical: 6, minWidth: 52, alignItems: 'center',
  },
  addBtnText: { fontSize: fontSizes.xs, fontWeight: '700', color: '#fff' },

  selectHint: {
    fontSize: fontSizes.xs, color: colors.textSecondary,
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },

  grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  gridInner: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },

  tile: {
    width: TILE, height: TILE * 1.3,
    borderRadius: borderRadius.lg, overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  tileImage: { width: '100%', height: '100%' },
  tileOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 5,
  },
  tileDate: { fontSize: fontSizes.xs, color: '#fff', fontWeight: '600' },

  selectBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  selectBadgeOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectBadgeText: { color: '#fff', fontSize: fontSizes.xs, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: spacing.xxl * 2, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyBody: {
    fontSize: fontSizes.sm, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 21, marginBottom: spacing.lg,
  },
  emptyBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.sm },

  compareBar: {
    padding: spacing.lg, borderTopWidth: 0.5, borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  compareBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  compareBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.md },
});
