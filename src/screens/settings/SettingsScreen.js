import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, SafeAreaView, ScrollView, TouchableOpacity, ActionSheetIOS, Platform, Alert, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSizes, borderRadius } from '../../theme';
import { getCurrentProgram, updateTrainingAge, restartProgram } from '../../services/storage';
import { useApp } from '../../context/AppContext';
import { exportBackup, pickAndValidateBackup, restoreBackup } from '../../services/backup';
import { TRAINING_AGE } from '../../data/splits';
import { useWeightUnit } from '../../context/WeightUnitContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { presentCustomerCenter, restorePurchases } from '../../services/purchases';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../../services/proAccess';

const TRAINING_AGE_OPTIONS = [
  { value: TRAINING_AGE.BEGINNER,     label: 'Beginner',     subtitle: '0–1 years — learning movements, building base strength' },
  { value: TRAINING_AGE.INTERMEDIATE, label: 'Intermediate', subtitle: '1–3 years — solid form, progress comes slower' },
  { value: TRAINING_AGE.ADVANCED,     label: 'Advanced',     subtitle: '4+ years — progress is hard-earned over months' },
];

export default function SettingsScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { weightUnit, setWeightUnit } = useWeightUnit();
  const styles = makeStyles(colors);
  const [trainingAge, setTrainingAge] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const { isSubscribed, refresh } = useSubscription();
  const { refreshProgram } = useApp();

  useEffect(() => {
    getCurrentProgram().then(p => {
      if (p?.trainingAge) setTrainingAge(p.trainingAge);
    });
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      await exportBackup();
    } catch (e) {
      console.error('exportBackup error:', e);
      Alert.alert('Export failed', 'Could not export your data. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const backup = await pickAndValidateBackup();
      if (!backup) { setImporting(false); return; } // user canceled the picker

      const exportedDate = new Date(backup.exportedAt).toLocaleDateString();
      Alert.alert(
        'Restore this backup?',
        `This backup was made on ${exportedDate}. Restoring it will replace all data currently on this device — that can't be undone.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setImporting(false) },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await restoreBackup(backup);
                Alert.alert(
                  'Restore complete',
                  `Restored ${result.sessionCount} session${result.sessionCount === 1 ? '' : 's'} and ${result.photoCount} photo${result.photoCount === 1 ? '' : 's'}. Close and reopen the app to see your data.`
                );
              } catch (e) {
                console.error('restoreBackup error:', e);
                Alert.alert('Restore failed', 'Could not restore this backup. Please try again.');
              } finally {
                setImporting(false);
              }
            },
          },
        ]
      );
    } catch (e) {
      console.error('pickAndValidateBackup error:', e);
      Alert.alert('Import failed', e.message || 'Could not read that file.');
      setImporting(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    const result = await restorePurchases();
    await refresh();
    setRestoring(false);
    if (result.success) {
      Alert.alert('Pro restored', 'Your BPF Pro subscription is active on this device.');
    } else if (result.error) {
      Alert.alert('Restore failed', 'Could not reach the App Store. Please try again.');
    } else {
      Alert.alert('Nothing to restore', 'No active BPF Pro subscription was found for this Apple ID.');
    }
  }

  function handleRestart() {
    Alert.alert(
      'Restart from week 1?',
      "This deletes every logged workout, check-in and outside activity, and starts your program again at week 1. Custom exercises, progress photos and settings are kept.\n\nTip: export your data first if you might want it later.",
      [
        { text: 'Keep my current program', onPress: () => confirmRestart(true) },
        { text: 'Choose a starter program', onPress: () => confirmRestart(false) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  function confirmRestart(keepProgram) {
    Alert.alert(
      'Wipe all training data?',
      (keepProgram
        ? 'Your program stays exactly as you have it, including any edits.'
        : "You'll go through setup again to pick a starter program. Your current program and its edits will be removed.") +
        " This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Wipe & restart', style: 'destructive', onPress: () => doRestart(keepProgram) },
      ]
    );
  }

  async function doRestart(keepProgram) {
    setRestarting(true);
    try {
      await restartProgram({ keepProgram });
      // Without a program the root navigator switches to onboarding on refresh.
      await refreshProgram();
      if (keepProgram) {
        setRestarting(false);
        Alert.alert('Program restarted', "You're back at week 1. Good luck!");
        navigation.goBack();
      }
    } catch (e) {
      console.error('restartProgram error:', e);
      setRestarting(false);
      Alert.alert('Restart failed', 'Could not restart your program. Please try again.');
    }
  }

  function handleChangeTrainingAge() {
    const sheetOptions = [...TRAINING_AGE_OPTIONS.map(o => o.label), 'Cancel'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: sheetOptions, cancelButtonIndex: sheetOptions.length - 1, title: 'Training experience' },
        async (index) => {
          if (index >= TRAINING_AGE_OPTIONS.length) return;
          const newAge = TRAINING_AGE_OPTIONS[index].value;
          await updateTrainingAge(newAge);
          setTrainingAge(newAge);
        }
      );
    } else {
      Alert.alert(
        'Training experience',
        'How long have you been training seriously?',
        [
          ...TRAINING_AGE_OPTIONS.map(o => ({
            text: o.label,
            onPress: async () => {
              await updateTrainingAge(o.value);
              setTrainingAge(o.value);
            },
          })),
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }

  const currentOption = TRAINING_AGE_OPTIONS.find(o => o.value === trainingAge);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Training profile</Text>
          <TouchableOpacity style={styles.row} onPress={handleChangeTrainingAge} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Training experience</Text>
              <Text style={styles.rowSubtitle}>
                {currentOption ? `${currentOption.label} — ${currentOption.subtitle}` : 'Tap to set'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {__DEV__ && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Developer</Text>
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('DevPanel')}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>Engine testing panel</Text>
                <Text style={styles.rowSubtitle}>Inject scenarios, jump weeks (dev only)</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Units</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Weight unit</Text>
              <Text style={styles.rowSubtitle}>
                {weightUnit === 'kg' ? 'Kilograms (kg)' : 'Pounds (lbs)'}
              </Text>
            </View>
            <Switch
              value={weightUnit === 'kg'}
              onValueChange={v => setWeightUnit(v ? 'kg' : 'lbs')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Data</Text>
          <TouchableOpacity
            style={[styles.row, styles.rowSpaced]}
            onPress={handleExport}
            activeOpacity={0.7}
            disabled={exporting || importing}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Export my data</Text>
              <Text style={styles.rowSubtitle}>Save a backup file with your full history and photos</Text>
            </View>
            {exporting ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.row}
            onPress={handleImport}
            activeOpacity={0.7}
            disabled={exporting || importing}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Import data</Text>
              <Text style={styles.rowSubtitle}>Restore from a backup file — e.g. after switching phones</Text>
            </View>
            {importing ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Start over</Text>
          <TouchableOpacity
            style={[styles.row, styles.rowDanger]}
            onPress={handleRestart}
            activeOpacity={0.7}
            disabled={restarting}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.rowTitle, styles.rowTitleDanger]}>Restart program from week 1</Text>
              <Text style={styles.rowSubtitle}>Wipes all logged workouts and training data</Text>
            </View>
            {restarting ? <ActivityIndicator color={colors.danger} /> : <Ionicons name="refresh" size={16} color={colors.danger} />}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Subscription</Text>
          {isSubscribed ? (
            <TouchableOpacity style={styles.row} onPress={presentCustomerCenter} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>BPF Pro</Text>
                <Text style={styles.rowSubtitle}>Active — manage or cancel your subscription</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.row, styles.rowSpaced]}
                onPress={() => navigation.navigate('Paywall')}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>Upgrade to BPF Pro</Text>
                  <Text style={styles.rowSubtitle}>Personalised recommendations from the adjustment engine</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.row} onPress={handleRestore} activeOpacity={0.7} disabled={restoring}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>Restore purchases</Text>
                  <Text style={styles.rowSubtitle}>Already subscribed on this Apple ID? Unlock Pro here</Text>
                </View>
                {restoring ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Appearance</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Dark mode</Text>
              <Text style={styles.rowSubtitle}>Easier on the eyes in low light</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Legal</Text>
          <TouchableOpacity
            style={[styles.row, styles.rowSpaced]}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowTitle}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL(TERMS_OF_USE_URL)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowTitle}>Terms of Use</Text>
            <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },
  content: { padding: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionLabel: {
    fontSize: fontSizes.xs, fontWeight: '600', color: colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  rowSpaced: { marginBottom: spacing.sm },
  rowDanger: { borderColor: colors.danger + '55' },
  rowTitleDanger: { color: colors.danger },
  rowLeft: { flex: 1, marginRight: spacing.md },
  rowTitle: { fontSize: fontSizes.md, fontWeight: '600', color: colors.text },
  rowSubtitle: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
});
