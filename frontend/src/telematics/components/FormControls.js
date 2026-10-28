import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, colors, spacing } from '../../components/ui';
import Select from '../../components/ui/SelectField';

export function Screen({ navigation, title, children }) {
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.lg, gap: spacing.md }}>
      <Button label="Back" variant="ghost" onPress={() => navigation.goBack()} />
      <AppText variant="h2">{title}</AppText>{children}
    </ScrollView>
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
