import { StyleSheet } from 'react-native';

export const COLORS = {
  primary: '#429690',
  primaryDark: '#2F7E79',
  secondary: '#FFAB7B',
  background: '#F9F9F9',
  cardBackground: '#FFFFFF',
  textDark: '#222222',
  textMuted: '#666666',
  white: '#FFFFFF',
  border: '#EEEEEE',
  success: '#27AE60',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Header
  headerContainer: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: 60, // notch
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
  },
  
  // List
  listContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 10,
  },

  // Log Card
  logCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  typeBadge: {
    backgroundColor: 'rgba(66,150,144,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logRowLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  logRowValue: {
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: '600',
  },
});

export default styles;
