import React, { useState, useCallback } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Alert, Modal, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';
import { SELECTED_VEHICLE_KEY } from './VehicleScreen';
import { fetchDocuments, fetchVehicleDocuments } from '../services/api';
import logger from '../utils/logger';
import { AppText, Button, Badge, ScreenHeader, colors, spacing, radius } from '../components/ui';

export default function DocumentsScreen({ route, navigation }) {
  const { docType } = route.params || {}; // 'PERSONAL' or 'VEHICLE'
  const { t, language } = useLanguage();
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();

  const [personalDocs, setPersonalDocs] = useState([]);
  const [vehicleDocs, setVehicleDocs] = useState([]);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  const getPersonalDocName = (dt) => {
    const type = dt.toUpperCase();
    if (type === 'LICENSE' || type === 'DRIVER_LICENSE' || type === 'DL') return t('docs', 'license') || 'Driving License';
    if (type === 'AADHAAR' || type === 'AADHAR') return t('docs', 'aadhaar') || 'Aadhaar Card';
    if (type === 'PAN') return 'PAN Card';
    return dt;
  };

  const loadDocs = async () => {
    try {
      setLoading(true);
      const savedVehicle = await storage.getItem(SELECTED_VEHICLE_KEY);
      setVehicle(savedVehicle);

      const fetchedUserDocs = await fetchDocuments(token, 'USER', user._id);
      const formattedUserDocs = fetchedUserDocs.map((d) => {
        const isExpired = d.expiryDate && new Date(d.expiryDate) < new Date();
        return { id: d._id, name: getPersonalDocName(d.docType), valid: !isExpired, expiryDate: d.expiryDate || null, publicUrl: d.publicUrl };
      });
      setPersonalDocs(formattedUserDocs);

      if (savedVehicle?._id) {
        const fetchedVehicleDocs = await fetchVehicleDocuments(token, savedVehicle._id);
        const formattedVehicleDocs = [];

        const VEHICLE_DOC_LABELS = {
          en: { RC: 'Registration Certificate (RC)', INSURANCE: 'Insurance Policy', FITNESS: 'Fitness Certificate', PERMIT: 'Vehicle Permit', NATIONAL_PERMIT: 'National Permit', front: 'Front', back: 'Back' },
          hi: { RC: 'पंजीकरण प्रमाणपत्र (RC)', INSURANCE: 'बीमा पॉलिसी', FITNESS: 'फिटनेस प्रमाणपत्र', PERMIT: 'वाहन परमिट', NATIONAL_PERMIT: 'नेशनल परमिट', front: 'आगे', back: 'पीछे' },
        };
        const activeLang = language === 'hi' ? 'hi' : 'en';
        const labels = VEHICLE_DOC_LABELS[activeLang];

        fetchedVehicleDocs.forEach((d) => {
          const isExpired = d.expiryDate && new Date(d.expiryDate) < new Date();
          const baseName = labels[d.docType] || d.docType;
          if (Array.isArray(d.files) && d.files.length > 0) {
            d.files.forEach((file, index) => {
              let suffix = '';
              if (file.side === 'FRONT') suffix = ` - ${labels.front}`;
              else if (file.side === 'BACK') suffix = ` - ${labels.back}`;
              else if (d.files.length > 1) suffix = index === 0 ? ` - ${labels.front}` : ` - ${labels.back}`;
              formattedVehicleDocs.push({ id: `${d._id}-${file.side || index}`, name: `${baseName}${suffix}`, valid: !isExpired, expiryDate: d.expiryDate || null, publicUrl: file.publicUrl });
            });
          } else {
            formattedVehicleDocs.push({ id: d._id, name: baseName, valid: !isExpired, expiryDate: d.expiryDate || null, publicUrl: null });
          }
        });
        setVehicleDocs(formattedVehicleDocs);
      } else {
        setVehicleDocs([]);
      }
    } catch (error) {
      logger.error('DocumentsScreen', `Error loading documents: ${error?.message}`);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadDocs(); }, [token, user?._id]));

  const showPersonal = !docType || docType === 'PERSONAL';
  const showVehicle = !docType || docType === 'VEHICLE';
  const bothSections = !docType;

  const shownDocs = [
    ...(showPersonal ? personalDocs : []),
    ...(showVehicle ? vehicleDocs : []),
  ];
  const expiredCount = shownDocs.filter((d) => !d.valid).length;

  const statusOf = (doc) => {
    const exp = doc.expiryDate ? dayjs(doc.expiryDate) : null;
    if (!doc.valid) return { tone: 'expired', label: t('docs', 'expired') || 'Expired', iconBg: colors.expiredBg, iconColor: colors.expiredText };
    const days = exp ? exp.diff(dayjs(), 'day') : null;
    if (days != null && days >= 0 && days <= 30) {
      return { tone: 'pending', label: `Expires in ${days} day${days === 1 ? '' : 's'}`, iconBg: colors.pendingBg, iconColor: colors.pendingText };
    }
    return { tone: 'valid', label: (t('docs', 'valid') || 'Valid') + (exp ? ` · ${exp.year()}` : ''), iconBg: colors.tealTint, iconColor: colors.primary };
  };

  const openDoc = (doc) => {
    if (doc.publicUrl) setSelectedImageUrl(doc.publicUrl);
    else Alert.alert(
      language === 'hi' ? 'उपलब्ध नहीं है' : 'Not Available',
      language === 'hi' ? 'इस दस्तावेज़ का कोई चित्र अभी उपलब्ध नहीं है।' : "This document doesn't have a viewable image yet.",
    );
  };

  const renderDocCard = (doc) => {
    const s = statusOf(doc);
    return (
      <Pressable key={doc.id} style={[styles.docCard, doc.valid ? null : styles.docCardExpired]} onPress={() => openDoc(doc)}>
        <View style={[styles.docIcon, { backgroundColor: s.iconBg }]}>
          <Ionicons name="document-text" size={22} color={s.iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" weight="bold" numberOfLines={1}>{doc.name}</AppText>
          <Badge tone={s.tone} label={s.label} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.viewBtn}>
          <Ionicons name="eye" size={19} color={colors.textMuted} />
        </View>
      </Pressable>
    );
  };

  const title = docType === 'PERSONAL' ? t('docs', 'personalTitle')
    : docType === 'VEHICLE' ? t('docs', 'vehicleTitle')
    : t('docs', 'title');
  const subtitle = language === 'hi'
    ? (docType === 'PERSONAL' ? 'अपने व्यक्तिगत दस्तावेज़' : 'वाहन के दस्तावेज़')
    : language === 'bn'
      ? (docType === 'PERSONAL' ? 'আপনার ব্যক্তিগত নথি' : 'গাড়ির নথি')
      : (docType === 'PERSONAL' ? 'Your personal documents' : 'Legal vehicle documents');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScreenHeader title={title} subtitle={subtitle} onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />

      <View style={styles.sheet}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
            {/* Expiry alert */}
            {expiredCount > 0 && (
              <View style={styles.alert}>
                <Ionicons name="alert-circle" size={19} color={colors.expiredText} style={{ marginTop: 1 }} />
                <AppText variant="small" weight="semibold" color="#A6291F" style={{ flex: 1 }}>
                  {expiredCount} document{expiredCount === 1 ? '' : 's'} expired. Renew to stay compliant.
                </AppText>
              </View>
            )}

            {/* Personal */}
            {showPersonal && (
              <View style={styles.section}>
                {bothSections ? <AppText variant="label" muted style={styles.sectionLabel}>{t('docs', 'personalTitle')}</AppText> : null}
                {personalDocs.length === 0
                  ? <AppText muted style={styles.emptyLine}>{language === 'hi' ? 'कोई व्यक्तिगत दस्तावेज़ नहीं।' : 'No personal documents found.'}</AppText>
                  : personalDocs.map(renderDocCard)}
              </View>
            )}

            {/* Vehicle */}
            {showVehicle && (
              <View style={styles.section}>
                {bothSections ? (
                  <AppText variant="label" muted style={styles.sectionLabel}>
                    {t('docs', 'vehicleTitle')}{vehicle ? ` · ${vehicle.registrationNumber}` : ''}
                  </AppText>
                ) : null}
                {vehicle ? (
                  vehicleDocs.length === 0
                    ? <AppText muted style={styles.emptyLine}>{language === 'hi' ? 'इस वाहन के लिए कोई दस्तावेज़ नहीं।' : 'No documents found for this vehicle.'}</AppText>
                    : vehicleDocs.map(renderDocCard)
                ) : (
                  <View style={styles.noVehicle}>
                    <Ionicons name="car-outline" size={40} color={colors.primary} />
                    <AppText variant="h3" weight="bold" center style={{ marginTop: 10 }}>
                      {language === 'hi' ? 'कोई वाहन असाइन नहीं है' : 'No Vehicle Assigned'}
                    </AppText>
                    <AppText variant="small" muted center style={{ marginTop: 6, marginBottom: 16 }}>
                      {language === 'hi' ? 'वाहन के दस्तावेज़ देखने के लिए एक वाहन चुनें।' : 'Assign a vehicle to view its legal documents.'}
                    </AppText>
                    <Button
                      label={language === 'hi' ? 'वाहन चुनें' : 'Select Vehicle'}
                      iconRight="arrow-forward"
                      onPress={() => navigation.navigate('Vehicle')}
                      fullWidth={false}
                    />
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Image Viewer Modal */}
      <Modal visible={!!selectedImageUrl} transparent animationType="fade">
        <View style={styles.modalBg}>
          <Pressable style={styles.modalClose} onPress={() => setSelectedImageUrl(null)} hitSlop={10}>
            <Ionicons name="close-circle" size={36} color="#FFF" />
          </Pressable>
          {selectedImageUrl && (
            <Image
              source={{ uri: selectedImageUrl }}
              style={{ width: '95%', height: '80%', resizeMode: 'contain' }}
              onError={() => { Alert.alert('Error', 'Could not load document image.'); setSelectedImageUrl(null); }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -16,
    paddingHorizontal: 22,
    paddingTop: 20,
  },

  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.expiredBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 18,
  },

  section: { marginBottom: 8 },
  sectionLabel: { marginBottom: 11, marginTop: 6 },
  emptyLine: { fontStyle: 'italic', marginBottom: 16 },

  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#102824',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  docCardExpired: { borderWidth: 1.5, borderColor: '#F3CFCB' },
  docIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  viewBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },

  noVehicle: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 24, marginTop: 4 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
});
