import React, { useEffect, useState } from "react";
import { AppText, Button, Card, TextField, colors } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useManagerData } from "../context/ManagerDataContext";
import { useTelematicsApi } from "../context/TelematicsApiContext";
import { Screen, Choice, RequestState } from "../components/FormControls";
import useOwnerRequest from "../hooks/useOwnerRequest";
import useOwnerWrite from "../hooks/useOwnerWrite";

export function OwnerCrews({ navigation }) {
  const { user } = useAuth();
  const { branchId } = useManagerData();
  const service = useTelematicsApi();
  const branch = branchId === "all" ? undefined : branchId;
  const key = `${user._id}:${user.orgId?._id || user.orgId}:${branch || "all"}`;
  const board = useOwnerRequest(`${key}:crews`, () =>
    service.ownerCrews(branch),
  );
  const [vehicleId, setVehicleId] = useState("");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [note, setNote] = useState("");
  const [maxDriving, setMaxDriving] = useState("");
  const [minRest, setMinRest] = useState("");
  const [policyBusy, setPolicyBusy] = useState(false);
  const [message, setMessage] = useState("");
  const write = useOwnerWrite(`${key}:crew:${vehicleId}`);
  useEffect(() => {
    setVehicleId("");
    setMessage("");
    setMaxDriving("");
    setMinRest("");
  }, [key]);
  const crew = board.data?.crews.find((c) => String(c.vehicleId) === vehicleId);
  useEffect(() => {
    setFirst(crew?.members[0] || "");
    setSecond(crew?.members[1] || "");
    setNote("");
  }, [vehicleId, crew?._id, crew?.version]);
  useEffect(() => {
    setMaxDriving(board.data?.policy?.maxDrivingMinutes?.toString() || "");
    setMinRest(board.data?.policy?.minRestMinutes?.toString() || "");
  }, [board.data?.policy?._id, board.data?.policy?.updatedAt]);
  async function save() {
    setMessage("");
    const members = [first, second].filter(Boolean);
    if (!write.draft && new Set(members).size !== members.length) {
      setMessage("Select each driver once.");
      return;
    }
    const result = await write.execute(
      { expectedVersion: crew?.version || 0, members, note },
      (body) => service.ownerAssignCrew(vehicleId, body, branch),
    );
    if (result) {
      setMessage("Crew saved. Previous active declarations were closed.");
      board.reload();
    }
  }
  return (
    <Screen navigation={navigation} title="Crews and declared duty">
      <RequestState request={board} />
      <AppText muted>
        Assign up to two active drivers from the truck's branch. Crew assignment
        is separate from phone/truck pairing. Changing a crew closes its active
        declarations and records your reason.
      </AppText>
      <Choice
        label="Truck"
        value={vehicleId}
        onChange={setVehicleId}
        disabled={write.busy || !!write.draft}
        options={(board.data?.vehicles || []).map((v) => [
          v._id,
          v.registrationNumber,
        ])}
      />
      {vehicleId ? (
        <>
          <Choice
            label="First driver"
            value={first}
            onChange={setFirst}
            disabled={write.busy || !!write.draft}
            options={[
              ["", "None"],
              ...(board.data?.drivers || []).map((d) => [
                d._id,
                `${d.firstName} ${d.lastName || ""}`,
              ]),
            ]}
          />
          <Choice
            label="Second driver"
            value={second}
            onChange={setSecond}
            disabled={write.busy || !!write.draft}
            options={[
              ["", "None"],
              ...(board.data?.drivers || []).map((d) => [
                d._id,
                `${d.firstName} ${d.lastName || ""}`,
              ]),
            ]}
          />
          <TextField
            label="Reason for crew change"
            value={note}
            onChangeText={setNote}
            editable={!write.busy && !write.draft}
          />
          <Button
            label={write.draft ? "Retry saved crew change" : "Save crew"}
            disabled={!write.ready || (!write.draft && !note.trim())}
            loading={write.busy}
            onPress={save}
          />
        </>
      ) : null}
      {board.data?.active.map((s) => (
        <Card key={s._id}>
          <AppText>
            {board.data.drivers.find((d) => d._id === s.driverId)?.firstName ||
              "Driver"}{" "}
            ·{" "}
            {board.data.vehicles.find((v) => v._id === s.vehicleId)
              ?.registrationNumber || "Truck"}
          </AppText>
          <AppText>
            Declared {s.state.replace("_", " ")} since{" "}
            {new Date(s.startedAt).toLocaleString()}
          </AppText>
        </Card>
      ))}
      <Card>
        <AppText variant="h3">Company daily comparison policy</AppText>
        <AppText muted>
          These thresholds compare recorded declarations. They do not establish
          statutory compliance or verified rest. Blank values disable that
          comparison for the selected report scope.
        </AppText>
        <TextField
          label="Maximum declared driving minutes per day"
          value={maxDriving}
          onChangeText={setMaxDriving}
          keyboardType="numeric"
        />
        <TextField
          label="Minimum recorded rest minutes per day"
          value={minRest}
          onChangeText={setMinRest}
          keyboardType="numeric"
        />
        <Button
          label="Save company thresholds"
          loading={policyBusy}
          disabled={!board.data}
          onPress={async () => {
            setMessage("");
            setPolicyBusy(true);
            try {
              const parse = (value) => (value.trim() ? Number(value) : null);
              const max = parse(maxDriving),
                min = parse(minRest);
              if (
                [max, min].some(
                  (v) =>
                    v !== null && (!Number.isFinite(v) || v < 1 || v > 1440),
                )
              )
                throw new Error(
                  "Use minutes between 1 and 1440, or leave blank.",
                );
              await service.ownerCrewPolicy(
                { maxDrivingMinutes: max, minRestMinutes: min },
                branch,
              );
              setMessage("Company thresholds saved.");
              board.reload();
            } catch (error) {
              setMessage(error.message);
            } finally {
              setPolicyBusy(false);
            }
          }}
        />
      </Card>
      {write.error || message ? (
        <AppText color={write.error ? colors.error : undefined}>
          {write.error || message}
        </AppText>
      ) : null}
      <Button label="Refresh" variant="secondary" onPress={board.reload} />
    </Screen>
  );
}
export function DriverCrewDuty({ navigation }) {
  const { user } = useAuth();
  const service = useTelematicsApi();
  const key = `${user._id}:${user.orgId?._id || user.orgId}`;
  const request = useOwnerRequest(
    `${key}:crew-duty`,
    () => service.myCrew(),
    30000,
  );
  const write = useOwnerWrite(`${key}:crew-declaration`);
  const [message, setMessage] = useState("");
  async function declare(state) {
    setMessage("");
    const result = await write.execute(
      {
        state,
        crewVersion: request.data?.crew?.version,
        expectedStintId: request.data?.active?._id || null,
      },
      (body) => service.crewDeclaration(body),
    );
    if (result) {
      setMessage("Duty declaration recorded.");
      request.reload();
    }
  }
  return (
    <Screen navigation={navigation} title="Crew duty">
      <RequestState request={request} />
      <AppText muted>
        Only record a change while safely parked. This is your declaration of
        driving, rest or off duty. Your crew mate must end their driving
        declaration before you take over.
      </AppText>
      {request.data && (
        <>
          {request.data.crew ? (
            <>
              <AppText variant="h3">
                {request.data.crew.vehicle.registrationNumber}
              </AppText>
              <AppText>
                Crew:{" "}
                {request.data.crew.members.map((m) => m.firstName).join(", ")}
              </AppText>
              <AppText>
                Current declaration: {request.data.active?.state || "None"}
              </AppText>
              {request.data.active && (
                <AppText>
                  Since{" "}
                  {new Date(request.data.active.startedAt).toLocaleString()}
                </AppText>
              )}
              {["DRIVING", "REST", "OFF_DUTY"].map((state) => (
                <Button
                  key={state}
                  label={`Declare ${state.toLowerCase().replace("_", " ")}`}
                  disabled={!write.ready || !!write.draft || write.busy}
                  onPress={() => declare(state)}
                />
              ))}
            </>
          ) : (
            <AppText>No active crew is assigned. Contact your owner.</AppText>
          )}
        </>
      )}
      {write.draft && (
        <Button
          label="Retry saved duty declaration"
          disabled={!write.ready}
          loading={write.busy}
          onPress={() => declare(write.draft.state)}
        />
      )}
      {write.error || message ? (
        <AppText>{write.error || message}</AppText>
      ) : null}
      <Button label="Refresh" variant="secondary" onPress={request.reload} />
    </Screen>
  );
}
