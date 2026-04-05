import { StyleSheet } from 'react-native';

// ── Design Tokens ──
export const COLORS = {
  primary: '#005BBF',
  primaryGradientEnd: '#1A73E8',
  background: '#F9F9F9',
  cardBg: '#FFFFFF',
  inputBg: '#E8E8E8',
  textDark: '#1A1C1C',
  textBody: '#414754',
  textMuted: 'rgba(65, 71, 84, 0.70)',
  textDisabled: 'rgba(65, 71, 84, 0.40)',
  borderLight: 'rgba(193, 198, 214, 0.30)',
  borderCard: 'rgba(193, 198, 214, 0.10)',
  divider: '#EEEEEE',
  infoBg: '#F3F3F4',
  green: '#1A6C23',
  greenBg: 'rgba(55, 134, 58, 0.10)',
  blueBg: 'rgba(0, 91, 191, 0.10)',
  placeholder: '#6B7280',
  langActiveBg: '#005BBF',
  langInactiveBg: '#E8E8E8',
};

// ── Styles ──
const styles = StyleSheet.create({
  // ── Layout ──
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  bgSquare: {
    position: 'absolute',
    top: -122,
    left: -43,
    width: 427,
    height: 427,
    backgroundColor: COLORS.textDark,
    opacity: 0.05,
    transform: [{ rotate: '12deg' }],
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    alignItems: 'center',
  },
  innerContent: {
    width: '100%',
    maxWidth: 448,
    gap: 32,
  },

  // ── Header / Branding ──
  header: {
    alignItems: 'center',
    gap: 8,
  },
  logoContainer: {
    padding: 16,
    backgroundColor: 'rgba(0, 91, 191, 0.05)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    marginTop: 16,
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.primary,
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textBody,
    textAlign: 'center',
  },

  // ── Login Card ──
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: COLORS.borderCard,
    shadowColor: 'rgba(0, 26, 65, 1)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 32,
    elevation: 8,
  },
  inputSection: {
    gap: 24,
  },
  inputGroup: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },

  // ── Phone Input ──
  phoneInputContainer: {
    height: 64,
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 12,
    height: '100%',
  },
  flag: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 8,
  },
  countryCodeDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.borderLight,
    marginLeft: 12,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
    letterSpacing: 2,
    paddingHorizontal: 12,
  },

  // ── Password Input ──
  passwordInputContainer: {
    height: 64,
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  eyeButton: {
    padding: 6,
  },

  // ── Login Button ──
  loginButton: {
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: 'rgba(0, 91, 191, 1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
  },

  // ── Help Section ──
  helpSection: {
    marginTop: 40,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
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
    gap: 0,
  },
  infoCard: {
    minHeight: 79,
    backgroundColor: COLORS.infoBg,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardContent: {
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textBody,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textDark,
    lineHeight: 16,
    marginTop: 2,
  },
  langCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  langToggle: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  langOption: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.langInactiveBg,
  },
  langOptionActive: {
    backgroundColor: COLORS.langActiveBg,
  },
  langOptionText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  langOptionTextActive: {
    color: '#FFFFFF',
  },

  // ── Footer ──
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
    opacity: 0.4,
  },
  footerBrand: {
    fontSize: 56,
    fontWeight: '900',
    color: COLORS.textBody,
    lineHeight: 56,
    paddingBottom: 8,
  },
  footerSub: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textBody,
    textTransform: 'uppercase',
    letterSpacing: 4.8,
  },
});

export default styles;
