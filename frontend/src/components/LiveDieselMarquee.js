import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Easing, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';

const { width } = Dimensions.get('window');

const LiveDieselMarquee = () => {
  const [prices, setPrices] = useState([]);
  const navigation = useNavigation();
  const translateX = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await api.get('/fuel-prices/marquee');
        if (response.data && response.data.length > 0) {
          setPrices(response.data);
        } else {
          setPrices([
            { state: 'Delhi', price: 95.24, priceChange: 0 },
            { state: 'Gujarat', price: 98.16, priceChange: 0.01 },
            { state: 'Haryana', price: 95.59, priceChange: -0.01 },
          ]);
        }
      } catch (error) {
        console.error('Failed to load marquee prices:', error);
      }
    };
    fetchPrices();
  }, []);

  useEffect(() => {
    if (prices.length > 0) {
      // Create continuous loop animation
      Animated.loop(
        Animated.timing(translateX, {
          toValue: -1000, // Arbitrary end point based on content width
          duration: 30000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [prices]);

  if (prices.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Feather name="droplet" size={16} color="#2563eb" />
      </View>

      <View style={styles.marqueeContainer}>
        <Animated.View style={[styles.marqueeContent, { transform: [{ translateX }] }]}>
          {/* Duplicate to make it look continuous */}
          {[...prices, ...prices, ...prices].map((p, idx) => (
            <View key={`${p.state}-${idx}`} style={styles.priceItem}>
              <Text style={styles.stateText}>{p.state}</Text>
              <View style={[styles.priceTag, p.priceChange > 0 ? styles.upBg : p.priceChange < 0 ? styles.downBg : styles.neutralBg]}>
                <Text style={[styles.priceText, p.priceChange > 0 ? styles.upText : p.priceChange < 0 ? styles.downText : styles.neutralText]}>
                  ₹{p.price.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </Animated.View>
      </View>

      <TouchableOpacity 
        style={styles.viewAllBtn}
        onPress={() => navigation.navigate('FuelPrices')}
      >
        <Text style={styles.viewAllText}>View all</Text>
        <Feather name="chevron-right" size={14} color="#2563eb" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff', // blue-50
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe', // blue-100
    paddingVertical: 8,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  iconContainer: {
    backgroundColor: '#ffffff',
    padding: 4,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    marginRight: 10,
    zIndex: 10,
  },
  marqueeContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  marqueeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginRight: 12,
  },
  stateText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12,
    color: '#334155',
    marginRight: 6,
  },
  priceTag: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priceText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 12,
  },
  upBg: { backgroundColor: '#fef2f2' },
  upText: { color: '#ef4444' },
  downBg: { backgroundColor: '#f0fdf4' },
  downText: { color: '#16a34a' },
  neutralBg: { backgroundColor: '#f8fafc' },
  neutralText: { color: '#475569' },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 10,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  viewAllText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12,
    color: '#2563eb',
    marginRight: 2,
  }
});

export default LiveDieselMarquee;
