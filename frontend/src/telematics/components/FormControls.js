import React, { useEffect, useState } from 'react';
import { ScrollView, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { AppText, Button, BackHeader, colors, spacing } from '../../components/ui';
import Select from '../../components/ui/SelectField';

export function Screen({ navigation, title, subtitle, action, children }) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const showBack = navigation.getState().type === 'stack' && navigation.canGoBack();
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <BackHeader active={focused} title={title} subtitle={subtitle} right={action} onBack={showBack ? () => navigation.goBack() : undefined} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never" contentContainerStyle={{ width: '100%', maxWidth: 680, alignSelf: 'center', paddingTop: spacing.md, paddingLeft: spacing.md + insets.left, paddingRight: spacing.md + insets.right, paddingBottom: insets.bottom + spacing.lg, gap: spacing.md }}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}
export function Choice({ label, value, options, onChange, disabled }) {
  return <View><AppText variant="label" muted>{label}</AppText><Select accessibilityLabel={label} selectedValue={value} onValueChange={onChange} enabled={!disabled}>
    <Select.Item label="Choose…" value="" />
    {options.map(([id, name]) => <Select.Item key={id} label={name} value={id} />)}
  </Select></View>;
}
export function useRequest(load, dependencies = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError(''); setLoading(true);
    Promise.resolve().then(load).then((result) => { if (active) setData(result); })
      .catch((failure) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision, ...dependencies]);
  return { data, loading, error, reload: () => setRevision((value) => value + 1) };
}
export function RequestState({ request }) {
  return <>{request.loading && <AppText>Loading…</AppText>}{request.error ? <><AppText accessibilityRole="alert" color={colors.error}>{request.error}</AppText><Button label="Retry" onPress={request.reload} /></> : null}</>;
}
