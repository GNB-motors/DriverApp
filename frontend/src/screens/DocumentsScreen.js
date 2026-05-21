import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { fetchDocuments } from '../services/api';
import styles, { COLORS } from '../styles/DocumentsScreen.styles';

export default function DocumentsScreen({ navigation }) {
  const { t } = useLanguage();
  const { user, token } = useAuth();

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      setLoading(true);
      // Fetch driver's personal documents (License, Aadhaar, PAN)
      const fetchedDocs = await fetchDocuments(token, 'USER', user._id);

      const formattedDocs = fetchedDocs.map(d => {
        const isExpired = d.expiryDate && new Date(d.expiryDate) < new Date();
        return {
          id: d._id,
          name: d.docType,
          statusKey: isExpired ? 'expired' : 'valid',
          valid: !isExpired,
          publicUrl: d.publicUrl
        };
      });

      setDocs(formattedDocs);
    } catch (error) {
      console.warn('[DocumentsScreen] Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.headerTitle}>{t('docs', 'title') || 'Documents'}</Text>
        </View>

        <Text style={styles.headerSubtitle}>Manage and view all your required legal vehicle documents.</Text>

        {/* Bottom Content Sheet */}
        <View style={styles.bottomContent}>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
          ) : docs.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 50, color: COLORS.darkGray }}>
              No documents found.
            </Text>
          ) : (
            <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
              {docs.map(doc => (
                <TouchableOpacity 
                  key={doc.id} 
                  style={styles.docCard} 
                  activeOpacity={0.7}
                  onPress={() => {
                    if (doc.publicUrl) {
                      setSelectedImageUrl(doc.publicUrl);
                    } else {
                      Alert.alert("Not Available", "This document doesn't have a viewable image yet.");
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
              ))}
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
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
