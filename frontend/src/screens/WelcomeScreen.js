import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { theme } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen({ navigation }) {
  const { user, setIsNewLogin } = useAuth();
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(30);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleContinue = () => {
    setIsNewLogin(false);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={80} color={theme.colors.success} />
        </View>

        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.username}>{user?.phoneNumber || 'Driver'}</Text>
        
        <Text style={styles.message}>
          Great to see you again. Get ready for a smooth and efficient driving experience today.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
    padding: 10,
  },
  title: {
    ...theme.typography.large,
    fontSize: 28,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  username: {
    ...theme.typography.medium,
    fontSize: 22,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  message: {
    ...theme.typography.normal,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  button: {
    flexDirection: 'row',
    height: theme.components.buttonHeight,
    backgroundColor: theme.colors.primary,
    width: '80%',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonText: {
    ...theme.typography.medium,
    color: '#fff',
    marginRight: 8,
  },
});
