import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  primary: '#429690',
  primaryDark: '#2F7E79',
  white: '#FFFFFF',
  background: '#F8FAFA',
  textDark: '#222222',
  textMuted: '#888888',
  border: '#E8EEEE',
  surface: '#F1F5F5',
  cardBg: 'rgba(66, 150, 144, 0.08)',
  selectedBg: 'rgba(66, 150, 144, 0.12)',
  success: '#2ECC71',
  successBg: 'rgba(46, 204, 113, 0.10)',
  disabledBg: '#D0D8D8',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // ── Green Top Section ──
  topSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.28,
    backgroundColor: COLORS.primary,
    overflow: 'hidden',
  },
  circleOne: {
    position: 'absolute',
    width: 212,
    height: 212,
    right: -50,
    top: -15,
    borderRadius: 106,
    backgroundColor: COLORS.white,
    opacity: 0.1,
  },
  circleTwo: {
    position: 'absolute',
    width: 127,
    height: 127,
    right: -15,
    top: -15,
    borderRadius: 63.5,
    backgroundColor: COLORS.white,
    opacity: 0.1,
  },
  circleThree: {
    position: 'absolute',
    width: 85,
    height: 85,
    left: 127,
    top: -22,
    borderRadius: 42.5,
    backgroundColor: COLORS.white,
    opacity: 0.1,
  },

  // ── Header ──
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBlock: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerStep: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // ── Progress Bar ──
  progressBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  progressSegmentActive: {
    backgroundColor: COLORS.white,
  },

  // ── Content Card ──
  contentCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 8,
    paddingHorizontal: 22,
    paddingTop: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 16,
  },

  // ── Section Label ──
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },

  // ── Task Card ──
  taskCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskCardComplete: {
    backgroundColor: COLORS.successBg,
  },
  taskIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  taskIconContainerComplete: {
    backgroundColor: COLORS.successBg,
  },
  taskInfo: {
    flex: 1,
    marginLeft: 16,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  taskStatus: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 4,
  },
  taskStatusComplete: {
    color: COLORS.success,
  },

  // ── Camera Button (when no photo) ──
  cameraBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // ── Success State (when photo taken) ──
  successActions: {
    alignItems: 'center',
    gap: 6,
  },
  checkCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.successBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  retakeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // ── Footer ──
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: COLORS.white,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  submitBtnDisabled: {
    backgroundColor: COLORS.disabledBg,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },
});

export default styles;
