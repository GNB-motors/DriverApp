import { colors } from './tokens';

export const driveTokens = {
  day: {
    bg: colors.background,
    surface: colors.surface,
    text: colors.text,
    textMuted: colors.textMuted,
    route: colors.rage500,
    routeAlt: colors.fog300,
    maneuver: colors.primaryDeep,
    trafficFree: colors.dotGreen,
    trafficSlow: colors.accent,
    trafficJam: colors.errorStrong,
    hazard: colors.warning,
    estimated: colors.warning,
    sos: colors.error,
    border: colors.border,
    map: '#E9EDF2',
    mapRoad: '#FFFFFF',
    mapRoadEdge: '#D0D6E0',
  },
  night: {
    bg: '#0E1116',
    surface: '#161B22',
    text: '#F2F4F8',
    textMuted: '#A9B1BD',
    route: '#6D8AF3',
    routeAlt: '#5B6370',
    maneuver: '#FFFFFF',
    trafficFree: '#3DD266',
    trafficSlow: '#F6C36B',
    trafficJam: '#FF5A5A',
    hazard: '#FF9F45',
    estimated: '#FF9F45',
    sos: '#FF4D4D',
    border: '#303944',
    map: '#10151C',
    mapRoad: '#242D38',
    mapRoadEdge: '#364353',
  },
  type: {
    maneuverDistance: { fontSize: 34, lineHeight: 40 },
    roadName: { fontSize: 20, lineHeight: 26 },
    etaRange: { fontSize: 22, lineHeight: 28 },
    chip: { fontSize: 16, lineHeight: 22 },
    body: { fontSize: 17, lineHeight: 24 },
  },
  target: { moving: 56, stopped: 48 },
};

export function getDriveTokens(theme = 'day') {
  return {
    ...driveTokens,
    colors: theme === 'night' ? driveTokens.night : driveTokens.day,
    isNight: theme === 'night',
  };
}
