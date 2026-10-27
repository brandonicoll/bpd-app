import React from 'react';
import {
  Modal, View, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';

// Bottom-sheet modal that rises above the keyboard. The sheet is laid out at the
// bottom of a full-screen KeyboardAvoidingView (rather than absolutely
// positioned) so the keyboard padding pushes it up, and it may shrink — give
// any list inside it flexShrink: 1 so the list gives up space first.
export default function KeyboardSheet({ visible, onClose, sheetStyle, children }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1} />
        <View style={[sheetStyle, styles.sheet]}>{children}</View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'relative', flexShrink: 1 },
});
