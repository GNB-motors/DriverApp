import React, { useState } from 'react';
import { AppText, Button, Card, TextField } from '../../components/ui';
import { useManagerData } from '../context/ManagerDataContext';
import { Screen, RequestState } from '../components/FormControls';
import useOwnerRequest from '../hooks/useOwnerRequest';
const amount = (value, unit = 'L') => value == null ? 'Unavailable' : `${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${unit}`;
export default function DefLedgerScreen({ navigation }) {
  const { service, branchId } = useManagerData();
  const branch = branchId === 'all' ? undefined : branchId;
  const request = useOwnerRequest(`def-ledger:${branchId}`, () => service.defLedger(branch));
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const data = request.data;
  const totals = data?.totals;
  const vehicles = data?.vehicles?.filter((row) => row.registrationNumber?.toLowerCase().includes(search.trim().toLowerCase())) || [];
  return <Screen navigation={navigation} title="AdBlue / DEF ledger"><RequestState request={request} />
    <Button label="View diesel fuel entries" variant="secondary" onPress={() => navigation.navigate('Fuel review')} />
    <AppText muted>Selected-scope ledger: logged AdBlue, telemetry consumption and reconciliation. Each row carries its own coverage window; this is not a daily total.</AppText>
    {totals && <Card><AppText>Registered vehicles: {totals.vehicles ?? 'Unavailable'}</AppText><AppText>Logged AdBlue: {data.claimsTracked ? amount(totals.claimedAdblueL) : 'Not logged'}</AppText><AppText>DEF burned: {amount(totals.telemetryDefL)}</AppText><AppText>Sensor fills: {amount(totals.sensorFillL)}</AppText><AppText>Fleet dosing: {amount(totals.dosingRatioPct, '%')}</AppText><AppText>Flagged vehicles: {totals.flagged ?? 0}</AppText></Card>}
    <TextField label="Search vehicle" value={search} onChangeText={setSearch} />
    {vehicles.map((row) => <Card key={row.vehicleId || row.registrationNumber}>
      <AppText variant="h3">{row.registrationNumber}</AppText><AppText>{row.status}</AppText>
      <AppText>Logged: {data.claimsTracked ? amount(row.claimedAdblueL) : 'Not logged'} · Burned: {amount(row.telemetryDefL)}</AppText>
      <AppText>Sensor fills: {amount(row.sensorFillL)} · Balance: {data.claimsTracked ? amount(row.expectedBalanceL) : 'Not tracked'}</AppText>
      <AppText>Dosing: {amount(row.dosingRatioPct, '%')} · Normal {row.defBand?.min ?? data.defBand?.min ?? '—'}–{row.defBand?.max ?? data.defBand?.max ?? '—'}%</AppText>
      <Button label={expanded === row.registrationNumber ? 'Hide evidence' : 'Show evidence'} variant="secondary" onPress={() => setExpanded(expanded === row.registrationNumber ? null : row.registrationNumber)} />
      {expanded === row.registrationNumber && <>
        <AppText>Coverage: {row.coverageFrom ? new Date(row.coverageFrom).toLocaleString() : 'Unavailable'} – {row.coverageTo ? new Date(row.coverageTo).toLocaleString() : 'Unavailable'}</AppText>
        <AppText weight="bold">Flags</AppText>{row.flags?.length ? row.flags.map((flag, index) => <AppText key={index}>{flag.type || flag.kind || 'Flag'} · {flag.message || flag.note || ''} {flag.litres == null ? '' : amount(flag.litres)}</AppText>) : <AppText>No flags.</AppText>}
        <AppText weight="bold">Sensor fills</AppText>{row.fills?.length ? row.fills.map((fill, index) => <AppText key={index}>{fill.at || fill.startAt ? new Date(fill.at || fill.startAt).toLocaleString() : 'Time unavailable'} · {amount(fill.litres ?? fill.deltaL)}</AppText>) : <AppText>No sensor fills.</AppText>}
      </>}
    </Card>)}
    {data && !vehicles.length && <AppText>No vehicles match this search.</AppText>}
    <Button label="Refresh" variant="secondary" onPress={request.reload} disabled={request.loading} />
  </Screen>;
}
