import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

// Expo Go on Android ships without expo-notifications' push modules (removed in SDK 53),
// and the package index throws on import there (ExpoTopicSubscriptionModule), so load
// it only where it can run. Push on Android needs a development build.
export const notificationsUnavailable = Platform.OS === 'android' && isRunningInExpoGo();

const Notifications = notificationsUnavailable ? null : require('expo-notifications');

export default Notifications;
