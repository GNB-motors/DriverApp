import { VehicleCrewCard } from "./CrewScreens";
import HistoricalTripScreen from './HistoricalTripScreen';
import PushSettings from '../../components/PushSettings';
import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import {
  AppText,
  Card,
  Button,
  TextField,
  colors,
  radius,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useManagerData } from "../context/ManagerDataContext";
import {
  VehicleRow,
  DriverRow,
  AlertRow,
  KpiCard,
  SectionHeading,
  DataState,
  DutyCard,
} from "../components";
import FleetMap from "../components/FleetMap";
import VehicleTrailMap from "../components/VehicleTrailMap";
import Picker from "../../components/ui/SelectField";
import { ALERT_TITLES } from "../services/alertMetadata";
import { recentTrips, tripDetail } from "../services/tripSummary";
import { useFocusEffect } from "@react-navigation/native";
import { MenuRow } from "./DriverScreens";

const money = (value) => `₹${Number(value).toLocaleString("en-IN")}`;
const roleText = (t, key, fallback) => t("roleDesign", key) || fallback;
const date = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
export function ManagerPage({ navigation, title, subtitle, action, children, allowEmpty = false, showSourceErrors = true }) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { t } = useLanguage();
  const {
    data,
    loading,
    error,
    refresh,
    branchId,
    branches,
    roleLabel,
    selectBranch,
  } = useManagerData();
  const showBack = navigation.getState().type === "stack" && navigation.canGoBack();
  return (
    <View style={s.screen}>
      {focused && <StatusBar style="light" />}
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
          contentContainerStyle={[s.page, { paddingBottom: insets.bottom + 20 }]}
        >
          <LinearGradient
            colors={colors.gradient || colors.heroGradient}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[s.pageHero, { paddingTop: insets.top + 18, paddingLeft: 20 + insets.left, paddingRight: 20 + insets.right }]}
          >
            <View style={s.heroHeadingRow}>
              {showBack && (
                <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" style={s.backButton}>
                  <Ionicons name="chevron-back" size={22} color={colors.white} />
                </Pressable>
              )}
              <View style={s.heroHeading}>
                <AppText variant="caption" weight="semibold" color={colors.onPrimaryMuted} style={s.eyebrow}>
                  {roleLabel || roleText(t, "managerShellFallbackLabel", "MANAGER WORKSPACE")}
                </AppText>
                <AppText variant="h1" accessibilityRole="header" color={colors.white} style={s.pageTitle}>
                  {title}
                </AppText>
                {subtitle ? <AppText variant="small" color={colors.onPrimaryMuted} style={s.pageSubtitle}>{subtitle}</AppText> : null}
              </View>
              {action ? <View style={s.heroAction}>{action}</View> : null}
            </View>
            {branches.length > 1 ? (
              <ScrollView horizontal style={s.branchScroller} showsHorizontalScrollIndicator={false} contentContainerStyle={s.branchRow}>
                {branches.map((branch) => {
                  const selected = branchId === branch.id;
                  return (
                    <Pressable
                      key={branch.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Branch: ${branch.id === "all" ? "All branches" : branch.name}`}
                      accessibilityState={{ selected }}
                      style={[s.branchFilter, selected ? s.branchFilterSelected : s.branchFilterUnselected]}
                      onPress={() => selectBranch(branch.id)}
                    >
                      <Ionicons name="business-outline" size={15} color={selected ? colors.primaryDeep : colors.white} />
                      <AppText variant="caption" weight="semibold" color={selected ? colors.primaryDeep : colors.white}>
                        {branch.id === "all" ? "All branches" : branch.name}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
          </LinearGradient>
          <View style={[s.sheet, { marginLeft: 16 + insets.left, marginRight: 16 + insets.right }]}>
            <View style={s.content}>
              {error && !allowEmpty ? (
                <DataState state="error" onRetry={refresh} />
              ) : !data && !allowEmpty ? (
                <DataState state="loading" />
              ) : (
                <>
                  {showSourceErrors && Object.entries(data?.errors || {}).map(([key, message]) => (
                    <Card key={key}>
                      <AppText color={colors.error}>{key}: {message}</AppText>
                    </Card>
                  ))}
                  {children}
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function ManagerHome({ navigation }) {
  const { t } = useLanguage();
  const { data, branchId, branches } = useManagerData();
  const vehicleCount = data?.errors?.vehicles ? "—" : data?.vehicles.length ?? 0;
  const driverCount = data?.errors?.drivers ? "—" : data?.drivers.length ?? 0;
  const pendingFuel = data?.errors?.fuel
    ? null
    : data?.fuel.filter((item) => item.status === "Pending review").length ?? 0;
  const pendingFuelDetail = pendingFuel == null
    ? roleText(t, "managerHomeFuelRecordsUnavailable", "Fuel records unavailable")
    : roleText(t, "managerHomePendingFuelDetail", "{count} pending fuel slips").replace("{count}", String(pendingFuel));
  const livePositionsAvailable = !data?.errors?.positions && !data?.errors?.vehicles;
  const selectedBranchLabel = branchId === "all"
    ? roleText(t, "managerHomeAuthorizedBranches", "Authorized branches")
    : branches.find((branch) => branch.id === branchId)?.name || roleText(t, "managerHomeSelectedBranch", "Selected branch");
  const recognizedStatuses = new Set(["moving", "stopped", "idling", "offline", "unknown"]);
  const unavailableStatusCount = (data?.vehicles || []).filter((vehicle) => {
    const status = String(vehicle.status || "").toLowerCase();
    return status === "unknown" || !recognizedStatuses.has(status);
  }).length;
  return (
    <ManagerPage
      navigation={navigation}
      title="Your fleet, in focus."
      subtitle={roleText(t, "managerHomeSubtitle", "Live positions, drivers, and recent trips.")}
    >
      <LinearGradient colors={colors.heroGradient} style={s.hero}>
        <AppText variant="caption" color={colors.onPrimaryMuted}>
          {selectedBranchLabel} · LOADED RECORDS
        </AppText>
        <AppText variant="display" color={colors.white}>
          {vehicleCount} trucks.
        </AppText>
        {livePositionsAvailable ? (
          <View style={s.liveSummary}>
            <AppText color={colors.onPrimaryMuted}>
              {data?.vehicles.filter((v) => v.status === "moving").length || 0}{" "}
              moving ·{" "}
              {data?.vehicles.filter((v) => v.status === "offline").length || 0}{" "}
              offline
            </AppText>
            <AppText variant="caption" color={colors.onPrimaryMuted}>
              {roleText(t, "managerHomeStatusUnavailableCount", "Status unavailable: {count}").replace("{count}", String(unavailableStatusCount))}
            </AppText>
          </View>
        ) : (
          <AppText color={colors.onPrimaryMuted}>{roleText(t, "managerHomeLiveCountsUnavailable", "Live position counts unavailable")}</AppText>
        )}
        <Button
          label="Explore fleet"
          variant="secondary"
          onPress={() => navigation.navigate("Fleet")}
          style={s.heroButton}
        />
      </LinearGradient>
      <View style={s.metrics}>
        <KpiCard
          value={driverCount}
          label="Drivers"
          icon="people-outline"
          caption={data?.errors?.drivers ? roleText(t, "managerHomeDriverRecordsUnavailable", "Driver records unavailable") : "In selected branch"}
        />
        <KpiCard
          value={pendingFuel == null ? "—" : pendingFuel}
          label={roleText(t, "managerHomePendingFuelLabel", "Pending fuel slips")}
          icon="receipt-outline"
          caption={pendingFuel == null ? roleText(t, "managerHomeCountsUnavailable", "Counts unavailable") : roleText(t, "managerHomePendingFuelCaption", "In the selected branch")}
        />
      </View>
      <RecentTrips navigation={navigation} data={data} />
      <SectionHeading title="Keep things moving" />
      <MenuRow
        title="Duty board"
        detail="Driving, resting and truck links"
        icon="time-outline"
        onPress={() => navigation.navigate("Duty board")}
      />
      <MenuRow
        title="Review fuel slips"
        detail={pendingFuelDetail}
        icon="water-outline"
        onPress={() => navigation.navigate("Fuel review")}
      />
      <MenuRow
        title="Maintenance & issues"
        detail={roleText(t, "managerHomeMaintenanceDetail", "Review workshop bills and vehicle issues")}
        icon="construct-outline"
        onPress={() => navigation.navigate("Maintenance")}
      />
    </ManagerPage>
  );
}
export function RecentTrips({ navigation, data }) {
  const trips = recentTrips(data?.trips);
  const plates = Object.fromEntries(
    (data?.vehicles || []).map((v) => [v.id, v.plate]),
  );
  return (
    <>
      <SectionHeading
        title="Recent trips"
        caption="Latest GPS-detected journeys."
      />
      {trips.map((trip) => (
        <MenuRow
          key={trip.id}
          title={`${trip.from} → ${trip.to}`}
          detail={tripDetail(trip, plates[trip.vehicleId])}
          icon="navigate-outline"
          onPress={() => navigation.navigate("Manager trip", { id: trip.id })}
        />
      ))}
      {data && !data.errors.trips && !trips.length && (
        <Card>
          <AppText weight="semibold">No trips yet.</AppText>
          <AppText muted>
            Journeys appear here once trucks are detected on the road.
          </AppText>
        </Card>
      )}
      {trips.length > 0 && (
        <Button
          label="View all trips"
          variant="secondary"
          onPress={() => navigation.navigate("Fleet trips")}
        />
      )}
    </>
  );
}
function Empty({
  title = "Nothing to show",
  detail = "No records in this branch.",
}) {
  return (
    <Card style={s.empty}>
      <Ionicons
        name="checkmark-circle-outline"
        size={30}
        color={colors.primary}
      />
      <AppText variant="h3" center>
        {title}
      </AppText>
      <AppText muted center>
        {detail}
      </AppText>
    </Card>
  );
}
export function ManagerLive({ navigation }) {
  const { data } = useManagerData();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const vehicles =
    data?.vehicles.filter(
      (v) =>
        (filter === "all" || v.status === filter) &&
        `${v.plate} ${v.model}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    ) || [];
  const openMap = () => navigation.navigate("Fleet map", { filter });
  return (
    <ManagerPage
      navigation={navigation}
      title="Fleet positions"
      subtitle="A view of your trucks on the road."
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open live map"
          onPress={openMap}
          style={s.headerAction}
        >
          <Ionicons name="expand-outline" size={22} color={colors.primary} />
        </Pressable>
      }
    >
      <TextField
        accessibilityLabel="Search trucks"
        placeholder="Registration or model"
        value={search}
        onChangeText={setSearch}
        icon="search-outline"
      />
      <FleetMap
        vehicles={vehicles}
        onSelectVehicle={(vehicle) =>
          navigation.navigate("Vehicle detail", { id: vehicle.id })
        }
        onExpand={openMap}
      />
      <Filters
        values={["all", "moving", "stopped", "idling", "offline"]}
        selected={filter}
        onSelect={setFilter}
      />
      {vehicles.map((v, i) => (
        <View key={v.id} style={s.content}>
          <AppText variant="caption" muted>
            MARKER {i + 1}
          </AppText>
          <VehicleRow
            vehicle={v}
            onPress={() => navigation.navigate("Vehicle detail", { id: v.id })}
          />
        </View>
      ))}
      {!vehicles.length && !data?.errors?.vehicles && !data?.errors?.positions && <Empty />}
    </ManagerPage>
  );
}
export function Fleet({ navigation }) {
  const { data } = useManagerData();
  const [search, setSearch] = useState("");
  const vehicles =
    data?.vehicles.filter((v) =>
      `${v.plate} ${v.model}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    ) || [];
  return (
    <ManagerPage
      navigation={navigation}
      title="Your fleet"
      subtitle="Every truck, one clear view."
    >
      <TextField
        accessibilityLabel="Search vehicles"
        label="Search vehicles"
        value={search}
        onChangeText={setSearch}
        placeholder="Plate or model"
        icon="search-outline"
      />
      {vehicles.map((v) => (
        <VehicleRow
          key={v.id}
          vehicle={v}
          onPress={() => navigation.navigate("Vehicle detail", { id: v.id })}
        />
      ))}
      {!vehicles.length && !data?.errors?.positions && !data?.errors?.vehicles && <Empty />}
    </ManagerPage>
  );
}
export function VehicleDetail({ navigation, route }) {
  const { user } = useAuth();
  const { data } = useManagerData();
  const vehicle = data?.vehicles.find((v) => v.id === route.params?.id);
  const driver = data?.drivers.find((d) => d.id === vehicle?.driverId);
  return (
    <ManagerPage
      navigation={navigation}
      title="Vehicle details"
      subtitle="Position, people and pending work."
    >
      {vehicle ? (
        <>
          <VehicleRow vehicle={vehicle} />
          <VehicleCrewCard navigation={navigation} vehicleId={vehicle.id} />
          <VehicleTrailMap vehicle={vehicle} />
          <MenuRow
            title={driver?.name || "No driver linked"}
            detail={
              driver ? "Open driver details" : "Link a driver from this branch"
            }
            icon="person-outline"
            onPress={() =>
              navigation.navigate(
                driver ? "Driver detail" : "Truck handover",
                driver ? { id: driver.id } : { vehicleId: vehicle.id },
              )
            }
          />
          <MenuRow
            title="Odometer"
            detail={`${vehicle.odometerKm == null ? "Unavailable" : vehicle.odometerKm.toLocaleString("en-IN")} km · reading`}
            icon="speedometer-outline"
          />
          <Button
            label="Link / hand over truck"
            variant="secondary"
            onPress={() =>
              navigation.navigate("Truck handover", { vehicleId: vehicle.id })
            }
          />
          <SectionHeading title="Recent trips" caption="Recent loaded records; open the trip list for complete history." />
          {data.trips
            .filter((t) => t.vehicleId === vehicle.id)
            .map((t) => (
              <MenuRow
                key={t.id}
                title={`${t.from} → ${t.to}`}
                detail={`${t.distanceKm} km · ${t.status}`}
                icon="navigate-outline"
                onPress={() =>
                  navigation.navigate("Manager trip", { id: t.id })
                }
              />
            ))}
          {!data.trips.some((t) => t.vehicleId === vehicle.id) && (
            <AppText muted>No trips for this truck in the loaded recent records.</AppText>
          )}
          {user.role === 'OWNER' && <Button label="All trips for this truck" variant="secondary" onPress={() => navigation.navigate('Fleet trips', { vehicleId: vehicle.id })} />}
        </>
      ) : (
        <Unavailable />
      )}
    </ManagerPage>
  );
}
export function Drivers({ navigation, route }) {
  const { t } = useLanguage();
  const { data } = useManagerData();
  const duty = route.name === "Duty board";
  const [filter, setFilter] = useState("All");
  const availableStates = [...new Set((data?.drivers || []).map((driver) => driver.state).filter((state) => state && state !== "Unavailable"))];
  const filters = ["All", ...availableStates, "Unlinked"];
  const drivers =
    data?.drivers.filter(
      (d) =>
        filter === "All" ||
        (filter === "Unlinked" ? !d.vehicleId : d.state === filter),
    ) || [];
  return (
    <ManagerPage
      navigation={navigation}
      title={duty ? "Duty board" : "Your drivers"}
      subtitle={duty ? roleText(t, "managerDutySubtitle", "Driver and truck assignments in this branch.") : "People behind every kilometre."}
    >
      <Filters
        values={filters}
        selected={filter}
        onSelect={setFilter}
      />
      {duty && (data?.drivers || []).some((driver) => !Number.isFinite(driver.drivingMinutes)) && (
        <Card>
          <AppText weight="semibold">{roleText(t, "managerDutyTimeUnavailableTitle", "Driving-time data unavailable")}</AppText>
          <AppText muted>{roleText(t, "managerDutyTimeUnavailableBody", "Driver assignments are shown below; duty hours are not connected in this view.")}</AppText>
        </Card>
      )}
      {drivers.map((driver) => (
        <Pressable
          key={driver.id}
          accessibilityRole="button"
          accessibilityLabel={`Open ${driver.name}`}
          onPress={() =>
            navigation.navigate("Driver detail", { id: driver.id })
          }
        >
          <DriverRow driver={driver} />
          {duty && Number.isFinite(driver.drivingMinutes) && (
            <AppText variant="caption" muted style={s.dutyCaption}>
              {Math.floor(driver.drivingMinutes / 60)}h{" "}
              {driver.drivingMinutes % 60}m driving
            </AppText>
          )}
        </Pressable>
      ))}
      {!drivers.length && !data?.errors?.drivers && <Empty />}
      <Button
        label="Link a driver to a truck"
        variant="secondary"
        onPress={() => navigation.navigate("Truck handover")}
      />
    </ManagerPage>
  );
}
export function DriverDetail({ navigation, route }) {
  const { user } = useAuth();
  const { data } = useManagerData();
  const driver = data?.drivers.find((d) => d.id === route.params?.id);
  const vehicle = data?.vehicles.find((v) => v.id === driver?.vehicleId);
  return (
    <ManagerPage navigation={navigation} title="Driver details">
      {driver ? (
        <>
          <DriverRow driver={driver} />
          {user.role === 'OWNER' && <Button label="Call driver" icon="call-outline" disabled={!driver.mobileNumber} onPress={() => navigation.navigate('Owner calls', { driverId: driver.id, autoDial: true, callRequest: String(Date.now()) })} />}
          {Number.isFinite(driver.limitMinutes) ? <DutyCard driver={driver} /> : <AppText muted>Fleet duty summary is not connected.</AppText>}
          {vehicle ? (
            <VehicleRow
              vehicle={vehicle}
              onPress={() =>
                navigation.navigate("Vehicle detail", { id: vehicle.id })
              }
            />
          ) : (
            <Empty
              title="No truck linked"
              detail="Choose a truck below to request an assignment."
            />
          )}
          <Button
            label="Link / change truck"
            onPress={() =>
              navigation.navigate("Truck handover", { driverId: driver.id })
            }
          />
        </>
      ) : (
        <Unavailable />
      )}
    </ManagerPage>
  );
}
export function Handover({ navigation }) {
  return (
    <ManagerPage navigation={navigation} title="Truck handover">
      <Card>
        <AppText muted>
          Truck handover is not connected yet. Use the web dashboard to change
          assignments.
        </AppText>
      </Card>
    </ManagerPage>
  );
}
export function Alerts({ navigation }) {
  const { service, branchId } = useManagerData();
  const [filter, setFilter] = useState("Pending");
  const [days, setDays] = useState("30 days");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [storedResult, setResult] = useState(null);
  const resultScope = `${branchId}:${page}:${filter}:${days}:${search}:${type}`;
  const result = storedResult?.scope === resultScope ? storedResult : null;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setBusy(true);
      setError("");
      setResult(null);
      const to = new Date();
      const from = new Date(
        to.getTime() - Number(days.split(" ")[0]) * 86400000,
      );
      const debounce = setTimeout(() => {
        service
          .listOwnerAlerts({
            branchId: branchId === "all" ? undefined : branchId,
            page,
            type: type || undefined,
            acknowledged:
              filter === "All" ? undefined : filter === "Acknowledged",
            vehicle: search.trim() || undefined,
            from: from.toISOString(),
            to: to.toISOString(),
          })
          .then((value) => {
            if (active) setResult({ ...value, scope: resultScope });
          })
          .catch((failure) => {
            if (active) setError(failure.message);
          })
          .finally(() => {
            if (active) setBusy(false);
          });
      }, 250);
      return () => {
        active = false;
        clearTimeout(debounce);
      };
    }, [service, branchId, page, filter, days, search, type, revision]),
  );
  return (
    <ManagerPage
      navigation={navigation}
      title="Owner alerts"
      subtitle="The same owner-alert feed as the web dashboard."
    >
      <Filters
        values={["Pending", "All", "Acknowledged"]}
        selected={filter}
        onSelect={(value) => {
          setFilter(value);
          setPage(1);
        }}
      />
      <Filters
        values={["7 days", "30 days", "90 days"]}
        selected={days}
        onSelect={(value) => {
          setDays(value);
          setPage(1);
        }}
      />
      <View style={{ gap: 8 }}>
        <AppText variant="label" muted>
          Alert type
        </AppText>
        <Picker
          accessibilityLabel="Alert type"
          selectedValue={type}
          onValueChange={(value) => {
            setType(value);
            setPage(1);
          }}
        >
          <Picker.Item label="All alert types" value="" />
          {Object.entries(ALERT_TITLES).map(([code, label]) => (
            <Picker.Item key={code} label={label} value={code} />
          ))}
        </Picker>
      </View>
      <TextField
        label="Vehicle registration"
        placeholder="Filter by exact registration"
        value={search}
        onChangeText={(value) => {
          setSearch(value);
          setPage(1);
        }}
        icon="search-outline"
      />
      {busy ? (
        <DataState state="loading" />
      ) : error ? (
        <Card>
          <AppText color={colors.error}>{error}</AppText>
          <Button
            label="Retry alerts"
            onPress={() => setRevision((value) => value + 1)}
          />
        </Card>
      ) : result ? (
        <>
          <AppText muted>
            {result.total} alerts · {result.unacknowledgedCount} pending in this
            view
          </AppText>
          {result.records.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onPress={() =>
                navigation.navigate("Manager alert", {
                  id: alert.id,
                  alert,
                  branchId,
                })
              }
            />
          ))}
          {!result.records.length && (
            <Empty title="No alerts match these filters" />
          )}
          {result.totalPages > 1 && (
            <>
              <AppText center>
                Page {page} of {result.totalPages}
              </AppText>
              <View style={s.metrics}>
                <Button
                  label="Previous"
                  variant="secondary"
                  disabled={page <= 1}
                  onPress={() => setPage((value) => value - 1)}
                />
                <Button
                  label="Next"
                  variant="secondary"
                  disabled={page >= result.totalPages}
                  onPress={() => setPage((value) => value + 1)}
                />
              </View>
            </>
          )}
        </>
      ) : null}
    </ManagerPage>
  );
}
export function AlertDetail({ navigation, route }) {
  const { data, mutate, branchId } = useManagerData();
  const initial =
    route.params?.alert && route.params.branchId === branchId
      ? route.params.alert
      : data?.alerts.find((item) => item.id === route.params?.id);
  const [acknowledged, setAcknowledged] = useState(false);
  const alert = initial
    ? { ...initial, acknowledged: initial.acknowledged || acknowledged }
    : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const vehicle = data?.vehicles.find(
    (item) =>
      item.plate === alert?.vehicleNumber ||
      item.telemetryRegistration === alert?.vehicleNumber,
  );
  async function acknowledge() {
    setBusy(true);
    setError("");
    try {
      await mutate((service, branchId) =>
        service.acknowledgeAlert(alert.id, { branchId }),
      );
      setAcknowledged(true);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ManagerPage navigation={navigation} title="Alert details">
      {alert ? (
        <>
          <AlertRow alert={alert} />
          {vehicle && (
            <MenuRow
              title="Related truck"
              detail={vehicle.plate}
              icon="bus-outline"
              onPress={() =>
                navigation.navigate("Vehicle detail", { id: vehicle.id })
              }
            />
          )}
          <AppText muted>Acknowledgement is saved to the server.</AppText>
          {error ? <AppText color={colors.error}>{error}</AppText> : null}
          <Button
            label={alert.acknowledged ? "Acknowledged" : "Acknowledge"}
            loading={busy}
            disabled={alert.acknowledged}
            onPress={acknowledge}
          />
        </>
      ) : (
        <Unavailable />
      )}
    </ManagerPage>
  );
}
export function Reviews({ navigation, route }) {
  const { data } = useManagerData();
  const isFuel = route.name === "Fuel review";
  const [filter, setFilter] = useState("Pending");
  const resources = isFuel ? ["fuel"] : ["issues", "bills"];
  return (
    <ManagerPage
      navigation={navigation}
      title={isFuel ? "Fuel slip review" : "Maintenance & issues"}
      subtitle="Review evidence. Record a clear decision."
    >
      <Filters
        values={["Pending", "All"]}
        selected={filter}
        onSelect={setFilter}
      />
      {resources.map((resource) => {
        const rows =
          data?.[resource].filter(
            (item) =>
              filter === "All" ||
              (resource === "issues"
                ? item.status !== "Resolved"
                : item.status === "Pending review"),
          ) || [];
        return (
          <View key={resource} style={s.content}>
            {!isFuel && (
              <SectionHeading
                title={
                  resource === "issues" ? "Vehicle issues" : "Workshop bills"
                }
              />
            )}
            {rows.map((item) => (
              <MenuRow
                key={item.id}
                title={item.title || item.station}
                detail={`${item.amountInr ? `${money(item.amountInr)} · ` : ""}${item.status}`}
                icon={
                  resource === "fuel"
                    ? "water-outline"
                    : resource === "issues"
                      ? "construct-outline"
                      : "receipt-outline"
                }
                onPress={() =>
                  navigation.navigate("Review detail", {
                    resource,
                    id: item.id,
                  })
                }
              />
            ))}
            {!rows.length && (
              <Empty
                title={
                  isFuel
                    ? "No fuel slips in this view"
                    : "No records in this view"
                }
              />
            )}
          </View>
        );
      })}
    </ManagerPage>
  );
}
export function ReviewDetail({ navigation }) {
  return (
    <ManagerPage navigation={navigation} title="Review details">
      <Card>
        <AppText muted>
          Review submission and receipt uploads are not connected yet. Use the
          web dashboard for approvals.
        </AppText>
      </Card>
    </ManagerPage>
  );
}
export function Documents({ navigation }) {
  const { data } = useManagerData();
  return (
    <ManagerPage
      navigation={navigation}
      title="Fleet documents"
      subtitle="A little preparation keeps things moving."
    >
      {data?.documents.map((doc) => (
        <MenuRow
          key={doc.id}
          title={doc.title}
          detail={`${doc.status} · ${date(doc.expiresAt)}`}
          icon="document-text-outline"
          onPress={() =>
            navigation.navigate("Manager document", { id: doc.id })
          }
        />
      ))}
      {!data?.documents.length && <Empty />}
    </ManagerPage>
  );
}
export function DocumentDetail({ navigation, route }) {
  const { data } = useManagerData();
  const doc = data?.documents.find((item) => item.id === route.params?.id);
  return (
    <ManagerPage navigation={navigation} title="Document details">
      {doc ? (
        <Card style={s.empty}>
          <Ionicons
            name="document-text-outline"
            size={46}
            color={colors.primary}
          />
          <AppText variant="h2" center>
            {doc.title}
          </AppText>
          <AppText>
            {doc.status} · Expires {date(doc.expiresAt)}
          </AppText>
          <AppText muted center>
            record only. No document file is attached.
          </AppText>
        </Card>
      ) : (
        <Unavailable />
      )}
    </ManagerPage>
  );
}
export function Trips({ navigation, route }) {
  if (route.name === 'Manager trip') return <HistoricalTripScreen navigation={navigation} route={route} />;
  return <FleetTripList navigation={navigation} />;
}
function FleetTripList({ navigation }) {
  const { data } = useManagerData();
  const trips = data?.trips || [];
  return <ManagerPage navigation={navigation} title="Fleet trips" subtitle="GPS-detected journeys.">
    {trips.map((trip) => <MenuRow key={trip.id} title={`${trip.from} → ${trip.to}`} detail={`${trip.distanceKm ?? 'Unknown'} km · ${trip.status}`} icon="navigate-outline" onPress={() => navigation.navigate('Manager trip', { id: trip.id })} />)}
    {!trips.length && !data?.errors?.trips && <Unavailable />}
  </ManagerPage>;
}

export function More({ navigation }) {
  const { t, language } = useLanguage();
  const indicSectionTitleStyle = language === "hi" || language === "bn"
    ? { lineHeight: 30, paddingTop: 2, paddingBottom: 2 }
    : undefined;
  return (
    <ManagerPage
      navigation={navigation}
      title="Fleet essentials"
      subtitle="The rest of your working toolkit."
    >
      <SectionHeading title={roleText(t, "managerMoreFleetPeople", "Fleet & people")} titleStyle={indicSectionTitleStyle} caption={roleText(t, "managerMoreFleetPeopleCaption", "Vehicles, drivers, and trip history.")} />
      {[["Fleet", "bus-outline"], ["Duty board", "time-outline"], ["Fleet trips", "navigate-outline"], ["Team & access", "people-outline"]].map(([name, icon]) => (
        <MenuRow key={name} title={name} icon={icon} onPress={() => navigation.navigate(name)} />
      ))}
      <SectionHeading title={roleText(t, "managerMoreRecordsReviews", "Records & reviews")} titleStyle={indicSectionTitleStyle} caption={roleText(t, "managerMoreRecordsReviewsCaption", "Operational follow-up for this branch.")} />
      {[["Maintenance", "construct-outline"], ["Fuel review", "water-outline"], ["Fleet documents", "document-text-outline"], ["AdBlue / DEF", "flask-outline"]].map(([name, icon]) => (
        <MenuRow key={name} title={name} icon={icon} onPress={() => navigation.navigate(name)} />
      ))}
      <SectionHeading title={roleText(t, "managerMoreAdministration", "Administration")} titleStyle={indicSectionTitleStyle} />
      <MenuRow title="Settings & support" icon="settings-outline" onPress={() => navigation.navigate("Manager settings")} />
    </ManagerPage>
  );
}
export function Settings({ navigation }) {
  const { user, logout } = useAuth();
  const [error, setError] = useState("");
  return (
    <ManagerPage navigation={navigation} title="Settings & support">
      <PushSettings />
      <MenuRow
        title={user?.name || user?.firstName || "Account"}
        detail={user?.role}
        icon="person-outline"
      />
      {error ? <AppText color={colors.error}>{error}</AppText> : null}
      <Button
        label="Log out"
        variant="secondary"
        onPress={async () => {
          try {
            await logout();
          } catch (err) {
            setError(err.message);
          }
        }}
      />
    </ManagerPage>
  );
}

function Unavailable() {
  return (
    <Empty
      title="Record unavailable"
      detail="Refresh this view or choose another record in the selected branch."
    />
  );
}

// ─── SOS Centre ──────────────────────────────────────────────────────────────

const SOS_MOCK = [
  {
    id: "sos-001",
    driverName: "Ramesh Kumar",
    vehicleNumber: "MH 04 AB 1234",
    type: "accident",
    typeLabel: "Accident",
    location: "NH-44, near Nagpur toll",
    reportedAt: new Date(Date.now() - 7 * 60000).toISOString(),
    status: "open",
  },
  {
    id: "sos-002",
    driverName: "Sunil Patil",
    vehicleNumber: "MH 12 CD 5678",
    type: "breakdown",
    typeLabel: "Breakdown",
    location: "Pune-Mumbai Expressway, km 42",
    reportedAt: new Date(Date.now() - 34 * 60000).toISOString(),
    status: "open",
  },
  {
    id: "sos-003",
    driverName: "Ajay Singh",
    vehicleNumber: "GJ 01 EF 9012",
    type: "medical",
    typeLabel: "Medical emergency",
    location: "Ahmedabad Ring Road, near Vatva",
    reportedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    status: "acknowledged",
    acknowledgedBy: "Manager (you)",
  },
  {
    id: "sos-004",
    driverName: "Vikram Yadav",
    vehicleNumber: "RJ 14 GH 3456",
    type: "safety",
    typeLabel: "Safety threat",
    location: "Jaipur bypass, Sikar road",
    reportedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    status: "resolved",
    resolvedBy: "Manager (you)",
  },
];

const SOS_TYPE_COLOR = {
  accident: colors.error,
  medical: colors.error,
  breakdown: colors.warning,
  safety: "#8B5CF6",
};

function sosBadgeColor(status) {
  if (status === "open") return colors.error;
  if (status === "acknowledged") return colors.warning;
  return colors.success;
}

function sosTimeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  return `${h}h ${diff % 60}m ago`;
}

function SosRow({ item, onPress }) {
  const dotColor = SOS_TYPE_COLOR[item.type] || colors.error;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`SOS: ${item.driverName}, ${item.typeLabel}`}
      onPress={onPress}
      style={{ marginBottom: 10 }}
    >
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: dotColor,
              marginTop: 2,
            }}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <AppText weight="semibold">{item.driverName}</AppText>
              <AppText variant="small" muted>{sosTimeAgo(item.reportedAt)}</AppText>
            </View>
            <AppText variant="small" color={dotColor} weight="semibold">{item.typeLabel}</AppText>
            <AppText variant="small" muted>{item.vehicleNumber}</AppText>
            <AppText variant="small" muted numberOfLines={1}>{item.location}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Card>
    </Pressable>
  );
}

export function SosCentre({ navigation }) {
  const [filter, setFilter] = useState("Open");
  const filterMap = { Open: "open", Acknowledged: "acknowledged", Resolved: "resolved" };
  const filtered = SOS_MOCK.filter((item) => item.status === filterMap[filter]);

  return (
    <ManagerPage
      navigation={navigation}
      title="SOS centre"
      subtitle="Active incidents need an immediate response."
      allowEmpty
    >
      <Filters
        values={["Open", "Acknowledged", "Resolved"]}
        selected={filter}
        onSelect={setFilter}
      />
      {filtered.length === 0 ? (
        <Card>
          <View style={s.empty}>
            <Ionicons
              name={filter === "Open" ? "shield-checkmark-outline" : "checkmark-circle-outline"}
              size={40}
              color={filter === "Open" ? colors.success : colors.textMuted}
            />
            <AppText weight="semibold" style={{ textAlign: "center" }}>
              {filter === "Open" ? "No open SOS incidents" : `No ${filter.toLowerCase()} incidents`}
            </AppText>
            <AppText variant="small" muted style={{ textAlign: "center" }}>
              {filter === "Open"
                ? "All drivers are safe. Open incidents will appear here immediately."
                : `${filter} incidents will appear here.`}
            </AppText>
          </View>
        </Card>
      ) : (
        <View>
          {filter === "Open" && (
            <View
              style={{
                backgroundColor: colors.expiredBg,
                borderRadius: radius.md,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <Ionicons name="warning-outline" size={18} color={colors.error} />
              <AppText variant="small" color={colors.error} weight="semibold">
                {filtered.length} open {filtered.length === 1 ? "incident" : "incidents"} — call the driver immediately
              </AppText>
            </View>
          )}
          {filtered.map((item) => (
            <SosRow
              key={item.id}
              item={item}
              onPress={() => navigation.navigate("SOS detail", { sos: item })}
            />
          ))}
        </View>
      )}
    </ManagerPage>
  );
}

// ─── SOS Detail ──────────────────────────────────────────────────────────────

function SosTimelineEvent({ icon, label, time, color }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 8 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: color + "20",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1, paddingTop: 4 }}>
        <AppText variant="small" weight="semibold">{label}</AppText>
        {time ? <AppText variant="small" muted>{sosTimeAgo(time)}</AppText> : null}
      </View>
    </View>
  );
}

export function SosDetail({ navigation, route }) {
  const item = route?.params?.sos ?? SOS_MOCK[0];
  const [status, setStatus] = useState(item.status);
  const [busy, setBusy] = useState(false);
  const dotColor = SOS_TYPE_COLOR[item.type] || colors.error;

  function handleAcknowledge() {
    setBusy(true);
    setTimeout(() => {
      setStatus("acknowledged");
      setBusy(false);
    }, 600);
  }

  function handleResolve() {
    setBusy(true);
    setTimeout(() => {
      setStatus("resolved");
      setBusy(false);
    }, 600);
  }

  return (
    <ManagerPage
      navigation={navigation}
      title="SOS detail"
      subtitle={item.typeLabel}
      allowEmpty
    >
      {/* Status banner */}
      <View
        style={{
          backgroundColor: sosBadgeColor(status) + "18",
          borderRadius: radius.md,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Ionicons
          name={status === "open" ? "warning" : status === "acknowledged" ? "eye-outline" : "checkmark-circle-outline"}
          size={22}
          color={sosBadgeColor(status)}
        />
        <View style={{ flex: 1 }}>
          <AppText weight="semibold" color={sosBadgeColor(status)} style={{ textTransform: "capitalize" }}>
            {status}
          </AppText>
          <AppText variant="small" muted>Reported {sosTimeAgo(item.reportedAt)}</AppText>
        </View>
      </View>

      {/* Driver card */}
      <Card>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.infoBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="semibold">{item.driverName}</AppText>
              <AppText variant="small" muted>{item.vehicleNumber}</AppText>
            </View>
            <Button
              label="Call"
              size="small"
              icon="call-outline"
              onPress={() => {}}
            />
          </View>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Ionicons name="location-outline" size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
            <AppText variant="small" muted style={{ flex: 1 }}>{item.location}</AppText>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View
              style={{
                backgroundColor: dotColor + "18",
                borderRadius: radius.full,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <AppText variant="small" color={dotColor} weight="semibold">{item.typeLabel}</AppText>
            </View>
          </View>
        </View>
      </Card>

      {/* Emergency actions */}
      <Card>
        <AppText variant="label" muted style={{ marginBottom: 10 }}>Emergency contacts</AppText>
        <View style={{ gap: 8 }}>
          <Button
            label="Call 112 (Emergency)"
            variant="secondary"
            icon="call-outline"
            onPress={() => {}}
          />
          <Button
            label="Call driver's family"
            variant="secondary"
            icon="people-outline"
            onPress={() => {}}
          />
        </View>
      </Card>

      {/* Timeline */}
      <Card>
        <AppText variant="label" muted style={{ marginBottom: 6 }}>Incident timeline</AppText>
        <SosTimelineEvent
          icon="warning-outline"
          label="SOS reported by driver"
          time={item.reportedAt}
          color={colors.error}
        />
        {status !== "open" && (
          <SosTimelineEvent
            icon="eye-outline"
            label={`Acknowledged by ${item.acknowledgedBy || "manager"}`}
            time={new Date(Date.now() - 20 * 60000).toISOString()}
            color={colors.warning}
          />
        )}
        {status === "resolved" && (
          <SosTimelineEvent
            icon="checkmark-circle-outline"
            label={`Resolved by ${item.resolvedBy || "manager"}`}
            time={new Date(Date.now() - 5 * 60000).toISOString()}
            color={colors.success}
          />
        )}
      </Card>

      {/* Action buttons */}
      {status === "open" && (
        <Button
          label={busy ? "Acknowledging…" : "Acknowledge incident"}
          variant="primary"
          onPress={handleAcknowledge}
          disabled={busy}
        />
      )}
      {status === "acknowledged" && (
        <Button
          label={busy ? "Resolving…" : "Mark as resolved"}
          variant="primary"
          onPress={handleResolve}
          disabled={busy}
        />
      )}
    </ManagerPage>
  );
}

function Filters({ values, selected, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.filters}
    >
      {values.map((value) => (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityLabel={`Filter: ${value}`}
          accessibilityState={{ selected: selected === value }}
          style={[s.branch, selected === value && s.branchSelected]}
          onPress={() => onSelect(value)}
        >
          <AppText
            variant="small"
            weight="semibold"
            color={selected === value ? colors.white : colors.textMuted}
            style={{ textTransform: "capitalize" }}
          >
            {value}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  page: { width: "100%", maxWidth: 760, alignSelf: "center", flexGrow: 1, backgroundColor: colors.background },
  pageHero: { paddingBottom: 42, gap: 18 },
  heroHeadingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroHeading: { flex: 1, minWidth: 0 },
  liveSummary: { gap: 2 },
  eyebrow: { letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 },
  pageTitle: { fontSize: 25, lineHeight: 31 },
  pageSubtitle: { marginTop: 5 },
  heroAction: { flexShrink: 0, alignSelf: "flex-start" },
  backButton: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.onPrimaryFaint, alignItems: "center", justifyContent: "center" },
  sheet: { marginTop: -24, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, minHeight: 240, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20, borderWidth: 1, borderColor: colors.hairline },
  branchScroller: { flexGrow: 0 },
  branchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  branchFilter: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 12, borderRadius: radius.full },
  branchFilterSelected: { backgroundColor: colors.white },
  branchFilterUnselected: { backgroundColor: colors.onPrimaryFaint },
  branch: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  branchSelected: { backgroundColor: colors.primary },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { gap: 14 },
  hero: { borderRadius: radius.xl, padding: 24, gap: 12 },
  heroButton: { marginTop: 10 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  empty: { padding: 24, alignItems: "center", gap: 14 },
  filters: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  dutyCaption: { marginTop: 6, marginLeft: 16 },
});
