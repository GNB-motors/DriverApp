import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import styles, { COLORS } from '../styles/WelcomeScreen.styles';

export default function WelcomeScreen({ navigation }) {
  const { user, setIsNewLogin } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  const handleContinue = () => {
    setIsNewLogin(false);
  };

  const driverName = user?.name || 'Driver';
  const phoneDisplay = user?.phoneNumber ? `+91 ${user.phoneNumber}` : '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Green Top Section */}
      <View style={styles.topSection}>
        <View style={styles.circleOne} />
        <View style={styles.circleTwo} />
        <View style={styles.circleThree} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Top Content - Checkmark & Greeting */}
        <Animated.View
          style={[
            styles.topContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.checkCircleOuter,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <View style={styles.checkCircleInner}>
              <Ionicons name="checkmark" size={40} color={COLORS.white} />
            </View>
          </Animated.View>

          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.username}>{driverName}</Text>
        </Animated.View>

        {/* Bottom White Card */}
        <Animated.View
          style={[
            styles.bottomCard,
            { opacity: fadeAnim },
          ]}
        >
          <View style={styles.messageContainer}>
            <View style={styles.messageIconWrap}>
              <Ionicons name="sunny-outline" size={26} color={COLORS.primary} />
            </View>
            <Text style={styles.message}>
              Great to see you again. Get ready for a smooth and efficient driving experience today.
            </Text>

            {/* Info Chips */}
            <View style={styles.infoRow}>
              <View style={styles.infoChip}>
                <View style={styles.infoChipIcon}>
                  <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={styles.infoChipTextWrap}>
                  <Text style={styles.infoChipText}>Driver</Text>
                  <Text style={styles.infoChipValue} numberOfLines={1}>{driverName}</Text>
                </View>
              </View>
              {phoneDisplay ? (
                <View style={styles.infoChip}>
                  <View style={styles.infoChipIcon}>
                    <Ionicons name="call-outline" size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.infoChipTextWrap}>
                    <Text style={styles.infoChipText}>Phone</Text>
                    <Text style={styles.infoChipValue} numberOfLines={1}>{phoneDisplay}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          {/* Get Started Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
