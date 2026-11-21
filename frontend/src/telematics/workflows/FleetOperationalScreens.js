import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
export function DriverRoster({ navigation }) {
  const { service, branchId } = useManagerData();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
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
    }, [service, branchId, page, revision]),
  );

  const items = result?.items || [];
  const filtered = search.trim()
    ? items.filter((driver) => {
        const name = [driver.firstName, driver.lastName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const phone = (driver.mobileNumber || "").toLowerCase();
        const q = search.trim().toLowerCase();
        return name.includes(q) || phone.includes(q);
      })
    : items;

  return (
    <ManagerPage
      allowEmpty
      navigation={navigation}
      title="Drivers and assignments"
    >
      {error && (
        <>
          <AppText color={colors.error}>{error}</AppText>
          <Button
            label="Retry"
            onPress={() => setRevision((value) => value + 1)}
          />
        </>
      )}
      {!result && !error && <AppText muted>Loading drivers…</AppText>}
      {result && (
        <>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              paddingHorizontal: 2,
            }}
          >
            <AppText>
              <AppText weight="bold" variant="body">
                {result.total} drivers
              </AppText>
              <AppText muted> · Current assignments</AppText>
            </AppText>
            <Pressable
              onPress={() => setSearchOpen((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel="Search drivers"
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: searchOpen
                  ? colors.primarySoft || "#EFF6FF"
                  : "#F0F4F8",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="search"
                size={19}
                color={
                  searchOpen
                    ? colors.primaryDeep || "#2563EB"
                    : colors.primary || "#2563EB"
                }
              />
            </Pressable>
          </View>
          {searchOpen && (
            <View style={{ marginBottom: 14 }}>
              <TextField
                placeholder="Search by driver name or number…"
                value={search}
                onChangeText={setSearch}
              />
            </View>
          )}
          {filtered.map((driver) => {
            const name =
              [driver.firstName, driver.lastName].filter(Boolean).join(" ") ||
              driver.mobileNumber ||
              "Driver";
            const isAssigned = !!driver.assignment;
            const detailText = isAssigned
              ? `Truck linked · ${driver.assignment.source || "MANUAL"}`
              : "No active assignment";

            return (
              <Card
                key={driver._id}
                onPress={() =>
                  navigation.navigate("Truck handover", {
                    driverId: driver._id,
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={name}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#EAEFF5",
                  backgroundColor: colors.white || "#FFFFFF",
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "#EBF3FF",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 14,
                  }}
                >
                  <MaterialCommunityIcons
                    name="truck"
                    size={22}
                    color="#2563EB"
                  />
                </View>
                <View style={{ flex: 1, justifyContent: "center" }}>
                  <AppText
                    weight="bold"
                    variant="body"
                    color={colors.text || "#111827"}
                  >
                    {name}
                  </AppText>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 4,
                    }}
                  >
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 3.5,
                        backgroundColor: isAssigned ? "#10B981" : "#9CA3AF",
                        marginRight: 6,
                      }}
                    />
                    <AppText variant="small" muted>
                      {detailText}
                    </AppText>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#9CA3AF"
                />
              </Card>
            );
          })}
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
      <Button
        label="Assign / hand over truck"
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
          <View
            style={{
              backgroundColor: "#EBF3FF",
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons
              name="information-circle"
              size={26}
              color="#2563EB"
              style={{ marginRight: 12 }}
            />
            <AppText
              style={{
                flex: 1,
                fontSize: 13,
                lineHeight: 18,
                color: "#1E293B",
              }}
            >
              This closes existing open assignments for the selected driver and
              truck. Any previous driver of this truck will be unlinked.
            </AppText>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Ionicons
              name="person"
              size={15}
              color="#2563EB"
              style={{ marginRight: 6 }}
            />
            <AppText
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#0F172A",
                letterSpacing: 0.5,
              }}
            >
              DRIVER
            </AppText>
          </View>
          <Picker
            accessibilityLabel="Driver"
            enabled={!frozen && !busy}
            selectedValue={driverId}
            onValueChange={setDriverId}
            icon={<Ionicons name="person" size={22} color="#2563EB" />}
            triggerStyle={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              paddingVertical: 12,
              paddingHorizontal: 14,
              marginBottom: 12,
            }}
            valueStyle={{
              fontSize: 16,
              fontWeight: "700",
              color: "#0F172A",
            }}
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
          {(driverTotal == null || drivers.length < driverTotal) && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Load more drivers"
              onPress={() => setDriverPage((value) => value + 1)}
              style={{
                backgroundColor: "#2563EB",
                borderRadius: 999,
                paddingVertical: 14,
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
                position: "relative",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons
                  name="car"
                  size={20}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <AppText
                  style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 15 }}
                >
                  Load more drivers
                </AppText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#FFFFFF"
                style={{ position: "absolute", right: 20 }}
              />
            </Pressable>
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <MaterialCommunityIcons
              name="truck"
              size={16}
              color="#2563EB"
              style={{ marginRight: 6 }}
            />
            <AppText
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#0F172A",
                letterSpacing: 0.5,
              }}
            >
              TRUCK
            </AppText>
          </View>
          <Picker
            accessibilityLabel="Truck"
            enabled={!frozen && !busy}
            selectedValue={vehicleId}
            onValueChange={setVehicleId}
            icon={
              <MaterialCommunityIcons name="truck" size={22} color="#2563EB" />
            }
            triggerStyle={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              paddingVertical: 12,
              paddingHorizontal: 14,
              marginBottom: 12,
            }}
            valueStyle={{
              fontSize: 16,
              fontWeight: "700",
              color: "#0F172A",
            }}
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
          {(truckTotal == null || trucks.length < truckTotal) && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Load more trucks"
              onPress={() => setTruckPage((value) => value + 1)}
              style={{
                backgroundColor: "#2563EB",
                borderRadius: 999,
                paddingVertical: 14,
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
                position: "relative",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons
                  name="truck"
                  size={20}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <AppText
                  style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 15 }}
                >
                  Load more trucks
                </AppText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#FFFFFF"
                style={{ position: "absolute", right: 20 }}
              />
            </Pressable>
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Ionicons
              name="pencil"
              size={15}
              color="#2563EB"
              style={{ marginRight: 6 }}
            />
            <AppText
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#0F172A",
                letterSpacing: 0.5,
              }}
            >
              HANDOVER NOTES
            </AppText>
          </View>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              padding: 14,
              minHeight: 90,
              marginBottom: 20,
            }}
          >
            <TextInput
              editable={!frozen && !busy}
              value={notes}
              onChangeText={(text) => {
                if (text.length <= 200) setNotes(text);
              }}
              placeholder="Add any handover notes (optional)..."
              placeholderTextColor="#94A3B8"
              multiline
              style={{
                fontSize: 14,
                color: "#0F172A",
                minHeight: 50,
                textAlignVertical: "top",
              }}
            />
            <AppText
              style={{
                alignSelf: "flex-end",
                fontSize: 12,
                color: "#64748B",
                marginTop: 6,
              }}
            >
              {notes.length}/200
            </AppText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              confirmTakeover
                ? "Handover confirmed"
                : "Confirm ending previous assignments"
            }
            disabled={!!frozen || busy}
            onPress={() => setConfirm((old) => !old)}
            style={{
              backgroundColor: confirmTakeover ? "#1D4ED8" : "#2563EB",
              borderRadius: 999,
              paddingVertical: 15,
              paddingHorizontal: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              opacity: !!frozen || busy ? 0.6 : 1,
            }}
          >
            <Ionicons
              name="checkmark"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <AppText
              style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}
            >
              {confirmTakeover
                ? "Handover confirmed"
                : "Confirm ending previous assignments"}
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              frozen ? "Retry same handover" : "Save handover"
            }
            disabled={!draftReady || busy}
            onPress={submit}
            style={{
              backgroundColor: "#FFFFFF",
              borderWidth: 1.5,
              borderColor: "#2563EB",
              borderRadius: 999,
              paddingVertical: 15,
              paddingHorizontal: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              opacity: !draftReady || busy ? 0.6 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator
                size="small"
                color="#2563EB"
                style={{ marginRight: 8 }}
              />
            ) : (
              <MaterialCommunityIcons
                name="content-save"
                size={19}
                color="#2563EB"
                style={{ marginRight: 8 }}
              />
            )}
            <AppText
              style={{ color: "#2563EB", fontWeight: "700", fontSize: 15 }}
            >
              {frozen ? "Retry same handover" : "Save handover"}
            </AppText>
          </Pressable>
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
        <View
          style={{
            backgroundColor: "#EBF3FF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#BFDBFE",
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <Ionicons
            name="information-circle"
            size={28}
            color="#2563EB"
          />
          <View
            style={{
              width: 1,
              height: 36,
              backgroundColor: "#93C5FD",
              marginHorizontal: 12,
            }}
          />
          <AppText
            style={{
              flex: 1,
              fontSize: 12.5,
              lineHeight: 18,
              color: "#1E293B",
            }}
          >
            These are saved fuel entries. App-entry approval and rejection are
            not connected to a verified review workflow.
          </AppText>
        </View>
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
              paddingHorizontal: 2,
            }}
          >
            <AppText
              style={{ fontSize: 14, fontWeight: "700", color: "#1E293B" }}
            >
              {result.total} records
            </AppText>
            <AppText style={{ fontSize: 14, color: "#64748B" }}>
              {" "}· Page {page}
            </AppText>
          </View>
          {result.items.map((row, index) => {
            const title =
              kind === "documents"
                ? row.docType
                : kind === "issues"
                  ? row.report?.note || row.type
                  : kind === "fuel"
                    ? row.location || "Fuel entry"
                    : "Workshop bill";
            const detail =
              row.scanStatus || row.status || row.reviewStatus || "Recorded";
            return (
              <Pressable
                key={row._id}
                accessibilityRole="button"
                accessibilityLabel={`${title}, ${detail}`}
                onPress={() =>
                  navigation.navigate("Review detail", { kind, id: row._id })
                }
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  borderLeftWidth: index === 0 ? 4 : 1,
                  borderLeftColor: index === 0 ? "#2563EB" : "#E2E8F0",
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.03,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: "#EBF3FF",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#2563EB"
                  />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <AppText
                    style={{
                      fontSize: 14.5,
                      fontWeight: "700",
                      color: "#0F172A",
                      lineHeight: 19,
                    }}
                  >
                    {title}
                  </AppText>
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#64748B",
                      marginTop: 3,
                    }}
                  >
                    {detail}
                  </AppText>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#475569"
                />
              </Pressable>
            );
          })}
          {!result.items.length && (
            <AppText muted>No records in this view.</AppText>
          )}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginTop: 12,
              marginBottom: 20,
            }}
          >
            <Button
              label="Previous"
              variant="secondary"
              disabled={page === 1}
              onPress={() => setPage((value) => value - 1)}
              style={{ flex: 1 }}
            />
            <Button
              label="Next"
              variant="secondary"
              disabled={page * 30 >= result.total}
              onPress={() => setPage((value) => value + 1)}
              style={{ flex: 1 }}
            />
          </View>
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
