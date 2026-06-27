import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, SafeAreaView,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSizes, borderRadius } from '../../theme';
import {
  getProgressPhotos, getExerciseNameMap, compareSnapshots,
} from '../../services/progressPhotos';

const { width } = Dimensions.get('window');

export default function PhotoComparisonScreen({ route }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { photoIds } = route.params;

  const [photos, setPhotos] = useState([]);
  const [nameMap, setNameMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [all, map] = await Promise.all([getProgressPhotos(), getExerciseNameMap()]);
      const selected = all
        .filter(p => photoIds.includes(p.id))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setPhotos(selected);
      setNameMap(map);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  const single = photos.length === 1;
  const oldest = photos[0];
  const newest = photos[photos.length - 1];
  const changes = single ? [] : compareSnapshots(oldest?.snapshot, newest?.snapshot, nameMap);
  const gainers = changes.filter(c => c.deltaPercent > 0);
  const decliners = changes.filter(c => c.deltaPercent < 0);

  const imgWidth = single ? width - spacing.lg * 2 : width * 0.62;

  function dateLabel(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Photo strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
          snapToInterval={imgWidth + spacing.md}
          decelerationRate="fast"
        >
          {photos.map(photo => (
            <View key={photo.id} style={[styles.photoCard, { width: imgWidth }]}>
              <Image
                source={{ uri: photo.imageUri }}
                style={[styles.photo, { width: imgWidth, height: imgWidth * 1.3 }]}
                resizeMode="cover"
              />
              <View style={styles.photoMeta}>
                <Text style={styles.photoDate}>{dateLabel(photo.date)}</Text>
                {photo.snapshot?.currentWeek != null && (
                  <Text style={styles.photoSub}>
                    Week {photo.snapshot.currentWeek} · Block {photo.snapshot.currentBlock}
                  </Text>
                )}
                {photo.weight ? (
                  <Text style={styles.photoSub}>{photo.weight} {photo.weightUnit}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>

        {single ? (
          <View style={styles.singleNote}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textTertiary} style={{ marginBottom: spacing.xs }} />
            <Text style={styles.singleNoteText}>
              Snapshot taken on {dateLabel(oldest.date)}. Select two or more photos from the gallery to see strength changes between them.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.spanCard}>
              <Text style={styles.spanLabel}>Strength change</Text>
              <Text style={styles.spanDates}>
                {dateLabel(oldest.date)} → {dateLabel(newest.date)}
              </Text>
            </View>

            {gainers.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Notable improvements</Text>
                {gainers.slice(0, 8).map(c => (
                  <View key={c.exerciseId} style={styles.changeRow}>
                    <View style={styles.changeInfo}>
                      <Text style={styles.changeName}>{c.name}</Text>
                      <Text style={styles.changeE1RM}>
                        {c.oldE1RM} → {c.newE1RM} {oldest.snapshot?.weightUnit || 'lbs'} est. 1RM
                      </Text>
                    </View>
                    <Text style={styles.changeDelta}>+{c.deltaPercent}%</Text>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.noChangeCard}>
                <Text style={styles.noChangeText}>
                  No measurable strength improvements between these photos. This can happen if the photos are close together or if the same lifts weren't logged in both periods.
                </Text>
              </View>
            )}

            {decliners.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Decreased</Text>
                {decliners.map(c => (
                  <View key={c.exerciseId} style={styles.changeRow}>
                    <View style={styles.changeInfo}>
                      <Text style={styles.changeName}>{c.name}</Text>
                      <Text style={styles.changeE1RM}>
                        {c.oldE1RM} → {c.newE1RM} {oldest.snapshot?.weightUnit || 'lbs'} est. 1RM
                      </Text>
                    </View>
                    <Text style={[styles.changeDelta, styles.changeDeltaNeg]}>
                      {c.deltaPercent}%
                    </Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  strip: { gap: spacing.md, paddingRight: spacing.lg, marginBottom: spacing.lg },
  photoCard: {
    borderRadius: borderRadius.lg, overflow: 'hidden',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  photo: {},
  photoMeta: { padding: spacing.sm },
  photoDate: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text },
  photoSub: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 1 },

  singleNote: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, alignItems: 'center',
  },
  singleNoteText: {
    fontSize: fontSizes.sm, color: colors.textSecondary,
    lineHeight: 21, textAlign: 'center',
  },

  spanCard: {
    backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.md,
  },
  spanLabel: {
    fontSize: fontSizes.xs, fontWeight: '700', color: colors.primary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2,
  },
  spanDates: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },

  sectionLabel: {
    fontSize: fontSizes.xs, fontWeight: '700', color: colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: spacing.md, marginBottom: spacing.sm,
  },

  changeRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  changeInfo: { flex: 1 },
  changeName: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text },
  changeE1RM: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 1 },
  changeDelta: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.success, marginLeft: spacing.sm },
  changeDeltaNeg: { color: colors.danger },

  noChangeCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  noChangeText: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 21 },
});
