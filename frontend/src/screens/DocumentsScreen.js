import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';
import { SELECTED_VEHICLE_KEY } from './VehicleScreen';
import { fetchDocuments, fetchVehicleDocuments } from '../services/api';
import styles, { COLORS } from '../styles/DocumentsScreen.styles';

export default function DocumentsScreen({ route, navigation }) {
  const { docType } = route.params || {}; // 'PERSONAL' or 'VEHICLE'
  const { t, language } = useLanguage();
  const { user, token } = useAuth();

  const [personalDocs, setPersonalDocs] = useState([]);
  const [vehicleDocs, setVehicleDocs] = useState([]);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  const getPersonalDocName = (docType) => {
    const type = docType.toUpperCase();
    if (type === 'LICENSE' || type === 'DRIVER_LICENSE' || type === 'DL') {
      return t('docs', 'license') || 'Driving License';
    }
    if (type === 'AADHAAR' || type === 'AADHAR') {
      return t('docs', 'aadhaar') || 'Aadhaar Card';
    }
    if (type === 'PAN') {
      return 'PAN Card';
    }
    return docType;
  };

  const loadDocs = async () => {
    try {
      setLoading(true);

      // 1. Get assigned vehicle
      const savedVehicle = await storage.getItem(SELECTED_VEHICLE_KEY);
      setVehicle(savedVehicle);

      // 2. Fetch driver's personal documents (License, Aadhaar, PAN)
      const fetchedUserDocs = await fetchDocuments(token, 'USER', user._id);
      const formattedUserDocs = fetchedUserDocs.map(d => {
        const isExpired = d.expiryDate && new Date(d.expiryDate) < new Date();
        return {
          id: d._id,
          name: getPersonalDocName(d.docType),
          statusKey: isExpired ? 'expired' : 'valid',
          valid: !isExpired,
          publicUrl: d.publicUrl
        };
      });
      setPersonalDocs(formattedUserDocs);

      // 3. If vehicle is assigned, fetch its documents
      if (savedVehicle?._id) {
        const fetchedVehicleDocs = await fetchVehicleDocuments(token, savedVehicle._id);
        const formattedVehicleDocs = [];

        const VEHICLE_DOC_LABELS = {
          en: {
            RC: 'Registration Certificate (RC)',
            INSURANCE: 'Insurance Policy',
            FITNESS: 'Fitness Certificate',
            PERMIT: 'Vehicle Permit',
            NATIONAL_PERMIT: 'National Permit',
            front: 'Front',
            back: 'Back',
          },
          hi: {
            RC: 'पंजीकरण प्रमाणपत्र (RC)',
            INSURANCE: 'बीमा पॉलिसी',
            FITNESS: 'फिटनेस प्रमाणपत्र',
            PERMIT: 'वाहन परमिट',
            NATIONAL_PERMIT: 'नेशनल परमिट',
            front: 'आगे',
            back: 'पीछे',
          }
        };

        const activeLang = language === 'hi' ? 'hi' : 'en';
        const labels = VEHICLE_DOC_LABELS[activeLang];

        fetchedVehicleDocs.forEach(d => {
          const isExpired = d.expiryDate && new Date(d.expiryDate) < new Date();
          const baseName = labels[d.docType] || d.docType;

          if (Array.isArray(d.files) && d.files.length > 0) {
            d.files.forEach((file, index) => {
              let suffix = '';
              if (file.side === 'FRONT') suffix = ` - ${labels.front}`;
              else if (file.side === 'BACK') suffix = ` - ${labels.back}`;
              else if (d.files.length > 1) {
                suffix = index === 0 ? ` - ${labels.front}` : ` - ${labels.back}`;
              }

              formattedVehicleDocs.push({
                id: `${d._id}-${file.side || index}`,
                name: `${baseName}${suffix}`,
                statusKey: isExpired ? 'expired' : 'valid',
                valid: !isExpired,
                publicUrl: file.publicUrl
              });
            });
          } else {
            formattedVehicleDocs.push({
              id: d._id,
              name: baseName,
              statusKey: isExpired ? 'expired' : 'valid',
              valid: !isExpired,
              publicUrl: null
            });
          }
        });

        setVehicleDocs(formattedVehicleDocs);
      } else {
        setVehicleDocs([]);
      }
    } catch (error) {
      console.warn('[DocumentsScreen] Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDocs();
    }, [token, user?._id])
  );

  const renderDocCard = (doc) => (
    <TouchableOpacity
      key={doc.id}
      style={styles.docCard}
      activeOpacity={0.7}
      onPress={() => {
        if (doc.publicUrl) {
          setSelectedImageUrl(doc.publicUrl);
        } else {
          Alert.alert(
            language === 'hi' ? 'उपलब्ध नहीं है' : 'Not Available',
            language === 'hi'
              ? 'इस दस्तावेज़ का कोई चित्र अभी उपलब्ध नहीं है।'
              : "This document doesn't have a viewable image yet."
          );
        }
      }}
    >
      {/* Document Icon */}
      <View style={styles.docIconContainer}>
        <Ionicons name="document-text" size={24} color={COLORS.primary} />
      </View>

      {/* Info & Status */}
      <View style={styles.docInfo}>
        <Text style={styles.docName}>{doc.name}</Text>
        <View style={[
          styles.statusBadge,
          doc.valid ? styles.statusValidBg : styles.statusExpiredBg
        ]}>
          <Text style={[
            styles.statusText,
            doc.valid ? styles.statusValidText : styles.statusExpiredText
          ]}>
            {t('docs', doc.statusKey) || (doc.valid ? 'Valid' : 'Expired')}
          </Text>
        </View>
      </View>

      {/* View Action */}
      <View style={styles.viewBtn}>
        <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Decorative Green Top Section */}
      <View style={styles.topSection}>
        <View style={styles.circleOne} />
        <View style={styles.circleTwo} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* Header Controls */}
        <View style={styles.headerContainer}>
          {navigation.canGoBack() && (
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>
            {docType === 'PERSONAL' 
              ? t('docs', 'personalTitle') 
              : docType === 'VEHICLE' 
                ? t('docs', 'vehicleTitle') 
                : t('docs', 'title')}
          </Text>
        </View>

        <Text style={styles.headerSubtitle}>
          {language === 'hi'
            ? (docType === 'PERSONAL' ? 'अपने आवश्यक व्यक्तिगत दस्तावेजों को प्रबंधित और देखें।' : 'अपने आवश्यक वाहन दस्तावेजों को प्रबंधित और देखें।')
            : (language === 'bn'
                ? (docType === 'PERSONAL' ? 'আপনার ব্যক্তিগত নথিপত্র পরিচালনা করুন এবং দেখুন।' : 'আপনার গাড়ির নথিপত্র পরিচালনা করুন এবং দেখুন।')
                : (docType === 'PERSONAL' ? 'Manage and view all your required personal documents.' : 'Manage and view all your required vehicle documents.'))}
        </Text>

        {/* Bottom Content Sheet */}
        <View style={styles.bottomContent}>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
          ) : (
            <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>

              {/* Personal Documents Section */}
              {(!docType || docType === 'PERSONAL') && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionHeader}>
                    {t('docs', 'personalTitle')}
                  </Text>

                  {personalDocs.length === 0 ? (
                    <Text style={{ color: COLORS.textMuted, fontSize: 14, fontStyle: 'italic', marginBottom: 16 }}>
                      {language === 'hi' ? 'कोई व्यक्तिगत दस्तावेज़ नहीं मिले।' : 'No personal documents found.'}
                    </Text>
                  ) : (
                    personalDocs.map(doc => renderDocCard(doc))
                  )}
                </View>
              )}

              {/* Vehicle Documents Section */}
              {(!docType || docType === 'VEHICLE') && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionHeader}>
                    {t('docs', 'vehicleTitle')}
                    {vehicle ? ` (${vehicle.registrationNumber})` : ''}
                  </Text>

                  {vehicle ? (
                    vehicleDocs.length === 0 ? (
                      <Text style={{ color: COLORS.textMuted, fontSize: 14, fontStyle: 'italic', marginBottom: 16 }}>
                        {language === 'hi' ? 'इस वाहन के लिए कोई दस्तावेज़ नहीं मिले।' : 'No documents found for this vehicle.'}
                      </Text>
                    ) : (
                      vehicleDocs.map(doc => renderDocCard(doc))
                    )
                  ) : (
                    <View style={styles.noVehicleCard}>
                      <Ionicons name="car-outline" size={40} color={COLORS.primary} />
                      <Text style={styles.noVehicleTitle}>
                        {language === 'hi' ? 'कोई वाहन असाइन नहीं है' : 'No Vehicle Assigned'}
                      </Text>
                      <Text style={styles.noVehicleSubtitle}>
                        {language === 'hi' ? 'वाहन के दस्तावेज़ देखने के लिए कृपया एक डिफ़ॉल्ट वाहन चुनें।' : 'Please assign a vehicle to view its legal documents.'}
                      </Text>
                      <TouchableOpacity
                        style={styles.setVehicleBtn}
                        onPress={() => navigation.navigate('Vehicle')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.setVehicleBtnText}>
                          {language === 'hi' ? 'वाहन चुनें' : 'Select Vehicle'}
                        </Text>
                        <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

            </ScrollView>
          )}
        </View>
      </SafeAreaView>

      {/* Image Viewer Modal */}
      <Modal visible={!!selectedImageUrl} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }}
            onPress={() => setSelectedImageUrl(null)}
          >
            <Ionicons name="close-circle" size={36} color="#FFF" />
          </TouchableOpacity>
          {selectedImageUrl && (
            <Image
              source={{ uri: selectedImageUrl }}
              style={{ width: '95%', height: '80%', resizeMode: 'contain' }}
              onError={() => {
                Alert.alert("Error", "Could not load document image.");
                setSelectedImageUrl(null);
              }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

