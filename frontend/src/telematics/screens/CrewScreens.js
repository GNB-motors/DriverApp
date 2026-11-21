import React, { useEffect, useState, useMemo } from "react";
import {
  Alert,
  Platform,
  Pressable,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Badge, Button, Card, TextField, colors } from "../../components/ui";
import { BackHeader } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
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

const identity = (user) => {
  if (!user) return "anon";
  const org = typeof user.orgId === "object" && user.orgId !== null ? user.orgId._id : user.orgId;
  return `${user._id || "user"}:${org || "org"}`;
};

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
    ? person.name || [person.firstName, person.lastName].filter(Boolean).join(" ")
    : "Former crew member";
}

function getVehicleDriver(v, drivers = []) {
  if (v.driverName) return { name: v.driverName, phone: v.driverPhone };
  if (v.driver && typeof v.driver === "object") {
    const name = [v.driver.firstName, v.driver.lastName].filter(Boolean).join(" ") || v.driver.name;
    if (name) return { name, phone: v.driver.phone };
  }
  const match = (drivers || []).find((d) => String(d.vehicleId) === String(v.id || v._id));
  if (match) {
    const name = match.name || [match.firstName, match.lastName].filter(Boolean).join(" ");
    return { name: name || "Assigned Driver", phone: match.phone };
  }
  return null;
}

// ----------------------------------------------------------------------------
// Fleet Crew Overview (Clean, professional, informative overview for Manager/Owner)
// ----------------------------------------------------------------------------
function FleetCrewOverview({ navigation }) {
  const { branchId, data, loading, error, refresh } = useManagerData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, MOVING, ASSIGNED, UNASSIGNED, STOPPED
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh?.();
    setRefreshing(false);
  };

  const vehicles = useMemo(() => data?.vehicles || [], [data?.vehicles]);
  const drivers = useMemo(() => data?.drivers || [], [data?.drivers]);

  // Aggregate counts
  const totalCount = vehicles.length;
  const movingCount = vehicles.filter((v) => String(v.status || "").toUpperCase() === "MOVING").length;
  const assignedCount = vehicles.filter((v) => !!getVehicleDriver(v, drivers)).length;
  const unassignedCount = totalCount - assignedCount;

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/[\s-]/g, "");

    return vehicles.filter((v) => {
      const plate = String(v.plate || v.registrationNumber || "").toLowerCase().replace(/[\s-]/g, "");
      const driver = getVehicleDriver(v, drivers);
      const driverName = String(driver?.name || "").toLowerCase();

      // Search match
      if (q && !plate.includes(q) && !driverName.includes(q)) {
        return false;
      }

      // Filter match
      const status = String(v.status || "").toUpperCase();
      if (filter === "MOVING" && status !== "MOVING") return false;
      if (filter === "STOPPED" && status === "MOVING") return false;
      if (filter === "ASSIGNED" && !driver) return false;
      if (filter === "UNASSIGNED" && !!driver) return false;

      return true;
    });
  }, [vehicles, drivers, search, filter]);

  return (
    <View style={s.container}>
      {/* Top Header */}
      <BackHeader
        title="Crew & Driving"
        subtitle="Live driving status, crew assignments & at-wheel handovers"
        onBack={() => navigation.goBack()}
      />

      {/* KPI Summary Cards */}
      <View style={s.kpiRow}>
        <View style={s.kpiCard}>
          <Text style={s.kpiVal}>{totalCount}</Text>
          <Text style={s.kpiLabel}>Total Trucks</Text>
        </View>

        <View style={s.kpiCard}>
          <Text style={[s.kpiVal, { color: "#16A34A" }]}>{movingCount}</Text>
          <Text style={s.kpiLabel}>Moving</Text>
        </View>

        <View style={s.kpiCard}>
          <Text style={[s.kpiVal, { color: "#1A56DB" }]}>{assignedCount}</Text>
          <Text style={s.kpiLabel}>Crew Assigned</Text>
        </View>

        <View style={s.kpiCard}>
          <Text style={[s.kpiVal, { color: unassignedCount > 0 ? "#EA580C" : "#64748B" }]}>
            {unassignedCount}
          </Text>
          <Text style={s.kpiLabel}>No Crew</Text>
        </View>
      </View>

      {/* Filter Row: Search & Segmented Status Filters */}
      <View style={s.searchFilterContainer}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search truck plate or driver..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="characters"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChipsScroll}>
          {[
            { id: "ALL", label: `All (${totalCount})` },
            { id: "MOVING", label: `Moving (${movingCount})` },
            { id: "ASSIGNED", label: `Assigned (${assignedCount})` },
            { id: "UNASSIGNED", label: `Unassigned (${unassignedCount})` },
            { id: "STOPPED", label: `Parked/Idle (${totalCount - movingCount})` },
          ].map((c) => {
            const isSel = filter === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[s.filterChip, isSel && s.filterChipActive]}
                onPress={() => setFilter(c.id)}
                activeOpacity={0.8}
              >
                <Text style={[s.filterChipText, isSel && s.filterChipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Vehicle List */}
      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1A56DB"]} />}
      >
        {loading && !refreshing ? (
          <View style={s.centerBox}>
            <ActivityIndicator size="large" color="#1A56DB" />
            <Text style={s.loadingText}>Loading fleet crew & driving status...</Text>
          </View>
        ) : error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={32} color="#DC2626" />
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={refresh}>
              <Text style={s.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredVehicles.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="swap-horizontal-outline" size={44} color="#94A3B8" />
            <Text style={s.emptyTitle}>No Trucks Found</Text>
            <Text style={s.emptySubtitle}>No vehicles matching the filter or search query.</Text>
          </View>
        ) : (
          filteredVehicles.map((v) => {
            const plate = v.plate || v.registrationNumber || "Truck";
            const status = String(v.status || "STOPPED").toUpperCase();
            const isMoving = status === "MOVING";
            const isIdle = status === "IDLE";
            const driver = getVehicleDriver(v, drivers);
            const speed = v.speed != null ? Math.round(v.speed) : 0;

            return (
              <View key={v.id || plate} style={s.truckCard}>
                {/* Card Header: Plate & Live Status */}
                <View style={s.cardHeader}>
                  <View style={s.plateBadge}>
                    <View style={s.plateIndPill}>
                      <Text style={s.plateIndText}>IND</Text>
                    </View>
                    <Text style={s.plateNumberText}>{plate}</Text>
                  </View>

                  <View
                    style={[
                      s.statusPill,
                      isMoving
                        ? s.statusPillMoving
                        : isIdle
                        ? s.statusPillIdle
                        : s.statusPillStopped,
                    ]}
                  >
                    <Ionicons
                      name={
                        isMoving
                          ? "navigate"
                          : isIdle
                          ? "pause-circle"
                          : "stop-circle"
                      }
                      size={12}
                      color={isMoving ? "#16A34A" : isIdle ? "#D97706" : "#64748B"}
                    />
                    <Text
                      style={[
                        s.statusPillText,
                        isMoving
                          ? { color: "#166534" }
                          : isIdle
                          ? { color: "#B45309" }
                          : { color: "#475569" },
                      ]}
                    >
                      {isMoving
                        ? `Moving · ${speed} km/h`
                        : isIdle
                        ? "Engine Idling"
                        : "Stationary"}
                    </Text>
                  </View>
                </View>

                {/* Driver / Crew Allocation Box */}
                <View style={driver ? s.driverBoxAssigned : s.driverBoxUnassigned}>
                  <View style={s.driverAvatarCircle}>
                    <Ionicons
                      name={driver ? "person" : "person-add-outline"}
                      size={18}
                      color={driver ? "#1A56DB" : "#EA580C"}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={driver ? s.driverNameAssigned : s.driverNameUnassigned}>
                      {driver ? driver.name : "No Driver Assigned"}
                    </Text>
                    <Text style={s.driverDetailSub}>
                      {driver
                        ? `${driver.phone ? `${driver.phone} · ` : ""}Assigned Crew`
                        : "Vehicle moving or parked without confirmed crew"}
                    </Text>
                  </View>

                  {driver && (
                    <View style={s.atWheelBadge}>
                      <Text style={s.atWheelBadgeText}>Active Crew</Text>
                    </View>
                  )}
                </View>

                {/* Location & Trip Stats Row */}
                <View style={s.metaRow}>
                  {v.todayKm != null ? (
                    <View style={s.metaItem}>
                      <Ionicons name="speedometer-outline" size={13} color="#64748B" />
                      <Text style={s.metaItemText}>{Math.round(v.todayKm)} km today</Text>
                    </View>
                  ) : null}

                  <View style={[s.metaItem, { flex: 1 }]}>
                    <Ionicons name="location-outline" size={13} color="#64748B" />
                    <Text style={s.metaItemText} numberOfLines={1}>
                      {v.location || v.address || "GPS location streaming"}
                    </Text>
                  </View>
                </View>

                {/* Card Action Footer */}
                <View style={s.cardFooter}>
                  <TouchableOpacity
                    style={s.manageCrewBtn}
                    onPress={() => navigation.push("Crew & driving", { vehicleId: v.id })}
                    activeOpacity={0.8}
                  >
                    <Text style={s.manageCrewBtnText}>Manage Crew & Handovers</Text>
                    <Ionicons name="arrow-forward" size={14} color="#1A56DB" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ----------------------------------------------------------------------------
// Summary Sub-Component (for Driver / Single Truck Card)
// ----------------------------------------------------------------------------
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
          <View style={s.driverSummary}>
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

export function VehicleCrewCard({ navigation, vehicleId }) {
  const { user } = useAuth();
  const { branchId } = useManagerData();
  const service = useTelematicsApi();
  const branch = branchId === "all" ? undefined : branchId;
  const cleanVehicleId =
    vehicleId && !String(vehicleId).startsWith("position:")
      ? String(vehicleId)
      : null;
  const request = useOwnerRequest(
    cleanVehicleId
      ? `${identity(user)}:${branch || "all"}:crew-card:${cleanVehicleId}`
      : null,
    () => (cleanVehicleId ? service.crewVehicle(cleanVehicleId, branch) : Promise.resolve(null)),
    30000,
  );
  if (!cleanVehicleId) return null;
  return (
    <Card>
      <AppText variant="h3">Crew & driving</AppText>
      <RequestState request={request} />
      {request.data && <Summary data={request.data} />}
      <Button
        label="Crew and driving timeline"
        variant="secondary"
        onPress={() => navigation.navigate("Crew & driving", { vehicleId: cleanVehicleId })}
      />
    </Card>
  );
}

export function DriverCrewScreen({ navigation }) {
  return <CrewScreen navigation={navigation} driver />;
}

export function FleetCrewScreen({ navigation, route }) {
  const { branchId } = useManagerData();
  if (!route.params?.vehicleId) {
    return <FleetCrewOverview navigation={navigation} />;
  }
  return (
    <CrewScreen
      navigation={navigation}
      vehicleId={route.params?.vehicleId}
      branch={branchId === "all" ? undefined : branchId}
    />
  );
}

// ----------------------------------------------------------------------------
// Detailed Crew Screen for Single Truck (Driver or Manager/Owner)
// ----------------------------------------------------------------------------
function CrewScreen({ navigation, driver = false, vehicleId, branch }) {
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
  const truckId = data?.vehicle?._id;
  const write = useOwnerWrite(`${key}:${truckId || "none"}:action`);
  const [note, setNote] = useState("");
  const [target, setTarget] = useState("");
  const [slot1, setSlot1] = useState("");
  const [slot2, setSlot2] = useState("");
  const [safe, setSafe] = useState(false);
  const [notice, setNotice] = useState("");
  const [asking, setAsking] = useState(false);
  const roster = useOwnerRequest(
    `${key}:candidates:${truckId || "none"}:${data?.vehicle?.branchId || "none"}`,
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
      String(row.branchId || "") === String(data?.vehicle?.branchId || ""),
  );
  const locked =
    !write.ready || write.busy || request.loading || !!request.error;
  const member = data?.members?.find(
    (row) => String(row._id) === String(user._id),
  );
  const pending =
    data?.pending && !data.pending.expired ? data.pending : null;

  async function act(action, extra = {}) {
    if (!data || (!write.draft && driver && !safe)) return;
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

  async function askCrew() {
    if (asking || !safe || !truckId) return;
    setAsking(true);
    try {
      const result = await service.crewAsk(truckId, {});
      setNotice(
        result.askedCount
          ? `Who-is-driving question queued for ${result.askedCount} crew members.`
          : "No new question was queued. Check again when the crew is available.",
      );
    } catch (error) {
      setNotice(error.message);
    } finally {
      setAsking(false);
    }
  }

  const regNo = data?.vehicle?.registrationNumber || "Truck";

  return (
    <View style={s.container}>
      <BackHeader
        title={driver ? "My Crew & Driving" : `Crew — ${regNo}`}
        subtitle="Driving status, driver roster & at-wheel handovers"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={s.detailScroll}>
        <RequestState request={request} />

        {!data && !request.loading && !request.error && (
          <View style={s.emptyCard}>
            <Ionicons name="people-outline" size={40} color="#94A3B8" />
            <Text style={s.emptyTitle}>No Crew Invitation Yet</Text>
            <Text style={s.emptySubtitle}>Ask your fleet manager or owner to assign you to a crew.</Text>
          </View>
        )}

        {data && (
          <>
            {/* Top Status Card */}
            <View style={s.detailCard}>
              <View style={s.detailCardHeader}>
                <View style={s.plateBadge}>
                  <View style={s.plateIndPill}>
                    <Text style={s.plateIndText}>IND</Text>
                  </View>
                  <Text style={s.plateNumberText}>{regNo}</Text>
                </View>

                <View
                  style={[
                    s.statusPill,
                    data.status === "DRIVING"
                      ? s.statusPillMoving
                      : data.status === "PENDING"
                      ? s.statusPillIdle
                      : s.statusPillStopped,
                  ]}
                >
                  <Text
                    style={[
                      s.statusPillText,
                      data.status === "DRIVING"
                        ? { color: "#166534" }
                        : data.status === "PENDING"
                        ? { color: "#B45309" }
                        : { color: "#475569" },
                    ]}
                  >
                    {labels[data.status] || "Driving unconfirmed"}
                  </Text>
                </View>
              </View>

              {/* At the Wheel banner */}
              {data.currentDriverId ? (
                <View style={s.atWheelBanner}>
                  <Ionicons name="speedometer" size={16} color="#16A34A" />
                  <Text style={s.atWheelBannerText}>
                    At the wheel:{" "}
                    <Text style={{ fontWeight: "800", color: "#0F172A" }}>
                      {nameFor(data, data.currentDriverId)}
                    </Text>
                  </Text>
                </View>
              ) : (
                <View style={[s.atWheelBanner, { backgroundColor: "#FEF3C7" }]}>
                  <Ionicons name="alert-circle-outline" size={16} color="#D97706" />
                  <Text style={[s.atWheelBannerText, { color: "#92400E" }]}>
                    No confirmed driver at the wheel right now.
                  </Text>
                </View>
              )}

              {/* Crew Members List */}
              <View style={{ gap: 8, marginTop: 4 }}>
                <Text style={s.subSectionTitle}>Assigned Crew Members</Text>
                {data.members.map((m) => (
                  <View key={m._id} style={s.memberRow}>
                    <View style={s.memberAvatar}>
                      <Ionicons name="person" size={15} color="#1A56DB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.memberName}>{nameFor(data, m._id)}</Text>
                      <Text style={s.memberSub}>
                        {m.accepted ? "Membership Accepted" : "Invitation Pending Acceptance"}
                        {m.status !== "ACTIVE" ? " · Inactive Account" : ""}
                      </Text>
                    </View>
                    {m.accepted ? (
                      <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                    ) : (
                      <Ionicons name="time" size={18} color="#D97706" />
                    )}
                  </View>
                ))}
                {!data.members.length && (
                  <Text style={s.emptyNoticeText}>No crew members assigned to this truck yet.</Text>
                )}
              </View>
            </View>

            {notice ? (
              <View style={s.noticeBanner}>
                <Ionicons name="checkmark-circle" size={16} color="#166534" />
                <Text style={s.noticeBannerText}>{notice}</Text>
              </View>
            ) : null}

            {driver && (
              <>
                <Button
                  label="Ask both phones: who is driving?"
                  variant="secondary"
                  disabled={locked || !safe || asking}
                  loading={asking}
                  onPress={askCrew}
                />
                <Button
                  label="Answer office questions"
                  variant="secondary"
                  onPress={() => navigation.navigate("Driver questions")}
                />
              </>
            )}

            {/* Driver Actions (Safe Stopped checkbox & Controls) */}
            {driver && (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: safe }}
                onPress={() => setSafe(!safe)}
                disabled={write.busy}
                style={s.safeCheckboxRow}
              >
                <Ionicons
                  name={safe ? "checkbox" : "square-outline"}
                  size={20}
                  color={safe ? "#1A56DB" : "#94A3B8"}
                />
                <Text style={s.safeCheckboxText}>
                  I am safely stopped and can confirm this action.
                </Text>
              </Pressable>
            )}

            {/* Action buttons */}
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
                        {data.status === "UNKNOWN" && !pending && (
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
                        {pending && String(pending.targetDriverId) === String(user._id) && (
                          <Card>
                            <AppText>
                              {nameFor(data, pending.fromDriverId)} asks you to take over driving.
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
                        {pending && String(pending.fromDriverId) === String(user._id) && (
                          <Button
                            label="Cancel handover request"
                            variant="secondary"
                            disabled={locked || !safe}
                            onPress={() =>
                              act("CANCEL", { proposalId: pending.id })
                            }
                          />
                        )}
                      </>
                    )}
                  </>
                )}

                {/* Owner Assignment Controls */}
                {owner && (
                  <View style={s.detailCard}>
                    <Text style={s.cardTitle}>Assign Truck Crew</Text>
                    <RequestState request={roster} />
                    <Text style={s.cardHint}>
                      Changing crew ends any active driving interval. New members must accept before driving can be confirmed.
                    </Text>

                    <Choice
                      label="Crew Member 1"
                      value={slot1}
                      onChange={setSlot1}
                      disabled={locked}
                      options={candidates.map((row) => [
                        row._id,
                        [row.firstName, row.lastName].filter(Boolean).join(" "),
                      ])}
                    />

                    <Choice
                      label="Crew Member 2 (Optional)"
                      value={slot2}
                      onChange={setSlot2}
                      disabled={locked}
                      options={(roster.data?.items || [])
                        .filter((row) => row._id !== slot1)
                        .map((row) => [
                          row._id,
                          [row.firstName, row.lastName].filter(Boolean).join(" "),
                        ])}
                    />

                    <Button
                      label={slot1 || slot2 ? "Save Crew Assignment" : "Remove Crew"}
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
                  </View>
                )}
              </>
            )}

            {/* Driving Timeline */}
            <View style={s.detailCard}>
              <Text style={s.cardTitle}>Driving Intervals Timeline</Text>
              {!data.intervals?.length && (
                <Text style={s.emptyNoticeText}>No driving intervals recorded yet.</Text>
              )}
              {(data.intervals || []).map((row) => (
                <View key={row._id} style={s.stintCard}>
                  <View style={s.stintHeader}>
                    <Text style={s.stintDriverName}>{nameFor(data, row.driverId)}</Text>
                    <View style={s.stintTag}>
                      <Text style={s.stintTagText}>
                        {stintLabels[row.status] || "Unconfirmed"}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.stintTimeText}>
                    {time(row.startAt)} →{" "}
                    {row.endAt
                      ? time(row.endAt)
                      : String(data.currentDriverId) === String(row.driverId)
                      ? "Active at wheel"
                      : "Unconfirmed"}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {write.error ? (
          <Text style={[s.errorText, { marginHorizontal: 16 }]}>{write.error}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // KPI Overview
  kpiRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  kpiVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 2,
  },

  // Search & Filter
  searchFilterContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 8,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#0F172A",
  },
  filterChipsScroll: {
    flexDirection: "row",
    gap: 6,
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  filterChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#1A56DB",
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  filterChipTextActive: {
    color: "#1A56DB",
    fontWeight: "700",
  },

  // Scroll Content
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
    gap: 12,
  },

  // Truck Card
  truckCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  plateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 6,
  },
  plateIndPill: {
    backgroundColor: "#1E3A8A",
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
  },
  plateIndText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
  },
  plateNumberText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.5,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillMoving: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  statusPillIdle: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  statusPillStopped: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Driver Box
  driverBoxAssigned: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  driverBoxUnassigned: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  driverAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  driverNameAssigned: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  driverNameUnassigned: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309",
  },
  driverDetailSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  atWheelBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  atWheelBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534",
  },

  // Meta Row
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaItemText: {
    fontSize: 11.5,
    color: "#64748B",
  },

  // Card Footer
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
  },
  manageCrewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EFF6FF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  manageCrewBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1A56DB",
  },

  // Detail Screen Styles
  detailScroll: {
    padding: 14,
    paddingBottom: 40,
    gap: 14,
  },
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  detailCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardHint: {
    fontSize: 11.5,
    color: "#64748B",
    lineHeight: 16,
  },
  subSectionTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
    textTransform: "uppercase",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
  },
  memberAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  memberName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  memberSub: {
    fontSize: 11,
    color: "#64748B",
  },
  atWheelBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    padding: 10,
    borderRadius: 8,
  },
  atWheelBannerText: {
    fontSize: 12,
    color: "#166534",
    flex: 1,
  },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    padding: 10,
    borderRadius: 8,
  },
  noticeBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#166534",
  },
  safeCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  safeCheckboxText: {
    fontSize: 12.5,
    color: "#334155",
    fontWeight: "500",
  },
  stintCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  stintHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stintDriverName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  stintTag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stintTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1A56DB",
  },
  stintTimeText: {
    fontSize: 11,
    color: "#64748B",
  },

  // Loading & Empty
  centerBox: {
    padding: 30,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 30,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
  emptyNoticeText: {
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  errorBox: {
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    fontSize: 12.5,
    color: "#DC2626",
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: "#1A56DB",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 4,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  driverSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
});
