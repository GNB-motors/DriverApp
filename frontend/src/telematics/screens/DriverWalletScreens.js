import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText, Button, Card, SegmentedControl, StatusBadge, TextField, colors, spacing,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import client from '../../services/client';
import billService from '../../services/billService';
import walletService from '../../services/walletService';
import { pickFromCamera, pickFromGallery } from '../../utils/pickImage';
import {
  Screen,
  Choice,
  useRequest,
  RequestState,
} from '../components/FormControls';
import AttachmentPicker from '../workflows/AttachmentPicker';
import DateField from '../workflows/DateField';
import { useDriverData } from '../context/DriverDataContext';
import { useTelematicsApi } from '../context/TelematicsApiContext';
import { collectPages } from '../services/telematicsApi';

const money = (v) =>
  v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`;
const idOf = (r) => r?._id || r?.id;
const categories = [
  'Toll',
  'Food',
  'Parking',
  'Repair',
  'Loading',
  'Fuel',
  'Other',
];
function Pager({ page, setPage, total, limit = 20 }) {
  return (
    <>
      <AppText muted>
        Page {page} · {total ?? '—'} records
      </AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          label="Previous"
          variant="secondary"
          style={{ flex: 1 }}
          disabled={page === 1}
          onPress={() => setPage(page - 1)}
        />
        <Button
          label="Next"
          variant="secondary"
          style={{ flex: 1 }}
          disabled={total == null || page * limit >= total}
          onPress={() => setPage(page + 1)}
        />
      </View>
    </>
  );
}
export function DriverExpenseSummary({ navigation }) {
  const { user } = useAuth();
  const request = useRequest(
    () => walletService.getDriverSummary(user._id),
    [user._id],
  );
  return (
    <Card style={{ gap: spacing.sm }}>
      <AppText weight="bold">My recorded expenses</AppText>
      <RequestState request={request} />
      {request.data && (
        <AppText variant="h3">{money(request.data.totalAmount)}</AppText>
      )}
      <Button
        label="Open Khata & bills"
        variant="secondary"
        onPress={() => navigation.navigate('Wallet')}
      />
    </Card>
  );
}
export function DriverWallet({ navigation }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('bills');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setRevision((v) => v + 1);
    }, []),
  );
  const summary = useRequest(
    () => walletService.getDriverSummary(user._id),
    [user._id, revision],
  );
  const records = useRequest(
    () =>
      tab === 'bills'
        ? billService.listBills({ page, limit: 20 })
        : walletService.getDriverLedger(user._id, { page, limit: 20 }),
    [user._id, tab, page, revision],
  );
  const entries = records.data?.results || [];
  return (
    <Screen navigation={navigation} title="Khata & expense bills">
      <RequestState request={summary} />
      <Card style={{ gap: spacing.sm }}>
        <AppText muted>Recorded expenses</AppText>
        <AppText variant="h2">{money(summary.data?.totalAmount)}</AppText>
        <AppText muted>
          Expense ledger total. This is not money held in the app or a payout
          balance. Pending and rejected bills are excluded.
        </AppText>
      </Card>
      <Button
        label="Add an expense bill"
        onPress={() => navigation.navigate('AddBill')}
      />
      <Button
        label="My advance records"
        variant="secondary"
        onPress={() => navigation.navigate('Advances')}
      />
      <SegmentedControl
        variant="pill"
        value={tab}
        options={[
          { value: 'bills', label: 'My bills' },
          { value: 'ledger', label: 'Expense ledger' },
        ]}
        onChange={(v) => {
          if (v) {
            setTab(v);
            setPage(1);
          }
        }}
      />
      <RequestState request={records} />
      {records.data && (
        <>
          {!entries.length && <AppText>No entries yet.</AppText>}
          {entries.map((r) => (
            <Card key={idOf(r)} style={{ gap: spacing.sm }}>
              <AppText weight="bold">
                {r.title || r.category || 'Expense'}
              </AppText>
              <AppText variant="h3">{money(r.amount)}</AppText>
              <StatusBadge
                status={r.status || 'recorded'}
                label={!r.status ? 'Recorded' : undefined}
              />
              {r.expenseDate && (
                <AppText muted>{new Date(r.expenseDate).toLocaleDateString()}</AppText>
              )}
              {r.description ? <AppText muted>{r.description}</AppText> : null}
              {r.rejectionReason ? (
                <AppText color={colors.error}>{r.rejectionReason}</AppText>
              ) : null}
              {tab === 'bills' && r.status === 'REJECTED' && (
                <Button
                  label="Correct and resubmit"
                  variant="secondary"
                  onPress={() => navigation.navigate('AddBill', { bill: r })}
                />
              )}
            </Card>
          ))}
          <Pager page={page} setPage={setPage} total={records.data.total} />
        </>
      )}
      <Button
        label="Refresh"
        variant="secondary"
        onPress={() => setRevision((v) => v + 1)}
      />
    </Screen>
  );
}
export function DriverBillForm({ navigation, route }) {
  const bill = route.params?.bill;
  const service = useTelematicsApi();
  const trips = useRequest(
    () => (bill ? [] : collectPages((page) => service.erpTrips(page), 30)),
    [service, bill],
  );
  const [tripId, setTripId] = useState('');
  const { data } = useDriverData();
  const [category, setCategory] = useState(
    {
      TOLL: 'Toll',
      DRIVER_MEAL: 'Food',
      REPAIR: 'Repair',
      LOADING_UNLOADING: 'Loading',
      FUEL: 'Fuel',
    }[bill?.category] || 'Other',
  );
  const [amount, setAmount] = useState(bill ? String(bill.amount) : '');
  const [description, setDescription] = useState(bill?.description || '');
  const [date, setDate] = useState(
    (bill?.expenseDate || new Date().toISOString()).slice(0, 10),
  );
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const submissionId = useRef(null);
  const moving = data?.vehicle?.speed > 0;
  const ready =
    Number.isFinite(Number(amount)) &&
    Number(amount) >= 1 &&
    photo &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !moving;
  async function pick(camera) {
    setError('');
    try {
      const file = await (camera ? pickFromCamera() : pickFromGallery());
      if (file) setPhoto(file);
    } catch (e) {
      setError(e.message);
    }
  }
  async function send() {
    if (!ready || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setLocked(true);
    setError('');
    try {
      if (!submissionId.current) submissionId.current = Crypto.randomUUID();
      const payload = {
        clientRequestId: submissionId.current,
        amount: Number(amount),
        category,
        description,
        expenseDate: new Date(`${date}T12:00:00`).toISOString(),
        photo,
        tripId: tripId || undefined,
      };
      const saved = bill
        ? await billService.resubmitBill(idOf(bill), payload)
        : await billService.submitBill(payload);
      navigation.replace('BillSent', { bill: saved });
    } catch (e) {
      setError(e.message);
      if ([400, 422].includes(e.status)) {
        setLocked(false);
        submissionId.current = null;
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <Screen
      navigation={navigation}
      title={bill ? 'Resubmit expense bill' : 'Add expense bill'}
    >
      {!bill && (
        <>
          <RequestState request={trips} />
          <Choice
            label="Trip (optional)"
            value={tripId}
            options={(trips.data || []).map((trip) => [
              String(trip._id),
              trip.tripNumber,
            ])}
            onChange={setTripId}
            disabled={locked || moving}
          />
        </>
      )}
      {moving && <AppText>Stop safely before adding a bill.</AppText>}
      {bill?.rejectionReason && (
        <AppText color={colors.error}>
          Previous rejection: {bill.rejectionReason}
        </AppText>
      )}
      <Choice
        label="Category"
        value={category}
        options={categories.map((c) => [c, c])}
        onChange={setCategory}
        disabled={locked || moving}
      />
      <TextField
        label="Amount (₹)"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        editable={!locked && !moving}
      />
      <TextField
        label="What was it for?"
        value={description}
        onChangeText={setDescription}
        editable={!locked && !moving}
        maxLength={1000}
      />
      <DateField
        label="Expense date"
        value={date}
        includeTime={false}
        onChange={(v) => setDate(v.slice(0, 10))}
        disabled={locked || moving}
      />
      <AttachmentPicker
        title="Bill photo"
        asset={photo}
        imagesOnly
        locked={locked}
        disabled={busy || moving}
        onCamera={() => pick(true)}
        onGallery={() => pick(false)}
        onRemove={() => setPhoto(null)}
      />
      <AppText muted>
        Sent bills await office confirmation before appearing in the expense
        ledger. Confirmation does not mean payment.
      </AppText>
      {error ? (
        <AppText accessibilityRole="alert" color={colors.error}>
          {error}
        </AppText>
      ) : null}
      <Button
        label="Send for confirmation"
        disabled={!ready || busy}
        loading={busy}
        onPress={send}
      />
    </Screen>
  );
}
export function DriverBillSent({ navigation, route }) {
  const bill = route.params?.bill;
  return (
    <Screen navigation={navigation} title="Bill sent">
      <Card style={{ gap: spacing.sm }}>
        <StatusBadge status={bill?.status || 'PENDING'} />
        <AppText variant="h2">
          {bill?.status === 'CONFIRMED'
            ? 'Confirmed in expense ledger'
            : bill?.status === 'REJECTED'
              ? 'Bill needs correction'
              : 'Awaiting confirmation'}
        </AppText>
        <AppText>
          {money(bill?.amount)} · {bill?.title || 'Expense bill'}
        </AppText>
        <AppText muted>
          {bill?.status === 'CONFIRMED'
            ? 'Your office confirmed this expense. Confirmation does not mean payment.'
            : bill?.status === 'REJECTED'
              ? 'Your office rejected this bill. Open my bills to correct and resubmit it.'
              : 'Your office will review this bill. It has not been paid.'}
        </AppText>
      </Card>
      <Button
        label="View my bills"
        onPress={() => navigation.navigate('Wallet')}
      />
      <Button
        label="Add another bill"
        variant="secondary"
        onPress={() => navigation.replace('AddBill')}
      />
    </Screen>
  );
}
export function DriverAdvances({ navigation }) {
  const [page, setPage] = useState(1);
  const request = useRequest(
    async () =>
      (await client.get('/app/v1/advances', { params: { page, limit: 20 } }))
        .data,
    [page],
  );
  return (
    <Screen navigation={navigation} title="My advance records">
      <AppText muted>
        Advances recorded by your office. No money transfer takes place in this
        app.
      </AppText>
      <RequestState request={request} />
      {request.data && (
        <>
          {!request.data.data?.length && (
            <AppText>No advance records yet.</AppText>
          )}
          {(request.data.data || []).map((r) => (
            <Card key={idOf(r)} style={{ gap: spacing.sm }}>
              <AppText weight="bold">
                {r.advanceNumber}
              </AppText>
              <AppText variant="h3">{money(r.netPayable)}</AppText>
              <StatusBadge status={r.status} />
              <AppText>{r.tripId?.tripNumber || 'Trip'}</AppText>
              <AppText>Requested: {money(r.requestedAmount)}</AppText>
              <AppText>Deductions: {money(r.totalDeductions)}</AppText>
              {r.paidAt && (
                <AppText>
                  Office recorded payment:{' '}
                  {new Date(r.paidAt).toLocaleDateString()}
                </AppText>
              )}
            </Card>
          ))}
          <Pager
            page={page}
            setPage={setPage}
            total={request.data.meta?.total}
          />
        </>
      )}
    </Screen>
  );
}
