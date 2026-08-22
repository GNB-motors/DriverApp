import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { colors } from '../theme/tokens';

/**
 * Top-level error boundary. A render/runtime exception anywhere below it shows a
 * recoverable fallback instead of white-screening the app, and reports the crash
 * to Sentry. Uses only primitive RN components + tokens so the fallback still
 * renders even if a design-system component is the culprit.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    try {
      Sentry.captureException(error, { extra: { componentStack: info?.componentStack } });
    } catch {
      // never let the reporter itself throw
    }
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The app hit an unexpected error. Tap “Try again” — if it keeps happening, please close and reopen the app.
          </Text>
          <Pressable style={styles.btn} onPress={this.reset} accessibilityRole="button">
            <Text style={styles.btnText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  body: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  btn: { marginTop: 8, backgroundColor: colors.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
