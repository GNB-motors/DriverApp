import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const COLORS = {
  primary: '#429690',
  primaryDark: '#2F7E79',
  secondary: '#FFAB7B',
  background: '#FFFFFF',
  textDark: '#222222',
  textMuted: '#666666',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // ── Header Background Circles (Figma) ──
  circleOne: {
    position: 'absolute',
    width: 212,
    height: 212,
    left: 157,
    top: 197,
    borderRadius: 106,
    backgroundColor: '#429690',
    opacity: 0.1,
  },
  circleTwo: {
    position: 'absolute',
    width: 127,
    height: 127,
    left: 186,
    top: 112,
    borderRadius: 63.5,
    backgroundColor: '#429690',
    opacity: 0.1,
  },
  circleThree: {
    position: 'absolute',
    width: 85,
    height: 85,
    left: 127,
    top: -22,
    borderRadius: 42.5,
    backgroundColor: '#429690',
    opacity: 0.1,
  },
  
  // ── Header ──
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 60, // Account for notch
    paddingBottom: 20,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 58,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEEEEE',
  },
  greetingText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: '600',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // ── Content area ──
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  refuelCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 20,
    height: 180,
    padding: 24,
    justifyContent: 'space-between',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  refuelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refuelTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
  },
  refuelSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  refuelAction: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  refuelActionText: {
    color: COLORS.primaryDark,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default styles;
