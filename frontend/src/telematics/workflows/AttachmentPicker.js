import React, { useState } from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Button, colors, radius, spacing } from "../../components/ui";
const isPdf = (asset) =>
  asset?.mimeType === "application/pdf" || /\.pdf$/i.test(asset?.name || "");
const sizeOf = (asset) => {
  const bytes = asset?.size || asset?.fileSize;
  return bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : null;
};
export default function AttachmentPicker({
  title,
  hint,
  asset,
  locked = false,
  disabled = false,
  onCamera,
  onGallery,
  onFile,
  onRemove,
  imagesOnly = false,
}) {
  const [failedUri, setFailedUri] = useState(null);
  if (!asset)
    return (
      <View style={[styles.zone, disabled && styles.dim]}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="cloud-upload-outline"
            size={32}
            color={colors.primary}
          />
        </View>
        <AppText variant="h3" center>
          Upload {title.toLowerCase()}
        </AppText>
        {hint ? (
          <AppText variant="small" muted center>
            {hint}
          </AppText>
        ) : null}
        <View style={styles.row}>
          <Button
            label="Camera"
            icon="camera-outline"
            size="sm"
            disabled={disabled}
            onPress={onCamera}
            style={styles.flex}
          />
          <Button
            label="Gallery"
            icon="images-outline"
            size="sm"
            variant="secondary"
            disabled={disabled}
            onPress={onGallery}
            style={styles.flex}
          />
        </View>
        {!imagesOnly && <Button
          label="Upload a PDF instead"
          icon="document-attach-outline"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onPress={onFile}
        />}
      </View>
    );
  const pdf = isPdf(asset);
  const showImage = !pdf && !!asset.uri && failedUri !== asset.uri;
  const details = [pdf ? "PDF" : "Photo", sizeOf(asset)]
    .filter(Boolean)
    .join(" · ");
  return (
    <View style={[styles.selected, disabled && styles.dim]}>
      <View style={styles.header}>
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        <AppText weight="semibold">{title} attached</AppText>
      </View>
      <View>
        {showImage ? (
          <Image
            source={{ uri: asset.uri }}
            style={styles.preview}
            resizeMode="cover"
            accessibilityLabel={`${title} preview`}
            onError={() => setFailedUri(asset.uri)}
          />
        ) : (
          <View style={styles.file}>
            <Ionicons
              name={pdf ? "document-text-outline" : "image-outline"}
              size={28}
              color={colors.primary}
            />
            <View style={styles.flex}>
              <AppText weight="semibold" numberOfLines={1}>
                {asset.name || "Selected file"}
              </AppText>
              <AppText variant="caption" muted>
                {details}
              </AppText>
            </View>
          </View>
        )}
        {!locked && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${title.toLowerCase()}`}
            disabled={disabled}
            hitSlop={8}
            onPress={onRemove}
            style={[styles.remove, !showImage && styles.removeOnFile]}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={showImage ? colors.white : colors.error}
            />
          </Pressable>
        )}
      </View>
      {showImage ? (
        <AppText variant="caption" muted numberOfLines={1}>
          {[asset.name, details].filter(Boolean).join(" · ")}
        </AppText>
      ) : null}
      <View style={styles.row}>
        {locked ? (
          <Button
            label="Reselect same file"
            icon="refresh-outline"
            size="sm"
            variant="secondary"
            disabled={disabled}
            onPress={pdf ? onFile : onGallery}
            style={styles.flex}
          />
        ) : (
          <>
            <Button
              label="Retake"
              icon="camera-outline"
              size="sm"
              variant="secondary"
              disabled={disabled}
              onPress={onCamera}
              style={styles.flex}
            />
            <Button
              label="Replace"
              icon="swap-horizontal-outline"
              size="sm"
              variant="secondary"
              disabled={disabled}
              onPress={pdf ? onFile : onGallery}
              style={styles.flex}
            />
          </>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  dim: { opacity: 0.6 },
  zone: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    alignSelf: "stretch",
    marginTop: spacing.xs,
  },
  selected: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  preview: {
    width: "100%",
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  file: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    paddingRight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  remove: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: "rgba(10,16,36,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeOnFile: {
    top: "50%",
    marginTop: -20,
    backgroundColor: colors.surface,
  },
});
