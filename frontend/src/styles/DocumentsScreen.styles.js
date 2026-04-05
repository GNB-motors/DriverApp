import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  primary: '#429690',
  primaryDark: '#2A7C76',
  white: '#FFFFFF',
  textDark: '#333333',
  textMuted: '#666666',
  cardBg: 'rgba(67, 136, 131, 0.10)',
  bg: '#F5F5F5',
  success: '#27AE60',
  successBg: 'rgba(39, 174, 96, 0.15)',
  danger: '#E74C3C',
  dangerBg: 'rgba(231, 76, 60, 0.15)',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  // ── Green Top Section ──
  topSection: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 220,
    backgroundColor: COLORS.primary,
    overflow: 'hidden',
  },
  circleOne: {
    position: 'absolute',
    width: 212, height: 212,
    right: -50, top: -15,
    borderRadius: 106,
    backgroundColor: COLORS.white,
    opacity: 0.1,
  },
  circleTwo: {
    position: 'absolute',
    width: 127, height: 127,
    right: -15, top: -15,
    borderRadius: 63.5,
    backgroundColor: COLORS.white,
    opacity: 0.1,
  },
  
  // ── Header Content ──
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.white,
  },
  headerSubtitle: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },

  // ── Bottom White Sheet ──
  bottomContent: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 10,
  },
  
  // ── Document Cards ──
  listContainer: {
    paddingBottom: 40,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  docIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  docInfo: {
    flex: 1,
    marginLeft: 16,
  },
  docName: {
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusValidBg: {
    backgroundColor: COLORS.successBg,
  },
  statusValidText: {
    color: COLORS.success,
  },
  statusExpiredBg: {
    backgroundColor: COLORS.dangerBg,
  },
  statusExpiredText: {
    color: COLORS.danger,
  },
  viewBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
});

export default styles;
