import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, Pressable, Animated } from 'react-native';
import AppText from './AppText';
import { colors, radius } from '../../theme/tokens';

export default function ActionSheet({ visible, onClose, title, actions = [] }) {
  const [slideAnim] = useState(new Animated.Value(300));

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {title && <AppText variant="h3" weight="bold" style={styles.title}>{title}</AppText>}
          
          <View style={styles.actionList}>
            {actions.map((act, i) => (
              <Pressable 
                key={i} 
                style={[styles.actionBtn, i < actions.length - 1 && styles.borderBottom]}
                onPress={() => { onClose(); act.onPress(); }}
              >
                <AppText 
                  variant="bodyStrong" 
                  weight={act.destructive ? "bold" : "semibold"} 
                  color={act.destructive ? colors.danger : colors.text}
                >
                  {act.label}
                </AppText>
              </Pressable>
            ))}
          </View>
          
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <AppText variant="bodyStrong" weight="bold">Cancel</AppText>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 22, paddingBottom: 40 },
  title: { textAlign: 'center', marginBottom: 16, color: colors.textMuted },
  actionList: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: 12 },
  actionBtn: { paddingVertical: 18, alignItems: 'center' },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.border },
  cancelBtn: { backgroundColor: colors.surface, paddingVertical: 18, alignItems: 'center', borderRadius: radius.lg },
});
