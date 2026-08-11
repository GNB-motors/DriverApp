/**
 * ApprovalsScreen.js — the approval queue.
 *
 * GET  /api/erp/approvals
 * POST /api/erp/approvals/:approvalId/decide   ← POST, not PATCH
 *
 * ── The role split, which is the whole subtlety of this screen ──────────────
 * The backend's DECIDERS list is ['OWNER', 'APPROVER', 'SUPER_ADMIN'].
 * **MANAGER is deliberately NOT in it.** A manager is in VIEWERS, so they can
 * read the queue but every decide call returns 403.
 *
 * So the screen renders read-only for managers, with an explicit note about who
 * can act, rather than showing buttons that fail. Approving spending is a
 * financial control; the UI follows the server rather than papering over it.
 *
 * Rejecting requires remarks (backend enforces min 3 chars), so the reject path
 * prompts for a reason instead of sending a bare rejection.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert, Modal, Pressable } from 'react-native';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { useErp } from '../../context/ErpContext';
import useList from '../../hooks/useList';
import { fetchApprovals, decideApproval } from '../../services/erpApi';
import ListScreen from '../../components/ListScreen';
import {
  AppText, Card, Button, Badge, MoneyText, TextField, colors, radius,
} from '../../components/ui';

const STATUS_FILTERS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

/** Approval types, in the plain language an operator would use. */
const TYPE_LABELS = {
  ADVANCE_OVER_BUDGET: 'Advance over budget',
  ADVANCE_HIRE_CAP: 'Hire advance over cap',
  SHORTAGE_OVER_LIMIT: 'Shortage over limit',
  DETENTION_OVER_LIMIT: 'Detention over limit',
  SB_PB_MARGIN: 'Margin below threshold',
  POD_PENDING_LIMIT: 'Too many PODs pending',
  DO_EXPIRY: 'Delivery order expired',
  RATE_OVERRIDE: 'Rate overridden',
};

const typeLabel = (t) =>
  TYPE_LABELS[t] ||
  String(t || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export default function ApprovalsScreen({ navigation }) {
  const { token } = useAuth();
  const { can } = useAccess();
  const { refetch: refetchErp } = useErp();
  const canDecide = can('approvals.decide');

  const list = useList(fetchApprovals, { initial: { status: 'PENDING' } });
  const [actioningId, setActioningId] = useState(null);
  // Rejection needs a typed reason, and Alert.prompt is iOS-only — so the reject
  // path uses an in-screen sheet that behaves the same on both platforms.
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const decide = async (approval, status, remarks) => {
    setActioningId(approval._id);
    try {
      await decideApproval(token, approval._id, {
        status,
        ...(remarks ? { remarks } : {}),
      });
      list.refresh();
      refetchErp();
    } catch (err) {
      Alert.alert(
        status === 'APPROVED' ? 'Could not approve' : 'Could not reject',
        err?.message || 'Something went wrong.',
      );
    } finally {
      setActioningId(null);
    }
  };

  const confirmApprove = (approval) => {
    Alert.alert(
      'Approve this request?',
      `${typeLabel(approval.type)} — ${approval.entityLabel || 'record'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => decide(approval, 'APPROVED') },
      ],
    );
  };

  const openReject = (approval) => {
    setRejectReason('');
    setRejecting(approval);
  };

  const submitReject = async () => {
    const reason = rejectReason.trim();
    // Mirrors the backend rule: remarks are required and must be ≥ 3 chars.
    if (reason.length < 3) return;
    const approval = rejecting;
    setRejecting(null);
    await decide(approval, 'REJECTED', reason);
  };

  return (
    <>
      {renderList()}

      <Modal
        visible={!!rejecting}
        transparent
        animationType="fade"
        onRequestClose={() => setRejecting(null)}
      >
        <View style={styles.modalWrap}>
          <Pressable style={styles.backdrop} onPress={() => setRejecting(null)} />
          <View style={styles.sheet}>
            <AppText variant="h3" weight="extrabold">Reject request</AppText>
            <AppText variant="small" muted style={styles.sheetSub}>
              {rejecting ? typeLabel(rejecting.type) : ''}
              {rejecting?.entityLabel ? ` · ${rejecting.entityLabel}` : ''}
            </AppText>

            <TextField
              label="Reason (required)"
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Why is this being rejected?"
              multiline
              autoFocus
              style={styles.sheetField}
            />

            <View style={styles.sheetActions}>
              <Button
                variant="secondary"
                label="Cancel"
                onPress={() => setRejecting(null)}
                fullWidth={false}
                style={styles.sheetBtn}
              />
              <Button
                variant="danger"
                label="Reject"
                disabled={rejectReason.trim().length < 3}
                onPress={submitReject}
                fullWidth={false}
                style={styles.sheetBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );

  function renderList() {
    return (
      <ListScreen
        title="Approvals"
        subtitle={
          canDecide
            ? (list.meta?.total ? `${list.meta.total} in this view` : undefined)
            : 'Read-only — owner or approver decides'
        }
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        list={list}
        filters={STATUS_FILTERS}
        filterKey="status"
        header={
          !canDecide ? (
            <Card variant="tinted" padding={14} style={styles.roleNote}>
              <AppText variant="caption" weight="medium">
                You can review these, but only an Owner or a designated Approver can
                approve or reject them.
              </AppText>
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <ApprovalCard
            approval={item}
            canDecide={canDecide}
            busy={actioningId === item._id}
            onApprove={() => confirmApprove(item)}
            onReject={() => openReject(item)}
          />
        )}
        empty={{
          icon: 'checkmark-done-outline',
          title: 'Nothing waiting',
          message: 'Requests that breach an org threshold show up here.',
        }}
      />
    );
  }
}

function ApprovalCard({ approval, canDecide, busy, onApprove, onReject }) {
  const pending = approval.status === 'PENDING';
  const requester = [approval.requestedBy?.firstName, approval.requestedBy?.lastName]
    .filter(Boolean).join(' ');

  return (
    <Card padding={16} elevated="sm" style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <AppText variant="bodyStrong" weight="extrabold">{typeLabel(approval.type)}</AppText>
          <AppText variant="caption" muted weight="medium" numberOfLines={1}>
            {approval.entityLabel || approval.entityType || '—'}
            {requester ? ` · ${requester}` : ''}
          </AppText>
        </View>
        <Badge
          tone={pending ? 'pending' : approval.status === 'APPROVED' ? 'valid' : 'expired'}
          label={pending ? 'Pending' : approval.status === 'APPROVED' ? 'Approved' : 'Rejected'}
        />
      </View>

      <ReasonBlock reason={approval.reason} />

      <AppText variant="caption" muted style={styles.when}>
        Raised {approval.createdAt ? dayjs(approval.createdAt).format('DD MMM YYYY') : '—'}
      </AppText>

      {pending && canDecide ? (
        <View style={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            label="Reject"
            onPress={onReject}
            disabled={busy}
            fullWidth={false}
            style={styles.actionBtn}
          />
          <Button
            size="sm"
            label="Approve"
            onPress={onApprove}
            loading={busy}
            fullWidth={false}
            style={styles.actionBtn}
          />
        </View>
      ) : null}
    </Card>
  );
}

/**
 * `reason` is a free-form object per approval type. Rather than dumping JSON at
 * the user, render the money keys as money and the rest as labelled rows.
 */
function ReasonBlock({ reason }) {
  if (!reason || typeof reason !== 'object') return null;
  const entries = Object.entries(reason).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!entries.length) return null;

  const isMoney = (k) => /amount|value|budget|requested|excess|payable|charge|total/i.test(k);

  return (
    <View style={styles.reason}>
      {entries.slice(0, 5).map(([key, value]) => (
        <View key={key} style={styles.reasonRow}>
          <AppText variant="caption" muted weight="medium" style={styles.reasonKey}>
            {key.replace(/([A-Z])/g, ' $1').replace(/^\w/, (c) => c.toUpperCase())}
          </AppText>
          {typeof value === 'number' && isMoney(key) ? (
            <MoneyText amount={value} variant="caption" weight="bold" />
          ) : (
            <AppText variant="caption" weight="bold">{String(value)}</AppText>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  roleNote: { marginBottom: 14 },
  card: { marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  headText: { flex: 1 },
  reason: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 12,
    gap: 7,
  },
  reasonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  reasonKey: { flex: 1 },
  when: { marginTop: 11 },
  actions: {
    flexDirection: 'row', gap: 10, marginTop: 14,
    paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border,
  },
  actionBtn: { flex: 1 },

  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(22,33,31,0.45)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 34,
  },
  sheetSub: { marginTop: 4, marginBottom: 18 },
  sheetField: { marginBottom: 18 },
  sheetActions: { flexDirection: 'row', gap: 10 },
  sheetBtn: { flex: 1 },
});
