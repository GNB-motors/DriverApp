import { StyleSheet, Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

export const COLORS = {
  primary: '#429690',
  primaryDark: '#2F7E79',
  white: '#FFFFFF',
  textDark: '#222222',
  textMuted: '#888888',
  border: '#E8EEEE',
  cardBg: 'rgba(66, 150, 144, 0.08)',
  successBg: 'rgba(46, 204, 113, 0.12)',
  success: '#2ECC71',
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
    height: height * 0.55,
    backgroundColor: COLORS.primary,
    overflow: 'hidden',
  },
  circleOne: {
    position: 'absolute',
    width: 260,
    height: 260,
    right: -70,
    top: -40,
    borderRadius: 130,
    backgroundColor: COLORS.white,
    opacity: 0.08,
  },
  circleTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    left: -50,
    top: 60,
    borderRadius: 90,
    backgroundColor: COLORS.white,
    opacity: 0.06,
  },
  circleThree: {
    position: 'absolute',
    width: 120,
    height: 120,
    right: 40,
    bottom: -30,
    borderRadius: 60,
    backgroundColor: COLORS.white,
    opacity: 0.05,
  },

  // ── Top Content (on green) ──
  topContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  checkCircleOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  checkCircleInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 6,
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },

  // ── Bottom Card ──
  bottomCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 28,
    paddingTop: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 16,
    justifyContent: 'space-between',
    paddingBottom: 44,
  },
  messageContainer: {
    alignItems: 'center',
  },
  messageIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },

  // ── Info Row ──
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
    width: '100%',
  },
  infoChip: {
    flex: 1,
    height: 64,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    overflow: 'hidden',
  },
  infoChipIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  infoChipTextWrap: {
    flex: 1,
  },
  infoChipValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 1,
  },

  // ── Button ──
  button: {
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default styles;
