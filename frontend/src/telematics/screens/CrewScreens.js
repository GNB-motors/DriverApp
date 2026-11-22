import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Badge, Button, Card, TextField, colors } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useTelematicsApi } from "../context/TelematicsApiContext";
import { useManagerData } from "../context/ManagerDataContext";
import { useDriverData } from "../context/DriverDataContext";
import useOwnerRequest from "../hooks/useOwnerRequest";
import useOwnerWrite from "../hooks/useOwnerWrite";
import { Screen, Choice, RequestState } from "../components/FormControls";

const labels = {
  UNKNOWN: "Driving unconfirmed",
  DRIVING: "Driver confirmed",
  PENDING: "Handover awaiting confirmation",
  DISPUTED: "Handover disputed — driving unconfirmed",
};
const actions = {
  SET_CREW: "Crew updated",
  JOIN: "Crew membership accepted",
  START: "Driving started",
  STOP: "Driving ended",
  PROPOSE: "Handover requested",
  ACCEPT: "Handover accepted",
  REJECT: "Handover disputed",
  CANCEL: "Handover cancelled",
  RESET: "Owner cleared driving state",
};
const stintLabels = {
  CONFIRMED: "Driving confirmed by the crew",
  AGREED: "Both phones named this driver",
  INFERRED: "Named by one phone only",
  DISPUTED: "Phones disagree — owner review needed",
};
const time = (at) =>
  at
    ? `${new Date(at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`
    : "Still active";
const identity = (user) =>
  `${user._id}:${typeof user.orgId === "object" ? user.orgId._id : user.orgId}`;
function confirm(message, action) {
  if (Platform.OS === "web") {
    if (globalThis.confirm(message)) action();
  } else
    Alert.alert("Confirm crew change", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: action },
    ]);
}
function nameFor(data, id) {
  const person = [...(data?.members || []), ...(data?.people || [])].find(
    (row) => String(row._id) === String(id),
  );
  return person
    ? person.name || [person.firstName, person.lastName].filter(Boolean).join(" ")
    : "Former crew member";
}
function Summary({ data }) {
  return (
    <>
      <AppText variant="h3">{data.vehicle.registrationNumber}</AppText>
      <AppText weight="bold">
        {labels[data.status] || "Driving unconfirmed"}
      </AppText>
      {data.currentDriverId && (
        <AppText>At the wheel: {nameFor(data, data.currentDriverId)}</AppText>
      )}
      {data.members.map((member) => (
        <AppText key={member._id}>
          {nameFor(data, member._id)} ·{" "}
          {member.accepted
            ? "Membership accepted"
            : "Invitation awaiting acceptance"}
          {member.status !== "ACTIVE" ? " · Account inactive" : ""}
        </AppText>
      ))}
      {!data.members.length && <AppText muted>No crew assigned.</AppText>}
      {data.pending && (
        <AppText>
          {data.pending.expired
            ? "Handover expired without confirmation."
            : `Waiting for ${nameFor(data, data.pending.targetDriverId)} until ${time(data.pending.expiresAt)}.`}
        </AppText>
      )}
    </>
  );
}
export function DriverCrewCard({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const service = useTelematicsApi();
  const request = useOwnerRequest(
    `${identity(user)}:crew-card`,
    () => service.crewMine(),
    30000,
  );
  return (
    <Card>
      <AppText variant="h3">Crew & driving</AppText>
      <RequestState request={request} />
      {request.data ? (
        <>
          <View style={styles.driverSummary}>
            <AppText variant="h3" mono numberOfLines={1}>
              {request.data.vehicle.registrationNumber}
            </AppText>
            <Badge
              tone={
                request.data.status === "DRIVING"
                  ? "onDuty"
                  : request.data.status === "PENDING"
                    ? "pending"
                    : request.data.status === "DISPUTED"
                      ? "expired"
                      : "neutral"
              }
              label={labels[request.data.status] || labels.UNKNOWN}
              dot
            />
          </View>
          {request.data.currentDriverId ? (
            <AppText>
              At the wheel: {nameFor(request.data, request.data.currentDriverId)}
            </AppText>
          ) : null}
          {!request.data.members.length ? (
            <AppText muted>No crew assigned.</AppText>
          ) : null}
          {request.data.members.some(
            (member) => !member.accepted || member.status !== "ACTIVE",
          ) ? (
            <AppText color={colors.warning}>
              {t("roleDesign", "crewMembershipNeedsAttention")}
            </AppText>
          ) : null}
          {request.data.pending ? (
            <AppText color={colors.warning}>
              {request.data.pending.expired
                ? "Handover expired without confirmation."
                : `Waiting for ${nameFor(request.data, request.data.pending.targetDriverId)} until ${time(request.data.pending.expiresAt)}.`}
            </AppText>
          ) : null}
        </>
      ) : (
        !request.loading &&
        !request.error && (
          <AppText muted>Ask your owner to assign your truck crew.</AppText>
        )
      )}
      <Button
        label="Open crew & handover"
        variant="secondary"
        onPress={() => navigation.navigate("Crew & driving")}
      />
    </Card>
  );
}
const styles = {
  driverSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
};
export function VehicleCrewCard({ navigation, vehicleId }) {
  const { user } = useAuth();
  const { branchId } = useManagerData();
  const service = useTelematicsApi();
  const branch = branchId === "all" ? undefined : branchId;
  const request = useOwnerRequest(
    `${identity(user)}:${branch || "all"}:crew-card:${vehicleId}`,
    () => service.crewVehicle(vehicleId, branch),
    30000,
  );
  return (
    <Card>
      <AppText variant="h3">Crew & driving</AppText>
      <RequestState request={request} />
      {request.data && <Summary data={request.data} />}
      <Button
        label="Crew and driving timeline"
        variant="secondary"
        onPress={() => navigation.navigate("Crew & driving", { vehicleId })}
      />
    </Card>
  );
}
export function DriverCrewScreen({ navigation }) {
  const driverCtx = useDriverData();
  return <CrewScreen navigation={navigation} driver driverData={driverCtx?.data} />;
}
export function FleetCrewScreen({ navigation, route }) {
  const { branchId, data, loading, error, refresh } = useManagerData();
  if (!route.params?.vehicleId) {
    return <Screen navigation={navigation} title="Crew & driving">
      {loading ? <AppText muted>Loading trucks…</AppText> : null}
      {error ? <><AppText color={colors.error}>{error}</AppText><Button label="Retry" onPress={refresh} /></> : null}
      {data?.errors?.vehicles ? <><AppText color={colors.error}>{data.errors.vehicles}</AppText><Button label="Retry" onPress={refresh} /></> : null}
      {!loading && !error && !data?.errors?.vehicles && data?.vehicles?.length === 0 ? <AppText muted>No trucks in this branch.</AppText> : null}
      {(data?.vehicles || []).map(vehicle => <Button key={vehicle.id} label={vehicle.plate || vehicle.registrationNumber || "Truck"} variant="secondary" onPress={() => navigation.push('Crew & driving', { vehicleId: vehicle.id })} />)}
    </Screen>;
  }
  return (
    <CrewScreen
      navigation={navigation}
      vehicleId={route.params?.vehicleId}
      branch={branchId === "all" ? undefined : branchId}
    />
  );
}
function CrewScreen({ navigation, driver = false, vehicleId, branch, driverData }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const service = useTelematicsApi();
  const owner = !driver && user.role === "OWNER";
  const key = `${identity(user)}:${branch || "all"}:crew:${vehicleId || "mine"}`;
  const request = useOwnerRequest(
    key,
    () => (driver ? service.crewMine() : service.crewVehicle(vehicleId, branch)),
    15000,
  );
  const data = request.data;
  const truckId = data?.vehicle._id;
  const write = useOwnerWrite(`${key}:${truckId || "none"}:action`);
  const [note, setNote] = useState("");
  const [target, setTarget] = useState("");
  const [slot1, setSlot1] = useState("");
  const [slot2, setSlot2] = useState("");
  const [safe, setSafe] = useState(false);
  const [notice, setNotice] = useState("");
  const roster = useOwnerRequest(
    `${key}:candidates:${truckId || "none"}:${data?.vehicle.branchId || "none"}`,
    () =>
      owner && data
        ? service.ownerAudience(
            { driverOnly: true },
            data.vehicle.branchId || undefined,
          )
        : Promise.resolve({ items: [] }),
  );
  useEffect(() => {
    setNote("");
    setTarget("");
    setSafe(false);
    setNotice("");
  }, [key, truckId]);
  const memberIdsKey = (data?.members || []).map((row) => row._id).join(",");
  useEffect(() => {
    const ids = memberIdsKey.split(",");
    setSlot1(ids[0] || "");
    setSlot2(ids[1] || "");
  }, [key, truckId, data?.version, memberIdsKey]);
  const candidates = (roster.data?.items || []).filter(
    (row) =>
      String(row.branchId || "") === String(data?.vehicle.branchId || ""),
  );
  const locked =
    !write.ready || write.busy || request.loading || !!request.error;
  const member = data?.members.find(
    (row) => String(row._id) === String(user._id),
  );
  const pending =
    data?.pending && !data.pending.expired ? data.pending : null;
  async function act(action, extra = {}) {
    if (!data || (!write.draft && driver && !safe)) return;
    // "Safely stopped" is confirmed on this screen; the action contract has no field for it.
    const result = await write.execute(
      {
        action,
        ...(note.trim() && { note: note.trim() }),
        ...extra,
      },
      (body) => service.crewAction(truckId, body, branch),
    );
    if (result) {
      setNote("");
      setSafe(false);
      setNotice(actions[result.applied?.action] || "Action saved.");
    }
    request.reload();
  }
  if (driver) {
    const vehicleReg =
      data?.vehicle?.registrationNumber ||
      data?.vehicle?.plate ||
      driverData?.vehicle?.registrationNumber ||
      driverData?.vehicle?.plate ||
      "AS15AC6474";
    const currentStatus = data?.status || "UNKNOWN";
    const statusTitle = labels[currentStatus] || "Driving unconfirmed";
    const hasMembers = Boolean(data?.members && data.members.length > 0);
    const crewSubtitle = hasMembers
      ? data.currentDriverId
        ? `At the wheel: ${nameFor(data, data.currentDriverId)}`
        : data.members.map((m) => nameFor(data, m._id)).join(", ")
      : "No crew assigned.";
    const isDriving =
      currentStatus === "DRIVING" &&
      String(data?.currentDriverId) === String(user?._id);

    return (
      <View style={driverStyles.screenContainer}>
        <View style={[driverStyles.headerContainer, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"))}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={driverStyles.headerBackBtn}
          >
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </Pressable>
          <AppText style={driverStyles.headerTitleText}>Crew & driving</AppText>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={[
            driverStyles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
        >
          {request.loading && !data ? <AppText muted style={{ marginBottom: 12 }}>Loading crew status…</AppText> : null}
          {request.error ? (
            <View style={{ marginBottom: 12 }}>
              <AppText color={colors.error}>{request.error}</AppText>
              <Button label="Retry" variant="secondary" onPress={request.reload} style={{ marginTop: 6 }} />
            </View>
          ) : null}

          {/* Top Amber Status Card */}
          <View style={driverStyles.topAmberCard}>
            <View style={driverStyles.amberIconCircle}>
              <Ionicons name="alert-circle-outline" size={32} color="#92400E" />
            </View>
            <AppText style={driverStyles.drivingStatusTitle}>
              {statusTitle}
            </AppText>
            <View style={driverStyles.plateBadge}>
              <AppText style={driverStyles.plateBadgeText}>
                {vehicleReg}
              </AppText>
            </View>
            <AppText style={driverStyles.crewSubtitleText}>
              {crewSubtitle}
            </AppText>
          </View>

          {notice ? (
            <AppText style={{ color: colors.primary, textAlign: "center", marginBottom: 12, fontWeight: "600" }}>
              {notice}
            </AppText>
          ) : null}
          {write.error ? (
            <AppText color={colors.error} style={{ textAlign: "center", marginBottom: 12 }}>
              {write.error}
            </AppText>
          ) : null}

          {/* Offline Draft Retry */}
          {write.draft ? (
            <View style={{ marginBottom: 14 }}>
              <Button
                label="Retry saved crew action"
                disabled={!write.ready || !safe}
                loading={write.busy}
                onPress={() => act(write.draft.action)}
              />
            </View>
          ) : null}

          {/* Invitation Accept button if driver is member but not accepted */}
          {member && !member.accepted && (
            <View style={{ marginBottom: 14 }}>
              <Button
                label="Accept crew membership"
                disabled={locked || !safe}
                onPress={() => act("JOIN")}
              />
            </View>
          )}

          {/* Step 1 Card */}
          <View style={driverStyles.stepCard}>
            <View style={driverStyles.step1Badge}>
              <AppText style={driverStyles.step1BadgeText}>1</AppText>
            </View>
            <AppText style={driverStyles.stepText}>
              I am safely stopped and can confirm this action.
            </AppText>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: safe }}
              onPress={() => setSafe(!safe)}
              disabled={write.busy}
              style={[driverStyles.checkbox, safe && driverStyles.checkboxChecked]}
            >
              {safe ? <Ionicons name="checkmark" size={24} color="#FFFFFF" /> : null}
            </Pressable>
          </View>

          {/* Step 2 Card */}
          <View style={driverStyles.stepCardColumn}>
            <View style={driverStyles.step2Header}>
              <View style={driverStyles.step2Badge}>
                <AppText style={driverStyles.step2BadgeText}>2</AppText>
              </View>
              <AppText style={driverStyles.step2Title}>Confirm your action</AppText>
            </View>
            <View style={driverStyles.actionBtnRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Driving"
                disabled={locked}
                onPress={() => {
                  if (!safe) {
                    Alert.alert(
                      "Safety check",
                      "Please confirm you are safely stopped before confirming this action."
                    );
                    return;
                  }
                  if (!truckId) {
                    Alert.alert(
                      "No truck crew",
                      "No crew assigned yet. Ask your manager to assign you to a truck crew."
                    );
                    return;
                  }
                  act("START");
                }}
                style={[
                  driverStyles.actionBtn,
                  isDriving && driverStyles.actionBtnActive,
                ]}
              >
                <AppText
                  style={[
                    driverStyles.actionBtnText,
                    isDriving && driverStyles.actionBtnTextActive,
                  ]}
                >
                  Driving
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Stopped"
                disabled={locked}
                onPress={() => {
                  if (!safe) {
                    Alert.alert(
                      "Safety check",
                      "Please confirm you are safely stopped before confirming this action."
                    );
                    return;
                  }
                  if (!truckId) {
                    Alert.alert(
                      "No truck crew",
                      "No crew assigned yet. Ask your manager to assign you to a truck crew."
                    );
                    return;
                  }
                  act("STOP");
                }}
                style={driverStyles.actionBtn}
              >
                <AppText style={driverStyles.actionBtnText}>
                  Stopped
                </AppText>
              </Pressable>
            </View>
          </View>

          {/* Pending Handover Proposal */}
          {pending && String(pending.targetDriverId) === String(user._id) && (
            <Card style={{ marginBottom: 16 }}>
              <AppText weight="bold">
                {nameFor(data, pending.fromDriverId)} asks you to take over driving.
              </AppText>
              <Button
                label="Confirm I am taking over"
                disabled={locked || !safe}
                onPress={() => act("ACCEPT", { proposalId: pending.id })}
                style={{ marginTop: 8 }}
              />
              <TextField
                label="Reason if you disagree"
                value={note}
                onChangeText={setNote}
                maxLength={1000}
                editable={!locked}
                multiline
              />
              <Button
                label="Dispute handover"
                variant="danger"
                disabled={locked || !safe || !note.trim()}
                onPress={() => act("REJECT", { proposalId: pending.id })}
              />
            </Card>
          )}

          {/* Timeline Section */}
          <AppText style={driverStyles.timelineSectionHeader}>Driving timeline</AppText>
          {!data?.intervals?.length ? (
            <View style={driverStyles.emptyTimelineRow}>
              <View style={driverStyles.timelineIndicatorCol}>
                <View style={driverStyles.timelineEmptyNode} />
                <View style={driverStyles.timelineVerticalLine} />
              </View>
              <AppText style={driverStyles.emptyTimelineText}>
                No driving intervals recorded yet.
              </AppText>
            </View>
          ) : (
            <View style={{ marginTop: 4 }}>
              {data.intervals.map((row, idx) => (
                <View key={row._id} style={driverStyles.timelineItemRow}>
                  <View style={driverStyles.timelineIndicatorCol}>
                    <View
                      style={[
                        driverStyles.timelineNodeDot,
                        {
                          backgroundColor: row.endAt ? "#94A3B8" : "#2563EB",
                          borderColor: row.endAt ? "#94A3B8" : "#2563EB",
                        },
                      ]}
                    />
                    {idx < data.intervals.length - 1 && (
                      <View style={driverStyles.timelineConnectingTrack} />
                    )}
                  </View>
                  <Card style={driverStyles.intervalItemCard}>
                    <AppText weight="bold">{nameFor(data, row.driverId)}</AppText>
                    <AppText style={driverStyles.intervalTimeText}>
                      {time(row.startAt)} →{" "}
                      {row.endAt
                        ? time(row.endAt)
                        : String(data.currentDriverId) === String(row.driverId)
                        ? "Active"
                        : "Unconfirmed — owner review needed"}
                    </AppText>
                    <AppText variant="caption" muted style={{ marginTop: 4 }}>
                      {stintLabels[row.status] || "Unconfirmed"}
                    </AppText>
                  </Card>
                </View>
              ))}
            </View>
          )}

          {/* Footer note */}
          <View style={driverStyles.footerNote}>
            <Ionicons
              name="information-circle-outline"
              size={15}
              color="#64748B"
              style={{ marginTop: 2 }}
            />
            <AppText style={driverStyles.footerNoteText}>
              Driving confirmations are crew statements, separate from truck pairing. Actions take effect when confirmed online; waiting time stays unconfirmed.
            </AppText>
          </View>
        </ScrollView>
      </View>
    );
  }
  return (
    <Screen navigation={navigation} title="Crew & driving">
      <AppText muted>
        Driving confirmations are crew statements, separate from truck pairing.
        Actions take effect when confirmed online; waiting time stays
        unconfirmed.
      </AppText>
      <RequestState request={request} />
      {!data && !request.loading && !request.error && (
        <AppText>
          No crew invitation yet. Ask your owner to assign you to a crew.
        </AppText>
      )}
      {data && (
        <>
          <Card>
            <Summary data={data} />
          </Card>
          {notice ? <AppText>{notice}</AppText> : null}
          {driver && (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: safe }}
              onPress={() => setSafe(!safe)}
              disabled={write.busy}
              style={{ paddingVertical: 12 }}
            >
              <AppText>
                {safe ? "☑" : "☐"} I am safely stopped and can confirm this
                action.
              </AppText>
            </Pressable>
          )}
          {write.draft ? (
            <Button
              label="Retry saved crew action"
              disabled={!write.ready || (driver && !safe)}
              loading={write.busy}
              onPress={() => act(write.draft.action)}
            />
          ) : (
            <>
              {driver && member && (
                <>
                  {!member.accepted ? (
                    <Button
                      label="Accept crew membership"
                      disabled={locked || !safe}
                      onPress={() => act("JOIN")}
                    />
                  ) : (
                    <>
                      {data.status === "UNKNOWN" &&
                        !pending && (
                          <Button
                            label="I am starting driving"
                            disabled={locked || !safe}
                            onPress={() => act("START")}
                          />
                        )}
                      {String(data.currentDriverId) === String(user._id) && (
                        <>
                          <Button
                            label="End my driving"
                            variant="secondary"
                            disabled={locked || !safe}
                            onPress={() => act("STOP")}
                          />
                          <Choice
                            label="Hand over driving to"
                            value={target}
                            onChange={setTarget}
                            disabled={locked}
                            options={data.members
                              .filter(
                                (row) =>
                                  row.accepted &&
                                  row.status === "ACTIVE" &&
                                  String(row._id) !== String(user._id),
                              )
                              .map((row) => [row._id, nameFor(data, row._id)])}
                          />
                          <Button
                            label="Request driving handover"
                            disabled={locked || !safe || !target}
                            onPress={() =>
                              act("PROPOSE", { targetDriverId: target })
                            }
                          />
                        </>
                      )}
                      {pending &&
                        String(pending.targetDriverId) === String(user._id) && (
                          <Card>
                            <AppText>
                              {nameFor(data, pending.fromDriverId)} asks you to
                              take over driving.
                            </AppText>
                            <Button
                              label="Confirm I am taking over"
                              disabled={locked || !safe}
                              onPress={() =>
                                act("ACCEPT", { proposalId: pending.id })
                              }
                            />
                            <TextField
                              label="Reason if you disagree"
                              value={note}
                              onChangeText={setNote}
                              maxLength={1000}
                              editable={!locked}
                              multiline
                            />
                            <Button
                              label="Dispute handover"
                              variant="danger"
                              disabled={locked || !safe || !note.trim()}
                              onPress={() =>
                                act("REJECT", { proposalId: pending.id })
                              }
                            />
                          </Card>
                        )}
                      {pending &&
                        String(pending.fromDriverId) === String(user._id) && (
                          <Button
                            label="Cancel handover request"
                            variant="secondary"
                            disabled={locked || !safe}
                            onPress={() =>
                              act("CANCEL", { proposalId: pending.id })
                            }
                          />
                        )}
                      {data.status === "DISPUTED" && (
                        <AppText>
                          Ask your owner to review the disagreement. No driver
                          is confirmed until it is cleared and driving is
                          started again.
                        </AppText>
                      )}
                    </>
                  )}
                </>
              )}
              {owner && (
                <>
                  <Card>
                    <AppText variant="h3">Assign truck crew</AppText>
                    <RequestState request={roster} />
                    <AppText muted>
                      Changing crew ends any active driving interval. New
                      members must accept before driving can be confirmed.
                    </AppText>
                    <Choice
                      label="Crew member 1"
                      value={slot1}
                      onChange={setSlot1}
                      disabled={locked}
                      options={candidates.map((row) => [
                        row._id,
                        [row.firstName, row.lastName].filter(Boolean).join(" "),
                      ])}
                    />
                    <Choice
                      label="Crew member 2 (optional)"
                      value={slot2}
                      onChange={setSlot2}
                      disabled={locked}
                      options={(roster.data?.items || [])
                        .filter((row) => row._id !== slot1)
                        .map((row) => [
                          row._id,
                          [row.firstName, row.lastName]
                            .filter(Boolean)
                            .join(" "),
                        ])}
                    />
                    <Button
                      label={slot1 || slot2 ? "Save crew" : "Remove crew"}
                      disabled={
                        locked ||
                        roster.loading ||
                        !!roster.error ||
                        (!!slot1 && slot1 === slot2)
                      }
                      onPress={() =>
                        confirm(
                          "Update this truck's crew? Current driving ends and any pending handover is cancelled.",
                          () =>
                            act("SET_CREW", {
                              memberIds: [slot1, slot2].filter(Boolean),
                            }),
                        )
                      }
                    />
                  </Card>
                  <TextField
                    label="Reason to clear driving state"
                    value={note}
                    onChangeText={setNote}
                    maxLength={1000}
                    multiline
                    editable={!locked}
                  />
                  <Button
                    label="Clear driving state for fresh confirmation"
                    variant="secondary"
                    disabled={locked || !note.trim()}
                    onPress={() =>
                      confirm(
                        "Driving will become unconfirmed. A crew member must explicitly start driving again.",
                        () => act("RESET"),
                      )
                    }
                  />
                </>
              )}
            </>
          )}
          <AppText variant="h3">Driving timeline</AppText>
          {!data.intervals.length && (
            <AppText muted>No driving intervals recorded yet.</AppText>
          )}
          {data.intervals.map((row) => (
            <Card key={row._id}>
              <AppText weight="bold">{nameFor(data, row.driverId)}</AppText>
              <AppText>
                {time(row.startAt)} →{" "}
                {row.endAt
                  ? time(row.endAt)
                  : String(data.currentDriverId) === String(row.driverId)
                    ? "Active"
                    : "Unconfirmed — owner review needed"}
              </AppText>
              <AppText muted>
                {stintLabels[row.status] || "Unconfirmed"}
              </AppText>
            </Card>
          ))}
        </>
      )}
      {write.error ? (
        <AppText color={colors.error}>{write.error}</AppText>
      ) : null}
    </Screen>
  );
}

const driverStyles = {
  screenContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#F8FAFC",
  },
  headerBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginLeft: 14,
  },
  scrollContent: {
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topAmberCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  amberIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  drivingStatusTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#451A03",
    marginBottom: 12,
    textAlign: "center",
  },
  plateBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#0F172A",
    paddingVertical: 5,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  plateBadgeText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 2.5,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  crewSubtitleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
    textAlign: "center",
  },
  stepCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  step1Badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  step1BadgeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginHorizontal: 12,
    lineHeight: 20,
  },
  checkbox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#2563EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2563EB",
  },
  stepCardColumn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 20,
  },
  step2Header: {
    flexDirection: "row",
    alignItems: "center",
  },
  step2Badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  step2BadgeText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "700",
  },
  step2Title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 12,
  },
  actionBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCE4EE",
  },
  actionBtnActive: {
    backgroundColor: "#2563EB",
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },
  actionBtnTextActive: {
    color: "#FFFFFF",
  },
  timelineSectionHeader: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 8,
    marginBottom: 14,
  },
  emptyTimelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineIndicatorCol: {
    alignItems: "center",
    width: 20,
    marginRight: 12,
  },
  timelineEmptyNode: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#94A3B8",
    backgroundColor: "transparent",
  },
  timelineVerticalLine: {
    width: 2,
    height: 34,
    backgroundColor: "#CBD5E1",
    marginTop: 4,
  },
  emptyTimelineText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 0,
  },
  timelineItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  timelineNodeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
  },
  timelineConnectingTrack: {
    width: 2,
    flex: 1,
    backgroundColor: "#CBD5E1",
    marginTop: 4,
    minHeight: 40,
  },
  intervalItemCard: {
    flex: 1,
    padding: 12,
  },
  intervalTimeText: {
    fontSize: 13,
    color: "#475569",
    marginTop: 2,
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 36,
    marginBottom: 24,
    paddingHorizontal: 2,
  },
  footerNoteText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
    flex: 1,
  },
};
