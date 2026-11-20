import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Picker from "../../components/ui/SelectField";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { AppText, Button, Card, TextField, colors } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useManagerData } from "../context/ManagerDataContext";
import { ManagerPage } from "../screens/ManagerScreens";
import { MenuRow } from "../screens/DriverScreens";
import DateField from "./DateField";
import { FileLink } from "./OperationalScreens";
import { formatLitres } from "../../utils/format";
const permittedBranch = (branchId) =>
  branchId === "all" ? undefined : branchId;
export function DriverRoster({ navigation, route = {} }) {
  const { service, branchId, data } = useManagerData();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const vehicleId = route?.params?.vehicleId;
  const plate = route?.params?.plate;
  const [activeFilterPlate, setActiveFilterPlate] = useState(plate || null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setResult(null);
      setError("");
      service
        .fleetWorkflow("drivers", page, permittedBranch(branchId))
        .then((value) => {
          if (active) setResult(value);
        })
        .catch((failure) => {
          if (active) setError(failure.message);
        });
      return () => {
        active = false;
      };
    }, [service, branchId, page, revision])
  );

  // Match drivers with real-time vehicles data for live duty/motion status (M06)
  const itemsWithTelemetry = (result?.items || []).map((driver) => {
    const name = [driver.firstName, driver.lastName].filter(Boolean).join(" ") || driver.mobileNumber || "Driver";
    const initials = name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const vehicleId = driver.assignment?.vehicleId;
    const vehicle = (data?.vehicles || []).find(
      (v) => String(v.id) === String(vehicleId) || String(v._id) === String(vehicleId)
    );

    // Compute duty/driving/rest/plant status (M06)
    let status = "UNASSIGNED";
    let statusLabel = "Unassigned";
    let statusColor = colors.textMuted;
    let statusBg = colors.background;

    if (vehicle) {
      if (vehicle.status === "moving") {
        status = "DRIVING";
        statusLabel = "Driving";
        statusColor = colors.success;
        statusBg = colors.validBg;
      } else if (vehicle.status === "idling") {
        status = "IDLING";
        statusLabel = "Idling";
        statusColor = colors.warning;
        statusBg = colors.pendingBg;
      } else if (vehicle.siteName) {
        status = "AT_PLANT";
        statusLabel = "At Plant";
        statusColor = colors.primaryDeep;
        statusBg = colors.tealTint;
      } else {
        status = "RESTING";
        statusLabel = "Resting";
        statusColor = "#D97706";
        statusBg = "#FEF3C7";
      }
    }

    // Dynamic driving time calculation from duty record or today's trips
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTime = todayStart.getTime();

    let drivingMins = null;
    if (Number.isFinite(driver.drivingMinutes)) {
      drivingMins = driver.drivingMinutes;
    } else if (Number.isFinite(driver.drivingMinutesToday)) {
      drivingMins = driver.drivingMinutesToday;
    } else if (Array.isArray(data?.trips)) {
      const driverIdStr = String(driver._id || driver.id || "");
      const vehicleIdStr = vehicle ? String(vehicle.id || vehicle._id || "") : null;
      const driverTripsToday = data.trips.filter((t) => {
        const tTime = t.startedAt ? new Date(t.startedAt).getTime() : 0;
        if (tTime < todayStartTime) return false;
        const tDriverId = String(t.driverId || t.driver?._id || t.driver || "");
        const tVehicleId = String(t.vehicleId || t.vehicle?._id || t.vehicle || "");
        return (tDriverId && tDriverId === driverIdStr) || (vehicleIdStr && tVehicleId === vehicleIdStr);
      });
      if (driverTripsToday.length > 0) {
        drivingMins = driverTripsToday.reduce(
          (sum, t) => sum + (Number(t.durationMinutes) || Math.round((Number(t.distanceKm) || 0) * 1.5)),
          0
        );
      }
    }

    let drivingTime = "0h 0m";
    if (drivingMins !== null && drivingMins > 0) {
      drivingTime = `${Math.floor(drivingMins / 60)}h ${drivingMins % 60}m`;
    } else if (vehicle?.status === "moving") {
      drivingTime = "Driving now";
    }

    // Dynamic driver score / safety evaluation
    const rawScore = driver.safetyScore ?? driver.score ?? driver.dnaScore;
    const hasScore = Number.isFinite(rawScore);
    const score = hasScore ? Math.round(rawScore) : null;
    const scoreLabel = hasScore
      ? `${score}/100 Score`
      : driver.licenseNumber
      ? `DL: ${driver.licenseNumber}`
      : driver.assignment
      ? "Assigned"
      : "Profile Active";

    return {
      ...driver,
      name,
      initials,
      vehicle,
      status,
      statusLabel,
      statusColor,
      statusBg,
      drivingTime,
      hasScore,
      score,
      scoreLabel,
    };
  });

  // Client-side filtering & search
  const filteredItems = itemsWithTelemetry.filter((d) => {
    const matchesSearch =
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.mobileNumber && d.mobileNumber.includes(search)) ||
      (d.vehicle?.plate && d.vehicle.plate.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (filter === "driving") return d.status === "DRIVING";
    if (filter === "at_plant") return d.status === "AT_PLANT";
    if (filter === "resting") return d.status === "RESTING";
    if (filter === "unassigned") return d.status === "UNASSIGNED";
    return true;
  });

  return (
    <ManagerPage
      allowEmpty
      navigation={navigation}
      title="Driver Roster & Duty Board"
      subtitle="Duty hours, rest status and truck assignments."
    >
      {/* Search Input */}
      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Search driver by name, phone, or truck..."
      />

      {/* Filter Chips (M06) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
        <View style={{ flexDirection: "row", gap: 8, paddingVertical: 2 }}>
          {[
            { id: "all", label: "All Drivers" },
            { id: "driving", label: "Driving" },
            { id: "at_plant", label: "At Plant" },
            { id: "resting", label: "Resting" },
            { id: "unassigned", label: "Unassigned" },
          ].map((tab) => {
            const active = filter === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setFilter(tab.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: active ? colors.black : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.black : colors.border,
                }}
              >
                <AppText
                  variant="caption"
                  weight={active ? "bold" : "semibold"}
                  color={active ? colors.white : colors.textMuted}
                >
                  {tab.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {error && (
        <Card style={{ gap: 8, alignItems: "center", padding: 16 }}>
          <AppText color={colors.error}>{error}</AppText>
          <Button label="Retry" onPress={() => setRevision((value) => value + 1)} />
        </Card>
      )}

      {!result && !error && <AppText muted>Loading drivers and assignments…</AppText>}

      {result && (
        <>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <AppText variant="caption" mono muted>
              Showing {filteredItems.length} of {result.total} drivers
            </AppText>
            <AppText variant="caption" mono muted>
              Page {page}
            </AppText>
          </View>

          {/* Enriched Driver Cards (M06) */}
          <View style={{ gap: 10 }}>
            {filteredItems.map((driver) => (
              <Card
                key={driver._id}
                onPress={() => navigation.navigate("Driver detail", { id: driver._id })}
                style={{ gap: 10, borderWidth: 1, borderColor: colors.border }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: colors.tealTint,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <AppText weight="bold" color={colors.primaryDeep}>
                        {driver.initials}
                      </AppText>
                    </View>
                    <View style={{ gap: 2 }}>
                      <AppText weight="bold" style={{ fontSize: 15 }}>
                        {driver.name}
                      </AppText>
                      <AppText variant="caption" mono muted>
                        {driver.mobileNumber || "No mobile"}
                      </AppText>
                    </View>
                  </View>

                  {/* Status Badge (M06) */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      backgroundColor: driver.statusBg,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: driver.statusColor,
                      }}
                    />
                    <AppText variant="caption" weight="extrabold" color={driver.statusColor}>
                      {driver.statusLabel}
                    </AppText>
                  </View>
                </View>

                {/* Sub-row: Truck badge, duty hours, score trend */}
                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  {driver.vehicle ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        backgroundColor: colors.background,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <Ionicons name="car-outline" size={13} color={colors.text} />
                      <AppText variant="caption" weight="bold">
                        {driver.vehicle.plate}
                      </AppText>
                    </View>
                  ) : (
                    <View
                      style={{
                        backgroundColor: colors.background,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <AppText variant="caption" muted>
                        No truck assigned
                      </AppText>
                    </View>
                  )}

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      backgroundColor: colors.background,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Ionicons name="time-outline" size={13} color={colors.primary} />
                    <AppText variant="caption" weight="semibold">
                      {driver.drivingTime} today
                    </AppText>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      backgroundColor: driver.hasScore ? colors.validBg : colors.background,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Ionicons
                      name={driver.hasScore ? "shield-checkmark" : "ribbon-outline"}
                      size={12}
                      color={driver.hasScore ? colors.success : colors.textMuted}
                    />
                    <AppText
                      variant="caption"
                      weight="bold"
                      color={driver.hasScore ? colors.success : colors.textMuted}
                    >
                      {driver.scoreLabel}
                    </AppText>
                  </View>
                </View>

                {/* Fast Action Footer */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: colors.hairline,
                  }}
                >
                  <AppText variant="caption" weight="bold" color={colors.primary}>
                    Open Driver Profile →
                  </AppText>
                  <Pressable
                    hitSlop={8}
                    onPress={() => navigation.navigate("Truck handover", { driverId: driver._id })}
                  >
                    <AppText variant="caption" weight="bold" color={colors.textMuted}>
                      Reassign Truck
                    </AppText>
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>

          {/* Pagination */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
            <Button
              label="Previous"
              disabled={page === 1}
              style={{ flex: 1 }}
              onPress={() => setPage((value) => value - 1)}
            />
            <Button
              label="Next"
              disabled={page * 30 >= result.total}
              style={{ flex: 1 }}
              onPress={() => setPage((value) => value + 1)}
            />
          </View>
        </>
      )}

      <Button
        label="Assign / hand over truck"
        variant="secondary"
        onPress={() => navigation.navigate("Truck handover")}
      />
    </ManagerPage>
  );
}

export function Handover({ navigation, route }) {
  const { service, branchId, refresh } = useManagerData();
  const { user } = useAuth();
  const scope = permittedBranch(branchId);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [driverPage, setDriverPage] = useState(1);
  const [truckPage, setTruckPage] = useState(1);
  const [driverTotal, setDriverTotal] = useState(null);
  const [truckTotal, setTruckTotal] = useState(null);
  const [driverId, setDriverId] = useState(route.params?.driverId || "");
  const [vehicleId, setVehicleId] = useState(route.params?.vehicleId || "");
  const [confirmTakeover, setConfirm] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [frozen, setFrozen] = useState(null);
  const sending = useRef(false);
  const currentBranch = useRef(branchId);
  currentBranch.current = branchId;
  const [draftReady, setDraftReady] = useState(false);
  const key = `handover:${user._id}:${typeof user.orgId === "object" ? user.orgId?._id : user.orgId}:${branchId}`;
  useEffect(() => {
    let active = true;
    setFrozen(null);
    setDraftReady(false);
    setDone(false);
    AsyncStorage.getItem(key)
      .then((value) => {
        if (active && value) {
          const old = JSON.parse(value);
          setFrozen(old);
          setDriverId(old.driverId);
          setVehicleId(old.vehicleId);
          setConfirm(old.confirmTakeover);
          setNotes(old.notes || "");
        }
        if (active) setDraftReady(true);
      })
      .catch((failure) => setError(failure.message));
    return () => {
      active = false;
    };
  }, [key]);
  useEffect(() => {
    setDriverPage(1);
    setTruckPage(1);
    setDrivers([]);
    setTrucks([]);
    setDriverTotal(null);
    setTruckTotal(null);
  }, [branchId]);
  useEffect(() => {
    let active = true;
    service
      .fleetWorkflow("drivers", driverPage, scope)
      .then((result) => {
        if (active) {
          setDrivers((old) =>
            driverPage === 1
              ? result.items
              : [
                  ...new Map(
                    [...old, ...result.items].map((item) => [item._id, item]),
                  ).values(),
                ],
          );
          setDriverTotal(result.total);
        }
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, [service, scope, driverPage]);
  useEffect(() => {
    let active = true;
    service
      .vehicleOptions(truckPage, scope)
      .then((result) => {
        if (active) {
          setTrucks((old) =>
            truckPage === 1
              ? result.items
              : [
                  ...new Map(
                    [...old, ...result.items].map((item) => [item.id, item]),
                  ).values(),
                ],
          );
          setTruckTotal(result.total);
        }
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, [service, scope, truckPage]);
  async function submit() {
    if (sending.current || !draftReady) return;
    sending.current = true;
    const submittedBranch = branchId;
    setBusy(true);
    setError("");
    try {
      if (!driverId || !vehicleId || !confirmTakeover)
        throw new Error("Choose driver and truck, then confirm this handover.");
      const payload = frozen || {
        clientRequestId: Crypto.randomUUID(),
        driverId,
        vehicleId,
        confirmTakeover,
        notes,
      };
      await AsyncStorage.setItem(key, JSON.stringify(payload));
      setFrozen(payload);
      await service.confirmHandover(payload, scope);
      if (currentBranch.current !== submittedBranch) return;
      setDone(true);
      await AsyncStorage.removeItem(key);
      await refresh();
    } catch (failure) {
      setError(failure.message);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <ManagerPage allowEmpty navigation={navigation} title="Truck handover">
      {done ? (
        <>
          <AppText>Assignment saved on the server.</AppText>
          <Button label="Done" onPress={() => navigation.goBack()} />
        </>
      ) : (
        <>
          <AppText muted>
            This closes existing open assignments for the selected driver and
            truck. Any previous driver of this truck will be unlinked.
          </AppText>
          <AppText variant="label">Driver</AppText>
          <Picker
            accessibilityLabel="Driver"
            enabled={!frozen && !busy}
            selectedValue={driverId}
            onValueChange={setDriverId}
          >
            <Picker.Item value="" label="Choose driver" />
            {drivers.map((driver) => (
              <Picker.Item
                key={driver._id}
                value={driver._id}
                label={
                  [driver.firstName, driver.lastName]
                    .filter(Boolean)
                    .join(" ") ||
                  driver.mobileNumber ||
                  "Driver"
                }
              />
            ))}
          </Picker>
          {drivers.length < driverTotal && (
            <Button
              label="Load more drivers"
              onPress={() => setDriverPage((value) => value + 1)}
            />
          )}
          <AppText variant="label">Truck</AppText>
          <Picker
            accessibilityLabel="Truck"
            enabled={!frozen && !busy}
            selectedValue={vehicleId}
            onValueChange={setVehicleId}
          >
            <Picker.Item value="" label="Choose truck" />
            {trucks.map((truck) => (
              <Picker.Item
                key={truck.id}
                value={truck.id}
                label={truck.registrationNumber}
              />
            ))}
          </Picker>
          {trucks.length < truckTotal && (
            <Button
              label="Load more trucks"
              onPress={() => setTruckPage((value) => value + 1)}
            />
          )}
          <TextField
            label="Handover notes"
            editable={!frozen && !busy}
            value={notes}
            onChangeText={setNotes}
          />
          <Button
            label={
              confirmTakeover
                ? "Handover confirmed"
                : "Confirm ending previous assignments"
            }
            variant="secondary"
            disabled={!!frozen || busy}
            onPress={() => setConfirm((old) => !old)}
          />
          <Button
            label={frozen ? "Retry same handover" : "Save handover"}
            disabled={!draftReady}
            loading={busy}
            onPress={submit}
          />
        </>
      )}
      {error && <AppText color={colors.error}>{error}</AppText>}
    </ManagerPage>
  );
}
export function FleetRecords({ navigation, route }) {
  const { service, branchId } = useManagerData();
  const defaultKind =
    route.name === "Fleet documents"
      ? "documents"
      : route.name === "Fuel review"
        ? "fuel"
        : "bills";
  const [kind, setKind] = useState(defaultKind);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setResult(null);
      setError("");
      service
        .fleetWorkflow(kind, page, permittedBranch(branchId))
        .then((value) => {
          if (active) setResult(value);
        })
        .catch((failure) => {
          if (active) setError(failure.message);
        });
      return () => {
        active = false;
      };
    }, [service, branchId, kind, page, revision]),
  );
  return (
    <ManagerPage
      allowEmpty
      navigation={navigation}
      title={
        kind === "fuel"
          ? "Recorded fuel"
          : kind === "documents"
            ? "Fleet documents"
            : "Workshop bills and issues"
      }
    >
      {defaultKind === "bills" && (
        <Picker
          accessibilityLabel="Record category"
          selectedValue={kind}
          onValueChange={(value) => {
            setKind(value);
            setPage(1);
          }}
        >
          <Picker.Item value="bills" label="Workshop bills" />
          <Picker.Item value="issues" label="Reported issues" />
        </Picker>
      )}
      {kind === "fuel" && (
        <AppText muted>
          These are saved fuel entries. App-entry approval and rejection are not
          connected to a verified review workflow.
        </AppText>
      )}
      {error && (
        <>
          <AppText color={colors.error}>{error}</AppText>
          <Button
            label="Retry"
            onPress={() => setRevision((value) => value + 1)}
          />
        </>
      )}
      {!result && !error && <AppText muted>Loading records…</AppText>}
      {result && (
        <>
          <AppText muted>
            {result.total} records · Page {page}
          </AppText>
          {activeFilterPlate && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#EFF6FF", padding: 10, borderRadius: 8, marginBottom: 10 }}>
              <AppText variant="caption" weight="bold" color={colors.primary}>Showing records for {activeFilterPlate}</AppText>
              <Pressable onPress={() => setActiveFilterPlate(null)}><AppText variant="caption" color={colors.textMuted}>Clear</AppText></Pressable>
            </View>
          )}
          {result.items.filter((row) => {
            if (!activeFilterPlate) return true;
            const p = row.registrationNumber || row.vehicleNumber || row.plate;
            const v = row.vehicleId || row.vehicle?._id || row.vehicle;
            return (p && p.toUpperCase().replace(/\s+/g, "") === activeFilterPlate.toUpperCase().replace(/\s+/g, "")) || (vehicleId && v === vehicleId);
          }).map((row) => (
            <MenuRow
              key={row._id}
              title={
                kind === "documents"
                  ? row.docType
                  : kind === "issues"
                    ? row.report?.note || row.type
                    : kind === "fuel"
                      ? row.location || "Fuel entry"
                      : "Workshop bill"
              }
              detail={
                row.scanStatus || row.status || row.reviewStatus || "Recorded"
              }
              onPress={() =>
                navigation.navigate("Review detail", { kind, id: row._id })
              }
            />
          ))}
          {!result.items.length && (
            <AppText muted>No records in this view.</AppText>
          )}
          <Button
            label="Previous"
            disabled={page === 1}
            onPress={() => setPage((value) => value - 1)}
          />
          <Button
            label="Next"
            disabled={page * 30 >= result.total}
            onPress={() => setPage((value) => value + 1)}
          />
        </>
      )}
    </ManagerPage>
  );
}
export function FleetRecordDetail({ navigation, route }) {
  const { service, branchId } = useManagerData();
  const { user } = useAuth();
  const kind =
    route.params?.kind ||
    route.params?.resource ||
    (route.name === "Manager document" ? "documents" : "bills");
  const id = route.params?.id;
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [decisions, setDecisions] = useState({});
  const [maintenanceRecordId, setRecordId] = useState("");
  const [maintenance, setMaintenance] = useState([]);
  const [maintenancePage, setMaintenancePage] = useState(1);
  const [maintenanceTotal, setMaintenanceTotal] = useState(null);
  useEffect(() => {
    if (kind !== "bills" || !record) return;
    let active = true;
    service
      .fleetWorkflow(
        "maintenance",
        maintenancePage,
        permittedBranch(branchId),
        { vehicleId: record.vehicleId },
      )
      .then((result) => {
        if (active) {
          setMaintenance((old) =>
            maintenancePage === 1
              ? result.items
              : [
                  ...new Map(
                    [...old, ...result.items].map((item) => [item._id, item]),
                  ).values(),
                ],
          );
          setMaintenanceTotal(result.total);
        }
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, [service, record, kind, branchId, maintenancePage]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [revision, setRevision] = useState(0);
  const [frozen, setFrozen] = useState(null);
  const [draftReady, setDraftReady] = useState(false);
  const submitting = useRef(false);
  const currentBranch = useRef(branchId);
  currentBranch.current = branchId;
  const reviewKey = `bill-review:${user._id}:${id}:${branchId}`;
  useEffect(() => {
    let active = true;
    setFrozen(null);
    setDraftReady(false);
    AsyncStorage.getItem(reviewKey)
      .then((value) => {
        if (!active) return;
        if (value) {
          const payload = JSON.parse(value);
          setFrozen(payload);
          setDecisions(payload.fields);
        }
        setDraftReady(true);
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, [reviewKey]);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setRecord(null);
      setError("");
      service
        .fleetRecord(kind, id, permittedBranch(branchId))
        .then((row) => {
          if (active) {
            setRecord(row);
            setRecordId(row.maintenanceRecordId || "");
          }
        })
        .catch((failure) => {
          if (active) setError(failure.message);
        });
      return () => {
        active = false;
      };
    }, [service, kind, id, branchId, revision]),
  );
  async function write(action) {
    if (submitting.current || (kind === "bills" && !draftReady)) return;
    submitting.current = true;
    const submittedBranch = branchId;
    setBusy(true);
    setError("");
    try {
      if (kind === "bills") {
        if (
          !frozen &&
          Object.values(decisions).some(
            (value) =>
              value.action === "CORRECT" &&
              String(value.value ?? "").trim() === "",
          )
        )
          throw new Error("Enter each corrected value.");
        const fields = Object.fromEntries(
          Object.entries(decisions)
            .filter(([, value]) => value.action)
            .map(([key, value]) => [
              key,
              {
                action: value.action,
                ...(value.action === "CORRECT" && {
                  value: [
                    "grandTotal",
                    "subTotal",
                    "gstAmount",
                    "odometerKm",
                  ].includes(key)
                    ? Number(value.value)
                    : value.value,
                }),
              },
            ]),
        );
        if (!Object.keys(fields).length)
          throw new Error("Choose at least one field decision.");
        const payload = frozen || {
          clientRequestId: Crypto.randomUUID(),
          expectedUpdatedAt: record.updatedAt,
          fields,
          ...(maintenanceRecordId && { maintenanceRecordId }),
        };
        await AsyncStorage.setItem(reviewKey, JSON.stringify(payload));
        setFrozen(payload);
        const result = await service.reviewBill(
          id,
          payload,
          permittedBranch(branchId),
        );
        if (currentBranch.current !== submittedBranch) return;
        setSaved(true);
        await AsyncStorage.removeItem(reviewKey);
        setFrozen(null);
        if (result.warning) setError(result.warning);
      } else
        await service.issueAction(
          id,
          action,
          action === "resolve" ? { resolutionNote: note.trim() } : {},
          permittedBranch(branchId),
        );
      if (currentBranch.current !== submittedBranch) return;
      setSaved(true);
      setDecisions({});
      setRevision((value) => value + 1);
    } catch (failure) {
      setError(failure.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <ManagerPage allowEmpty navigation={navigation} title="Record and evidence">
      {saved && <AppText>Update confirmed by the server.</AppText>}
      {error && (
        <>
          <AppText color={colors.error}>{error}</AppText>
          <Button
            label="Reload"
            onPress={() => setRevision((value) => value + 1)}
          />
        </>
      )}
      {!record && !error && <AppText muted>Loading…</AppText>}
      {record && (
        <>
          <AppText variant="h3">
            {record.docType ||
              record.incidentNumber ||
              record.location ||
              "Workshop bill"}
          </AppText>
          <AppText muted>
            {record.scanStatus || record.status || record.reviewStatus}
          </AppText>
          <FileLink
            url={
              record.publicUrl ||
              record.sourceFile?.publicUrl ||
              record.receipt?.publicUrl
            }
          />
          {kind === "fuel" && (
            <AppText>
              {formatLitres(record.litres)} L · ₹{record.totalAmount} ·{" "}
              {new Date(record.refuelTime).toLocaleString()}
            </AppText>
          )}
          {kind === "bills" && (
            <>
              <AppText variant="label">
                Maintenance record for this truck
              </AppText>
              <Picker
                accessibilityLabel="Maintenance record"
                enabled={!busy && !frozen}
                selectedValue={maintenanceRecordId}
                onValueChange={setRecordId}
              >
                <Picker.Item label="Choose maintenance record" value="" />
                {maintenanceRecordId &&
                  !maintenance.some(
                    (item) => item._id === maintenanceRecordId,
                  ) && (
                    <Picker.Item
                      label="Currently linked record"
                      value={maintenanceRecordId}
                    />
                  )}
                {maintenance.map((item) => (
                  <Picker.Item
                    key={item._id}
                    value={item._id}
                    label={`${new Date(item.date).toLocaleDateString()} · ${item.workshop} · ₹${item.amount}`}
                  />
                ))}
              </Picker>
              {maintenance.length < maintenanceTotal && (
                <Button
                  label="Load more maintenance records"
                  onPress={() => setMaintenancePage((value) => value + 1)}
                />
              )}
              <Button
                label="Create maintenance record"
                variant="secondary"
                disabled={busy || !!frozen}
                onPress={() =>
                  navigation.navigate("New maintenance record", {
                    vehicleId: record.vehicleId,
                  })
                }
              />
              <AppText muted>
                Accept or correct a field only after linking a maintenance
                record for this truck. Existing recorded figures remain
                available through Keep recorded.
              </AppText>
              {record.fields?.map((field) => (
                <Card key={field.field}>
                  <AppText weight="bold">{field.label}</AppText>
                  <AppText>
                    {field.value == null
                      ? "Not read from bill"
                      : String(field.value)}{" "}
                    · {field.status}
                    {field.confidence != null
                      ? ` · ${field.confidence}% confidence`
                      : ""}
                  </AppText>
                  <Picker
                    accessibilityLabel={`Decision for ${field.label}`}
                    enabled={!busy && !frozen}
                    selectedValue={decisions[field.field]?.action || ""}
                    onValueChange={(action) =>
                      setDecisions((old) => ({
                        ...old,
                        [field.field]: { ...old[field.field], action },
                      }))
                    }
                  >
                    <Picker.Item label="Choose decision" value="" />
                    {["ACCEPT", "CORRECT", "KEEP_RECORDED", "REJECT"].map(
                      (action) => (
                        <Picker.Item
                          key={action}
                          label={action.replaceAll("_", " ")}
                          value={action}
                        />
                      ),
                    )}
                  </Picker>
                  {decisions[field.field]?.action === "CORRECT" && (
                    <TextField
                      label="Correct value"
                      value={String(decisions[field.field]?.value ?? "")}
                      editable={!busy && !frozen}
                      onChangeText={(value) =>
                        setDecisions((old) => ({
                          ...old,
                          [field.field]: { ...old[field.field], value },
                        }))
                      }
                    />
                  )}
                </Card>
              ))}
              {frozen && (
                <Button
                  label="Start review from latest record"
                  variant="secondary"
                  disabled={busy}
                  onPress={async () => {
                    await AsyncStorage.removeItem(reviewKey);
                    setFrozen(null);
                    setDecisions({});
                    setRevision((value) => value + 1);
                  }}
                />
              )}
              <Button
                label={frozen ? "Retry same review" : "Save field decisions"}
                disabled={!draftReady}
                loading={busy}
                onPress={() => write()}
              />
            </>
          )}
          {kind === "issues" && (
            <>
              <AppText>{record.report?.note}</AppText>
              <AppText muted>{record.pairingHeadline}</AppText>
              {record.photos?.map((photo, index) => (
                <FileLink
                  key={photo.fileKey || index}
                  url={photo.url}
                  label={`Photo ${index + 1}`}
                />
              ))}
              {record.status === "OPEN" && (
                <Button
                  label="Acknowledge issue"
                  loading={busy}
                  onPress={() => write("acknowledge")}
                />
              )}
              {["ACKNOWLEDGED", "MECHANIC_ASSIGNED"].includes(
                record.status,
              ) && (
                <>
                  <TextField
                    label="Resolution note"
                    value={note}
                    onChangeText={setNote}
                    editable={!busy && !frozen}
                  />
                  <Button
                    label="Resolve issue"
                    disabled={note.trim().length < 2}
                    loading={busy}
                    onPress={() => write("resolve")}
                  />
                </>
              )}
              {record.dispatch?.resolutionNote && (
                <AppText>{record.dispatch.resolutionNote}</AppText>
              )}
            </>
          )}
        </>
      )}
    </ManagerPage>
  );
}

export function NewMaintenance({ navigation, route }) {
  const { service, branchId } = useManagerData();
  const { user } = useAuth();
  const [workshop, setWorkshop] = useState("");
  const [type, setType] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString());
  const [recordType, setRecordType] = useState("REPAIR");
  const [frozen, setFrozen] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const key = `maintenance:${user._id}:${typeof user.orgId === "object" ? user.orgId?._id : user.orgId}:${route.params.vehicleId}:${branchId}`;
  useEffect(() => {
    let active = true;
    setReady(false);
    setFrozen(null);
    setDone(false);
    AsyncStorage.getItem(key)
      .then((value) => {
        if (!active) return;
        if (value) {
          const old = JSON.parse(value);
          setFrozen(old);
          setWorkshop(old.workshop);
          setType(old.type);
          setAmount(String(old.amount));
          setDate(old.date);
          setRecordType(old.recordType);
        }
        setReady(true);
      })
      .catch((failure) => setError(failure.message));
    return () => {
      active = false;
    };
  }, [key]);
  async function submit() {
    if (sending.current || !ready) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      if (
        !workshop.trim() ||
        !type.trim() ||
        !amount.trim() ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) < 0
      )
        throw new Error(
          "Enter workshop, service or repair description, and amount.",
        );
      const payload = frozen || {
        clientRequestId: Crypto.randomUUID(),
        vehicleId: route.params.vehicleId,
        recordType,
        workshop: workshop.trim(),
        type: type.trim(),
        amount: Number(amount),
        date,
      };
      await AsyncStorage.setItem(key, JSON.stringify(payload));
      setFrozen(payload);
      const result = await service.createMaintenance(
        payload,
        permittedBranch(branchId),
      );
      setDone(true);
      await AsyncStorage.removeItem(key);
      if (result.warning) setError(result.warning);
    } catch (failure) {
      setError(failure.message);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <ManagerPage
      allowEmpty
      navigation={navigation}
      title="New maintenance record"
    >
      {done ? (
        <>
          <AppText>Maintenance record saved on the server.</AppText>
          <Button
            label="Return to bill review"
            onPress={() => navigation.goBack()}
          />
        </>
      ) : (
        <>
          <Picker
            accessibilityLabel="Maintenance type"
            enabled={!frozen && !busy}
            selectedValue={recordType}
            onValueChange={setRecordType}
          >
            <Picker.Item value="REPAIR" label="Repair" />
            <Picker.Item value="SERVICE" label="Service" />
          </Picker>
          <TextField
            label="Workshop"
            value={workshop}
            onChangeText={setWorkshop}
            editable={!frozen && !busy}
          />
          <TextField
            label="Service or repair"
            value={type}
            onChangeText={setType}
            editable={!frozen && !busy}
          />
          <TextField
            label="Recorded amount (₹)"
            value={amount}
            onChangeText={setAmount}
            editable={!frozen && !busy}
            keyboardType="decimal-pad"
          />
          <DateField
            label="Service date"
            value={date}
            onChange={setDate}
            disabled={!!frozen || busy}
            includeTime={false}
          />
          <Button
            label={frozen ? "Retry same entry" : "Save record"}
            loading={busy}
            disabled={!ready}
            onPress={submit}
          />
        </>
      )}
      {error && <AppText color={colors.error}>{error}</AppText>}
    </ManagerPage>
  );
}
