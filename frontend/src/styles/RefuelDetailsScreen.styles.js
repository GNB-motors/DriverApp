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
  selectedBorder: '#429690',
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

  // ── Form Card ──
  formCard: {
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

  // ── Form Fields ──
  fieldContainer: {
    marginBottom: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  dropdownButton: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputWrapperDisabled: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  dropdownIconLeft: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textDark,
  },
  dropdownPlaceholder: {
    color: COLORS.textMuted,
  },
  disabledText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMuted,
  },

  // ── Dropdown Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: height * 0.5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemSelected: {
    backgroundColor: COLORS.selectedBg,
  },
  modalItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textDark,
  },
  modalItemTextSelected: {
    color: COLORS.primaryDark,
    fontWeight: '600',
  },

  // ── Refuel Type Options ──
  optionsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  optionCard: {
    flex: 1,
    height: 100,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  optionSelected: {
    borderColor: COLORS.selectedBorder,
    backgroundColor: COLORS.selectedBg,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionIconSelected: {
    backgroundColor: 'rgba(66, 150, 144, 0.2)',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  optionTextSelected: {
    color: COLORS.primaryDark,
  },

  // ── Footer ──
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: COLORS.white,
  },
  nextBtn: {
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
  nextBtnDisabled: {
    backgroundColor: COLORS.disabledBg,
    shadowOpacity: 0,
    elevation: 0,
  },
  nextText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },
});

export default styles;
