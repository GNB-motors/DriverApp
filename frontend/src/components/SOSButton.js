import React, { useRef } from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { useLanguage } from '../context/LanguageContext';

export default function SOSButton() {
  const navigation = useNavigation();
  const { t } = useLanguage();

  const handlePress = () => {
    navigation.navigate('SOSOptions');
  };

  const handleLongPress = () => {
    navigation.navigate('SOSEmergencyActive');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={3000}
    >
      <Text style={styles.text}>{t('sos', 'button')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: theme.colors.error,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 999,
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center'
  },
});