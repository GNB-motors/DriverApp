import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable } from "react-native";
import { AppText, Button, Card, TextField, colors } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useTelematicsApi } from "../context/TelematicsApiContext";
import { useManagerData } from "../context/ManagerDataContext";
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
  const person = [...(data.members || []), ...(data.people || [])].find(
    (row) => String(row._id) === String(id),
  );
  return person
    ? [person.firstName, person.lastName].filter(Boolean).join(" ")
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
      {data.requiresOwnerReview && (
        <AppText>
          Owner review needed: crew membership or account access changed.
        </AppText>
      )}
      {data.pending && (
        <AppText>
          {data.pending.invalidated
            ? "Handover unavailable because crew membership changed."
            : data.pending.expired
              ? "Handover expired without confirmation."
              : `Waiting for ${nameFor(data, data.pending.targetDriverId)} until ${time(data.pending.expiresAt)}.`}
        </AppText>
      )}
    </>
  );
}
export function DriverCrewCard({ navigation }) {
  const { user } = useAuth();
  const service = useTelematicsApi();
  const request = useOwnerRequest(
    `${identity(user)}:crew-card`,
    () => service.crewMe(1),
    30000,
  );
  return (
    <Card>
      <AppText variant="h3">Crew & driving</AppText>
      <RequestState request={request} />
      {request.data ? (
        <Summary data={request.data} />
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
export function VehicleCrewCard({ navigation, vehicleId }) {
  const { user } = useAuth();
  const { branchId } = useManagerData();
  const service = useTelematicsApi();
  const branch = branchId === "all" ? undefined : branchId;
  const request = useOwnerRequest(
    `${identity(user)}:${branch || "all"}:crew-card:${vehicleId}`,
    () => service.crewVehicle(vehicleId, 1, branch),
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
  return <CrewScreen navigation={navigation} driver />;
}
export function FleetCrewScreen({ navigation, route }) {
  const { branchId } = useManagerData();
  return (
    <CrewScreen
      navigation={navigation}
      vehicleId={route.params?.vehicleId}
      branch={branchId === "all" ? undefined : branchId}
    />
  );
}
function CrewScreen({ navigation, driver = false, vehicleId, branch }) {
  const { user } = useAuth();
  const service = useTelematicsApi();
  const owner = !driver && user.role === "OWNER";
  const key = `${identity(user)}:${branch || "all"}:crew:${vehicleId || "mine"}`;
  const [page, setPage] = useState(1);
  const request = useOwnerRequest(
    `${key}:${page}`,
    () =>
      driver
        ? service.crewMe(page)
        : service.crewVehicle(vehicleId, page, branch),
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
    setPage(1);
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
    data?.pending && !data.pending.expired && !data.pending.invalidated
      ? data.pending
      : null;
  async function act(action, extra = {}) {
    if (!data || (!write.draft && driver && !safe)) return;
    const result = await write.execute(
      {
        action,
        expectedVersion: data.version,
        ...(driver && { safelyStopped: true }),
        ...(note.trim() && { note: note.trim() }),
        ...extra,
      },
      (body) => service.crewAction(truckId, body, branch),
    );
    if (result) {
      setNote("");
      setSafe(false);
      setNotice(
        result.warning || actions[result.record.action] || "Action saved.",
      );
    }
    request.reload();
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
                        !pending &&
                        !data.requiresOwnerReview && (
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
            <AppText muted>
              No confirmed driving intervals on this page.
            </AppText>
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
                {row.confirmedBy.length > 1
                  ? "Handover confirmed by both drivers"
                  : "Driving declared by this driver"}
              </AppText>
            </Card>
          ))}
          <AppText variant="h3">Crew and handover history</AppText>
          {data.events.map((event) => (
            <Card key={event._id}>
              <AppText>
                {actions[event.action] || event.action} ·{" "}
                {nameFor(data, event.actorId)}
              </AppText>
              <AppText muted>{time(event.at)}</AppText>
              {event.data?.note ? <AppText>{event.data.note}</AppText> : null}
            </Card>
          ))}
          <Button
            label="Newer history"
            variant="secondary"
            disabled={page === 1}
            onPress={() => setPage(page - 1)}
          />
          <Button
            label="Earlier history"
            variant="secondary"
            disabled={
              page * 30 >= Math.max(data.intervalTotal, data.eventTotal)
            }
            onPress={() => setPage(page + 1)}
          />
        </>
      )}
      {write.error ? (
        <AppText color={colors.error}>{write.error}</AppText>
      ) : null}
    </Screen>
  );
}
