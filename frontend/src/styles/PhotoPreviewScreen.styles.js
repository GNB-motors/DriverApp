import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  primary: '#429690',
  primaryDark: '#2F7E79',
  white: '#FFFFFF',
  dark: '#111111',
  textMuted: '#999999',
  retake: '#E74C3C',
  retakeBg: 'rgba(231, 76, 60, 0.15)',
  success: '#2ECC71',
  successBg: 'rgba(46, 204, 113, 0.15)',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },

  // ── Loading / Permission States ──
  centeredContainer: {
    flex: 1,
    backgroundColor: COLORS.dark,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(66, 150, 144, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  permissionBackBtn: {
    marginTop: 32,
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  permissionBackText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },

  // ── Camera View ──
  cameraContainer: {
    flex: 1,
    margin: 12,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cameraView: {
    flex: 1,
  },

  // ── Camera Overlay ──
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  cameraCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraLabel: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cameraLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  cameraBottomBar: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: COLORS.white,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
  },

  // ── Preview View ──
  previewContainer: {
    flex: 1,
  },
  imagePreview: {
    flex: 1,
    margin: 12,
    borderRadius: 24,
    backgroundColor: '#1a1a1a',
  },

  // ── Preview Action Bar ──
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 14,
  },
  actionBtn: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  retakeBtn: {
    backgroundColor: COLORS.retakeBg,
    borderWidth: 1.5,
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeIcon: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
  },
  acceptIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  retakeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.retake,
  },
  acceptBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },

  // ── Watermark ──
  watermarkBar: {
    position: 'absolute',
    bottom: 12,   // aligns with imagePreview margin
    left: 12,
    right: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  watermarkText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.3,
  },
});

export default styles;
