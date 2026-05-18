import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles, { COLORS } from '../styles/UploadPhotosScreen.styles';

export default function PhotoTaskCard({ title, icon, type, photoUri, onCameraPress, onGalleryPress, capturedText, pendingText, isLoading, analyzingText }) {
  const done = !!photoUri;
  return (
    <View style={[styles.taskCard, done && styles.taskCardComplete]}>
      <View style={[styles.taskIconContainer, done && styles.taskIconContainerComplete]}>
        <Ionicons name={icon} size={24} color={done ? COLORS.success : COLORS.primary} />
      </View>
      <View style={styles.taskInfo}>
        <Text style={styles.taskTitle}>{title}</Text>
        <Text style={[styles.taskStatus, done && styles.taskStatusComplete, isLoading && { color: COLORS.primary }]}>
          {isLoading ? analyzingText : (done ? capturedText : pendingText)}
        </Text>
      </View>
      {isLoading ? (
        <View style={{ paddingRight: 12 }}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : done ? (
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={20} color={COLORS.success} />
        </View>
      ) : (
        <View style={styles.photoActionButtons}>
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={() => onCameraPress(type)}
            accessibilityLabel={`Take ${type} photo`}
          >
            <Ionicons name="camera" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.galleryBtn}
            onPress={() => onGalleryPress(type)}
            accessibilityLabel={`Upload ${type} from gallery`}
          >
            <Ionicons name="image-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
