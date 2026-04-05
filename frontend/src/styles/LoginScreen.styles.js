import { StyleSheet, Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

export const COLORS = {
  primary: '#429690',
  primaryDark: '#2F7E79',
  white: '#FFFFFF',
  background: '#F8FAFA',
  textDark: '#222222',
  textBody: '#555555',
  textMuted: '#888888',
  textDisabled: 'rgba(0,0,0,0.25)',
  placeholder: '#AAAAAA',
  inputBg: '#F2F6F6',
  border: '#E8EEEE',
  cardBg: 'rgba(66, 150, 144, 0.08)',
  green: '#1A6C23',
  greenBg: 'rgba(55, 134, 58, 0.10)',
  disabledBg: '#D0D8D8',
  langActiveBg: '#429690',
  langInactiveBg: '#EEF3F3',
};

const styles = StyleSheet.create({
  // ── Layout ──
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
    height: height * 0.42,
    backgroundColor: COLORS.primary,
    overflow: 'hidden',
  },
  circleOne: {
    position: 'absolute',
    width: 240,
    height: 240,
    right: -60,
    top: -30,
    borderRadius: 120,
    backgroundColor: COLORS.white,
    opacity: 0.08,
  },
  circleTwo: {
    position: 'absolute',
    width: 160,
    height: 160,
    right: -20,
    top: -20,
    borderRadius: 80,
    backgroundColor: COLORS.white,
    opacity: 0.08,
  },
  circleThree: {
    position: 'absolute',
    width: 100,
    height: 100,
    left: -30,
    top: 80,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    opacity: 0.06,
  },
  circleFour: {
    position: 'absolute',
    width: 180,
    height: 180,
    left: 60,
    bottom: -60,
    borderRadius: 90,
    backgroundColor: COLORS.white,
    opacity: 0.05,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },

  // ── Header / Branding ──
  header: {
    alignItems: 'center',
    paddingTop: 70,
    paddingBottom: 30,
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 6,
  },

  // ── Login Card ──
  card: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -10,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 16,
  },
  inputSection: {
    gap: 20,
  },
  inputGroup: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Phone Input ──
  phoneInputContainer: {
    height: 58,
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 12,
    height: '100%',
  },
  countryCodeText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
  },
  countryCodeDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
    marginLeft: 12,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    letterSpacing: 2,
    paddingHorizontal: 12,
  },

  // ── Password Input ──
  passwordInputContainer: {
    height: 58,
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  eyeButton: {
    padding: 6,
  },

  // ── Login Button ──
  loginButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: COLORS.disabledBg,
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },

  // ── Help Section ──
  helpSection: {
    marginTop: 28,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  secureText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ── Info Cards ──
  infoCards: {
    marginTop: 24,
    gap: 12,
  },
  infoCard: {
    height: 72,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardContent: {
    marginLeft: 14,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 2,
  },
  langCardContent: {
    flex: 1,
    marginLeft: 14,
  },
  langToggle: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  langOption: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.langInactiveBg,
  },
  langOptionActive: {
    backgroundColor: COLORS.langActiveBg,
  },
  langOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  langOptionTextActive: {
    color: COLORS.white,
  },

  // ── Footer ──
  footer: {
    paddingVertical: 28,
    alignItems: 'center',
    opacity: 0.3,
  },
  footerBrand: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.textBody,
    lineHeight: 48,
    paddingBottom: 6,
  },
  footerSub: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textBody,
    textTransform: 'uppercase',
    letterSpacing: 4,
  },
});

export default styles;
