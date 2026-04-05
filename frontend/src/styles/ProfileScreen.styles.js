import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  primary: '#429690',
  primaryDark: '#2A7C76',
  white: '#FFFFFF',
  textDark: '#333333',
  textLight: '#F2F2F2',
  cardBg: 'rgba(67, 136, 131, 0.10)',
  danger: '#E74C3C',
  dangerBg: 'rgba(231, 76, 60, 0.10)',
};

const styles = StyleSheet.create({
  // ── Green Top Section (absolute) ──
  topSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.45,
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
  headerTitleContainer: {
    paddingTop: 16,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    marginTop: 20,
  },

  // ── Avatar ──
  profileAvatarContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.white,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
  },
  usernameText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },

  // ── Bottom White Content ──
  bottomContent: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 28,
    paddingHorizontal: 20,
    paddingTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 16,
  },

  // ── Menu Items ──
  menuItem: {
    height: 80,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  menuItemDanger: {
    backgroundColor: COLORS.dangerBg,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: {
    flex: 1,
    marginLeft: 16,
    color: '#438883',
    fontSize: 16,
    fontWeight: '600',
  },
  menuTitleDanger: {
    color: COLORS.danger,
  },
  chevron: {
    paddingRight: 4,
  },
});

export default styles;
