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

// ─── Manager Crew Management ──────────────────────────────────────────────────

const CREW_STATUS_CFG = {
  DRIVING:  { label: "Driving",    tone: colors.primary,   bg: colors.infoBg },
  PENDING:  { label: "Handover",   tone: colors.warning,   bg: colors.pendingBg },
  DISPUTED: { label: "Disputed",   tone: colors.error,     bg: colors.expiredBg },
  UNKNOWN:  { label: "Unconfirmed",tone: colors.textMuted, bg: colors.background },
};

const CREW_FLEET_MOCK = [
  {
    id: "cv-001", vehicle: "MH 04 AB 1234", vehicleId: "veh-001",
    status: "DRIVING",
    driver: "Ramesh Kumar", driverId: "drv-001",
    coDriver: "Sunil Patil", coDriverId: "drv-002",
    atWheelStart: new Date(Date.now() - 250 * 60000).toISOString(),
    handover: null,
  },
  {
    id: "cv-002", vehicle: "MH 12 CD 5678", vehicleId: "veh-002",
    status: "PENDING",
    driver: "Sunil Patil", driverId: "drv-002",
    coDriver: "Ajay Singh", coDriverId: "drv-003",
    atWheelStart: new Date(Date.now() - 310 * 60000).toISOString(),
    handover: { from: "Sunil Patil", to: "Ajay Singh", expiresIn: 12 },
  },
  {
    id: "cv-003", vehicle: "GJ 01 EF 9012", vehicleId: "veh-003",
    status: "UNKNOWN",
    driver: null, driverId: null,
    coDriver: null, coDriverId: null,
    atWheelStart: null,
    handover: null,
  },
  {
    id: "cv-004", vehicle: "RJ 14 GH 3456", vehicleId: "veh-004",
    status: "DRIVING",
    driver: "Vikram Yadav", driverId: "drv-004",
    coDriver: null, coDriverId: null,
    atWheelStart: new Date(Date.now() - 525 * 60000).toISOString(),
    handover: null,
  },
  {
    id: "cv-005", vehicle: "MP 09 IJ 7890", vehicleId: "veh-005",
    status: "DISPUTED",
    driver: "Mohan Sharma", driverId: "drv-005",
    coDriver: null, coDriverId: null,
    atWheelStart: new Date(Date.now() - 90 * 60000).toISOString(),
    handover: null,
  },
];

const AVAILABLE_DRIVERS_MOCK = [
  { id: "drv-006", name: "Ravi Mehta" },
  { id: "drv-007", name: "Deepak Nair" },
  { id: "drv-008", name: "Santosh More" },
];

function crewStintLabel(isoStart) {
  if (!isoStart) return null;
  const min = Math.floor((Date.now() - new Date(isoStart).getTime()) / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m at wheel` : `${m}m at wheel`;
}

function CrewTruckCard({ truck, onAssign, onOpenCrew }) {
  const cfg = CREW_STATUS_CFG[truck.status] || CREW_STATUS_CFG.UNKNOWN;
  const stint = crewStintLabel(truck.atWheelStart);

  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={{ gap: 10 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText weight="semibold">{truck.vehicle}</AppText>
            {stint && (
              <AppText variant="small" muted>{stint}</AppText>
            )}
          </View>
          <View style={{ backgroundColor: cfg.bg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 }}>
            <AppText variant="small" color={cfg.tone} weight="semibold">{cfg.label}</AppText>
          </View>
        </View>

        {/* Crew members */}
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="person" size={14} color={colors.textMuted} />
            <AppText variant="small" style={{ flex: 1 }}>
              {truck.driver || <AppText variant="small" color={colors.error}>No driver confirmed</AppText>}
            </AppText>
            {!truck.driver && (
              <Pressable
                accessibilityRole="button"
                onPress={() => onAssign(truck)}
                style={{ backgroundColor: colors.infoBg, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 }}
              >
                <AppText variant="small" color={colors.primary} weight="semibold">Assign</AppText>
              </Pressable>
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="people" size={14} color={colors.textMuted} />
            <AppText variant="small" color={truck.coDriver ? colors.text : colors.textMuted} style={{ flex: 1 }}>
              {truck.coDriver || "No co-driver"}
            </AppText>
            <Pressable
              accessibilityRole="button"
              onPress={() => onAssign(truck, true)}
              style={{ backgroundColor: colors.background, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: colors.border }}
            >
              <AppText variant="small" color={colors.textMuted} weight="semibold">
                {truck.coDriver ? "Change" : "Add"}
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Handover pending notice */}
        {truck.handover && (
          <View style={{ backgroundColor: colors.pendingBg, borderRadius: radius.md, padding: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="swap-horizontal-outline" size={14} color={colors.warning} />
            <AppText variant="small" color={colors.warning} style={{ flex: 1 }}>
              Handover: {truck.handover.from} → {truck.handover.to} · {truck.handover.expiresIn}m left
            </AppText>
          </View>
        )}

        {/* Actions */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button
            label="Crew detail"
            size="small"
            variant="secondary"
            onPress={() => onOpenCrew(truck)}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </Card>
  );
}

export function ManagerCrewManagement({ navigation }) {
  const [filter, setFilter] = useState("All");
  const [assignTarget, setAssignTarget] = useState(null); // { truck, isCoDriver }
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const filterMap = { All: null, Driving: "DRIVING", Unconfirmed: "UNKNOWN", Handover: "PENDING", Disputed: "DISPUTED" };
  const filtered = CREW_FLEET_MOCK.filter((t) => !filterMap[filter] || t.status === filterMap[filter]);

  const counts = CREW_FLEET_MOCK.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});
  const needsAttention = (counts.UNKNOWN || 0) + (counts.DISPUTED || 0) + (counts.PENDING || 0);

  function openCrew(truck) {
    navigation.navigate("Crew & driving", { vehicleId: truck.vehicleId });
  }

  function startAssign(truck, isCoDriver = false) {
    setAssignTarget({ truck, isCoDriver });
    setSelectedDriver(null);
    setNotice("");
  }

  function confirmAssign() {
    if (!selectedDriver) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setNotice(`${selectedDriver.name} assigned to ${assignTarget.truck.vehicle}. Mock — crewAction('SET_CREW') not wired.`);
      setAssignTarget(null);
      setSelectedDriver(null);
    }, 700);
  }

  return (
    <ManagerPage
      navigation={navigation}
      title="Crew management"
      subtitle={needsAttention > 0 ? `${needsAttention} truck${needsAttention !== 1 ? "s" : ""} need attention` : "All trucks have confirmed drivers"}
      allowEmpty
    >
      {/* Summary */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {[
          { label: `${counts.DRIVING || 0} driving`, ...CREW_STATUS_CFG.DRIVING },
          { label: `${counts.PENDING || 0} handover`, ...CREW_STATUS_CFG.PENDING },
          { label: `${counts.UNKNOWN || 0} unconfirmed`, ...CREW_STATUS_CFG.UNKNOWN },
          { label: `${counts.DISPUTED || 0} disputed`, ...CREW_STATUS_CFG.DISPUTED },
        ].map((item) => (
          <View key={item.label} style={{ backgroundColor: item.bg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border }}>
            <AppText variant="small" color={item.tone} weight="semibold">{item.label}</AppText>
          </View>
        ))}
      </View>

      <Filters
        values={["All", "Driving", "Unconfirmed", "Handover", "Disputed"]}
        selected={filter}
        onSelect={setFilter}
      />

      {notice ? (
        <View style={{ backgroundColor: colors.validBg, borderRadius: radius.md, padding: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
          <AppText variant="small" color={colors.success} style={{ flex: 1 }}>{notice}</AppText>
        </View>
      ) : null}

      {filtered.length === 0 ? (
        <Card>
          <View style={s.empty}>
            <Ionicons name="people-outline" size={36} color={colors.textMuted} />
            <AppText weight="semibold" style={{ textAlign: "center" }}>No {filter.toLowerCase()} trucks</AppText>
          </View>
        </Card>
      ) : (
        filtered.map((truck) => (
          <CrewTruckCard
            key={truck.id}
            truck={truck}
            onAssign={startAssign}
            onOpenCrew={openCrew}
          />
        ))
      )}

      {/* Assign drawer */}
      {assignTarget && (
        <Card>
          <AppText weight="semibold" style={{ marginBottom: 6 }}>
            {assignTarget.isCoDriver ? "Assign co-driver" : "Assign driver"} — {assignTarget.truck.vehicle}
          </AppText>
          <AppText variant="small" muted style={{ marginBottom: 12 }}>
            Select from available drivers in this branch.
          </AppText>
          {AVAILABLE_DRIVERS_MOCK.map((d) => (
            <Pressable
              key={d.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedDriver?.id === d.id }}
              onPress={() => setSelectedDriver(d)}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: selectedDriver?.id === d.id ? colors.infoBg : colors.background, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="person" size={16} color={selectedDriver?.id === d.id ? colors.primary : colors.textMuted} />
              </View>
              <AppText style={{ flex: 1 }} weight={selectedDriver?.id === d.id ? "semibold" : "regular"}>{d.name}</AppText>
              {selectedDriver?.id === d.id && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
            </Pressable>
          ))}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Button label="Cancel" variant="secondary" size="small" onPress={() => setAssignTarget(null)} style={{ flex: 1 }} />
            <Button label={busy ? "Saving…" : "Assign"} size="small" disabled={!selectedDriver || busy} onPress={confirmAssign} style={{ flex: 1 }} />
          </View>
        </Card>
      )}
    </ManagerPage>
  );
}

// ─── Manager Duty Board ───────────────────────────────────────────────────────

const DUTY_STATUS = {
  driving: { label: "Driving", tone: colors.primary, bg: colors.infoBg },
  plant: { label: "At plant", tone: colors.warning, bg: colors.pendingBg },
  resting: { label: "Resting", tone: colors.success, bg: colors.validBg },
  off: { label: "Off duty", tone: colors.textMuted, bg: colors.background },
};

const DUTY_MOCK = [
  { id: "drv-001", name: "Ramesh Kumar", vehicle: "MH 04 AB 1234", status: "driving", atWheelMin: 250, limitMin: 600, scoreDelta: +4, location: "Near Nagpur, NH-44", mismatch: false, lastSeen: new Date(Date.now() - 18 * 60000).toISOString() },
  { id: "drv-002", name: "Sunil Patil", vehicle: "MH 12 CD 5678", status: "plant", atWheelMin: 310, limitMin: 600, scoreDelta: +1, location: "Steel Authority Nagpur — Gate 3", mismatch: false, lastSeen: new Date(Date.now() - 50 * 60000).toISOString() },
  { id: "drv-003", name: "Ajay Singh", vehicle: "GJ 01 EF 9012", status: "resting", atWheelMin: 490, limitMin: 600, scoreDelta: -2, location: "Bypass Dhaba, Surat", mismatch: true, lastSeen: new Date(Date.now() - 65 * 60000).toISOString() },
  { id: "drv-004", name: "Vikram Yadav", vehicle: "RJ 14 GH 3456", status: "off", atWheelMin: 0, limitMin: 600, scoreDelta: 0, location: "Home depot, Jaipur", mismatch: false, lastSeen: new Date(Date.now() - 8 * 3600000).toISOString() },
  { id: "drv-005", name: "Mohan Sharma", vehicle: "MP 09 IJ 7890", status: "driving", atWheelMin: 525, limitMin: 600, scoreDelta: -1, location: "Bhopal bypass, NH-46", mismatch: true, lastSeen: new Date(Date.now() - 5 * 60000).toISOString() },
];

function hosPct(min, limit) { return Math.min(100, Math.round((min / limit) * 100)); }
function hosColor(pct) {
  if (pct >= 95) return colors.error;
  if (pct >= 80) return colors.warning;
  return colors.success;
}
function hosLabel(min) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function scoreText(delta) {
  if (delta > 0) return `+${delta} ↑`;
  if (delta < 0) return `${delta} ↓`;
  return "—";
}
function scoreColor(delta) {
  if (delta > 0) return colors.success;
  if (delta < 0) return colors.error;
  return colors.textMuted;
}
function driverLastSeen(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 2) return "just now";
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  return `${h}h ago`;
}

function DutyDriverCard({ driver, onCall, onTimeline, onViewDetail }) {
  const cfg = DUTY_STATUS[driver.status] || DUTY_STATUS.off;
  const pct = hosPct(driver.atWheelMin, driver.limitMin);
  const barColor = hosColor(pct);
  const nearLimit = pct >= 80;

  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={{ gap: 10 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <AppText weight="semibold">{driver.name}</AppText>
              {driver.mismatch && (
                <View style={{ backgroundColor: colors.pendingBg, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1 }}>
                  <AppText variant="small" color={colors.warning} weight="semibold">⚠ GPS mismatch</AppText>
                </View>
              )}
            </View>
            <AppText variant="small" muted>{driver.vehicle}</AppText>
          </View>
          <View style={{ backgroundColor: cfg.bg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 }}>
            <AppText variant="small" color={cfg.tone} weight="semibold">{cfg.label}</AppText>
          </View>
        </View>

        {/* HOS band */}
        {driver.status !== "off" && (
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <AppText variant="small" muted>At wheel today</AppText>
              <AppText variant="small" weight="semibold" color={nearLimit ? barColor : colors.text}>
                {hosLabel(driver.atWheelMin)} / {hosLabel(driver.limitMin)}
                {nearLimit ? " ⚠" : ""}
              </AppText>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" }}>
              <View style={{ width: `${pct}%`, height: "100%", backgroundColor: barColor, borderRadius: 3 }} />
            </View>
          </View>
        )}

        {/* Stats row */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="small" muted>Score trend</AppText>
            <AppText variant="small" weight="semibold" color={scoreColor(driver.scoreDelta)}>
              {scoreText(driver.scoreDelta)}
            </AppText>
          </View>
          <View style={{ flex: 2, gap: 2 }}>
            <AppText variant="small" muted>Last known location</AppText>
            <AppText variant="small" numberOfLines={1}>{driver.location}</AppText>
          </View>
          <View style={{ gap: 2, alignItems: "flex-end" }}>
            <AppText variant="small" muted>Seen</AppText>
            <AppText variant="small">{driverLastSeen(driver.lastSeen)}</AppText>
          </View>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button label="Call" size="small" variant="secondary" icon="call-outline" onPress={() => onCall(driver)} style={{ flex: 1 }} />
          <Button label="Details" size="small" onPress={() => onViewDetail && onViewDetail(driver)} style={{ flex: 1 }} />
        </View>
      </View>
    </Card>
  );
}

export function ManagerDutyBoard({ navigation }) {
  const [filter, setFilter] = useState("All");
  const [callPending, setCallPending] = useState(null);
  const [outcomeOpen, setOutcomeOpen] = useState(null);

  const filterMap = { All: null, Driving: "driving", "At plant": "plant", Resting: "resting", "Off duty": "off" };
  const filtered = DUTY_MOCK.filter((d) => !filterMap[filter] || d.status === filterMap[filter]);

  const counts = DUTY_MOCK.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {});
  const CALL_OUTCOMES = ["Reached", "Not reached", "Resolved", "Follow up"];

  function handleCall(driver) {
    setCallPending(driver);
    setOutcomeOpen(null);
  }

  function handleTimeline(driver) {
    navigation.navigate("Driver timeline", { driverId: driver.id, driverName: driver.name });
  }

  function handleViewDetail(driver) {
    navigation.navigate("Manager driver detail", { driverId: driver.id });
  }

  function chooseOutcome(outcome) {
    setOutcomeOpen(null);
    setCallPending(null);
  }

  return (
    <ManagerPage
      navigation={navigation}
      title="Drivers"
      subtitle="Duty status, hours of service and score trends for today."
      allowEmpty
    >
      {/* Summary pills */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {[
          { label: `${counts.driving || 0} driving`, color: colors.primary, bg: colors.infoBg },
          { label: `${counts.plant || 0} at plant`, color: colors.warning, bg: colors.pendingBg },
          { label: `${counts.resting || 0} resting`, color: colors.success, bg: colors.validBg },
          { label: `${counts.off || 0} off duty`, color: colors.textMuted, bg: colors.background },
        ].map((item) => (
          <View key={item.label} style={{ backgroundColor: item.bg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border }}>
            <AppText variant="small" color={item.color} weight="semibold">{item.label}</AppText>
          </View>
        ))}
      </View>

      {/* Status filter */}
      <Filters
        values={["All", "Driving", "At plant", "Resting", "Off duty"]}
        selected={filter}
        onSelect={setFilter}
      />

      {/* Mismatch notice */}
      {(filter === "All" || filter === "Resting") && DUTY_MOCK.some((d) => d.mismatch) && (
        <View style={{ backgroundColor: colors.pendingBg, borderRadius: radius.md, padding: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />
          <AppText variant="small" color={colors.warning} style={{ flex: 1 }}>
            {DUTY_MOCK.filter((d) => d.mismatch).length} driver{DUTY_MOCK.filter((d) => d.mismatch).length !== 1 ? "s" : ""} have a GPS mismatch — GPS shows movement but duty says resting.
          </AppText>
        </View>
      )}

      {/* Driver cards */}
      {filtered.length === 0 ? (
        <Card>
          <View style={s.empty}>
            <Ionicons name="people-outline" size={36} color={colors.textMuted} />
            <AppText weight="semibold" style={{ textAlign: "center" }}>No {filter.toLowerCase()} drivers</AppText>
          </View>
        </Card>
      ) : (
        filtered.map((driver) => (
          <DutyDriverCard
            key={driver.id}
            driver={driver}
            onCall={handleCall}
            onTimeline={handleTimeline}
            onViewDetail={handleViewDetail}
          />
        ))
      )}

      {/* Call safety prompt */}
      {callPending && !outcomeOpen && (
        <Card>
          <AppText weight="semibold" style={{ marginBottom: 6 }}>Call {callPending.name}?</AppText>
          <AppText variant="small" muted style={{ marginBottom: 12 }}>
            {callPending.vehicle} · {callPending.status === "driving" ? "⚠ Driver may be driving — confirm it is safe to call" : "Driver is " + DUTY_STATUS[callPending.status]?.label.toLowerCase()}
          </AppText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Cancel" variant="secondary" size="small" onPress={() => setCallPending(null)} style={{ flex: 1 }} />
            <Button label="Call now" size="small" onPress={() => setOutcomeOpen(callPending)} style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      {/* Outcome picker */}
      {outcomeOpen && (
        <Card>
          <AppText weight="semibold" style={{ marginBottom: 8 }}>Call outcome — {outcomeOpen.name}</AppText>
          <View style={{ gap: 6 }}>
            {CALL_OUTCOMES.map((outcome) => (
              <Button key={outcome} label={outcome} variant="secondary" size="small" onPress={() => chooseOutcome(outcome)} />
            ))}
          </View>
        </Card>
      )}
    </ManagerPage>
  );
}

// ─── Manager Driver Detail ────────────────────────────────────────────────────

const DRIVER_DETAIL_MOCK = {
  "drv-001": {
    name: "Ramesh Kumar", phone: "+91 98765 43210", vehicle: "MH 04 AB 1234",
    status: "driving", atWheelMin: 250, limitMin: 600, scoreDelta: +4,
    score: 84, location: "Near Nagpur, NH-44",
    papers: [
      { label: "Driving licence", status: "valid", expiry: "2028-06-30" },
      { label: "Medical fitness", status: "valid", expiry: "2027-03-15" },
      { label: "HAZMAT cert", status: "expiring", expiry: "2026-11-20" },
    ],
    trips: [
      { id: "t1", date: "29 Oct", route: "Nagpur → Pune", km: 246, score: 86, hours: "5h 10m" },
      { id: "t2", date: "28 Oct", route: "Pune → Nagpur", km: 248, score: 82, hours: "5h 25m" },
      { id: "t3", date: "27 Oct", route: "Nagpur → Surat", km: 622, score: 79, hours: "12h 5m" },
      { id: "t4", date: "26 Oct", route: "Surat → Nagpur", km: 618, score: 88, hours: "11h 40m" },
      { id: "t5", date: "25 Oct", route: "Nagpur → Jaipur", km: 1070, score: 91, hours: "19h 30m" },
    ],
    scoreSeries: [72, 76, 79, 82, 88, 84, 84],
    dutyTimeline: [
      { label: "Duty start", time: "06:00", icon: "play-circle-outline", color: colors.success },
      { label: "Driving", time: "06:10 – 10:10", icon: "car-outline", color: colors.primary },
      { label: "Break", time: "10:10 – 10:40", icon: "cafe-outline", color: colors.warning },
      { label: "Driving", time: "10:40 – 14:05", icon: "car-outline", color: colors.primary },
      { label: "At plant", time: "14:05 – ongoing", icon: "business-outline", color: colors.warning },
    ],
  },
};

function getPaperBg(status) {
  if (status === "valid") return colors.validBg;
  if (status === "expiring") return colors.pendingBg;
  return colors.expiredBg;
}
function getPaperColor(status) {
  if (status === "valid") return colors.success;
  if (status === "expiring") return colors.warning;
  return colors.error;
}

export function ManagerDriverDetail({ navigation, route }) {
  const driverId = route?.params?.driverId || "drv-001";
  const driver = DRIVER_DETAIL_MOCK[driverId] || DRIVER_DETAIL_MOCK["drv-001"];
  const [calling, setCalling] = useState(false);

  const pct = hosPct(driver.atWheelMin, driver.limitMin);
  const barColor = hosColor(pct);
  const cfg = DUTY_STATUS[driver.status] || DUTY_STATUS.off;

  const avg7Score = Math.round(driver.scoreSeries.reduce((a, b) => a + b, 0) / driver.scoreSeries.length);
  const minScore = Math.min(...driver.scoreSeries);
  const maxScore = Math.max(...driver.scoreSeries);

  return (
    <ManagerPage
      navigation={navigation}
      title={driver.name}
      subtitle={`${driver.vehicle} · ${cfg.label}`}
      allowEmpty
    >
      {/* Status + HOS */}
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText weight="semibold">Hours of service — today</AppText>
            <AppText variant="small" muted>India MCV/HCV: 10h daily drive limit</AppText>
          </View>
          <View style={{ backgroundColor: cfg.bg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 }}>
            <AppText variant="small" color={cfg.tone} weight="semibold">{cfg.label}</AppText>
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText variant="small" muted>At wheel</AppText>
            <AppText variant="small" weight="semibold" color={pct >= 80 ? barColor : colors.text}>
              {hosLabel(driver.atWheelMin)} / {hosLabel(driver.limitMin)}
              {pct >= 80 ? " ⚠" : ""}
            </AppText>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: "hidden" }}>
            <View style={{ width: `${pct}%`, height: "100%", backgroundColor: barColor, borderRadius: 4 }} />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button
            label={calling ? "Calling…" : `Call ${driver.name.split(" ")[0]}`}
            icon="call-outline"
            size="small"
            style={{ flex: 1 }}
            onPress={() => { setCalling(true); setTimeout(() => setCalling(false), 1500); }}
          />
          <Button
            label="Timeline"
            size="small"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => navigation.navigate("Driver timeline", { driverId, driverName: driver.name })}
          />
        </View>
      </Card>

      {/* Score summary */}
      <Card>
        <AppText weight="semibold" style={{ marginBottom: 10 }}>Driving score — last 7 days</AppText>
        <View style={{ flexDirection: "row", gap: 14 }}>
          <View style={{ alignItems: "center", flex: 1 }}>
            <AppText style={{ fontSize: 28, fontWeight: "800" }} color={colors.primary}>{driver.score}</AppText>
            <AppText variant="small" muted>Today</AppText>
          </View>
          <View style={{ alignItems: "center", flex: 1 }}>
            <AppText style={{ fontSize: 28, fontWeight: "800" }} color={colors.success}>{avg7Score}</AppText>
            <AppText variant="small" muted>7-day avg</AppText>
          </View>
          <View style={{ alignItems: "center", flex: 1 }}>
            <AppText style={{ fontSize: 22, fontWeight: "700" }} color={colors.textMuted}>{minScore}–{maxScore}</AppText>
            <AppText variant="small" muted>Range</AppText>
          </View>
          <View style={{ alignItems: "center", flex: 1 }}>
            <AppText style={{ fontSize: 22, fontWeight: "700" }} color={scoreColor(driver.scoreDelta)}>
              {scoreText(driver.scoreDelta)}
            </AppText>
            <AppText variant="small" muted>Trend</AppText>
          </View>
        </View>
        {/* Mini bar chart (text-based sparkline) */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 12, height: 40 }}>
          {driver.scoreSeries.map((sc, i) => {
            const barH = Math.max(4, Math.round((sc / 100) * 40));
            return (
              <View key={i} style={{ flex: 1, alignItems: "center" }}>
                <View style={{ width: "100%", height: barH, backgroundColor: i === 6 ? colors.primary : colors.infoBg, borderRadius: 3 }} />
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          <AppText variant="small" muted>24 Oct</AppText>
          <AppText variant="small" muted>Today</AppText>
        </View>
      </Card>

      {/* Duty timeline — today */}
      <Card>
        <AppText weight="semibold" style={{ marginBottom: 10 }}>Duty timeline — today</AppText>
        <View style={{ gap: 10 }}>
          {driver.dutyTimeline.map((ev, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View style={{ alignItems: "center", width: 28 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.infoBg, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={ev.icon} size={14} color={ev.color} />
                </View>
                {i < driver.dutyTimeline.length - 1 && (
                  <View style={{ width: 2, flex: 1, backgroundColor: colors.border, marginTop: 2, minHeight: 16 }} />
                )}
              </View>
              <View style={{ flex: 1, paddingBottom: i < driver.dutyTimeline.length - 1 ? 10 : 0 }}>
                <AppText weight="semibold" variant="small">{ev.label}</AppText>
                <AppText variant="small" muted>{ev.time}</AppText>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Last 5 trips */}
      <Card>
        <AppText weight="semibold" style={{ marginBottom: 10 }}>Last 5 trips</AppText>
        <View style={{ gap: 0 }}>
          {driver.trips.map((trip, i) => (
            <View key={trip.id}>
              {i > 0 && <View style={{ height: 1, backgroundColor: colors.border }} />}
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="small" weight="semibold">{trip.route}</AppText>
                  <AppText variant="small" muted>{trip.date} · {trip.km} km · {trip.hours}</AppText>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <AppText variant="small" weight="semibold" color={trip.score >= 85 ? colors.success : trip.score >= 70 ? colors.warning : colors.error}>
                    {trip.score}
                  </AppText>
                  <AppText variant="small" muted>score</AppText>
                </View>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Papers status */}
      <Card>
        <AppText weight="semibold" style={{ marginBottom: 10 }}>Documents & papers</AppText>
        <View style={{ gap: 8 }}>
          {driver.papers.map((paper) => (
            <View key={paper.label} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="small" weight="semibold">{paper.label}</AppText>
                <AppText variant="small" muted>Expires {paper.expiry}</AppText>
              </View>
              <View style={{ backgroundColor: getPaperBg(paper.status), borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 }}>
                <AppText variant="small" color={getPaperColor(paper.status)} weight="semibold" style={{ textTransform: "capitalize" }}>
                  {paper.status}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </Card>
    </ManagerPage>
  );
}

// ─── Manager Approvals ────────────────────────────────────────────────────────

const APPROVAL_MOCK = {
  fuel: [
    { id: "fa-001", driverName: "Ramesh Kumar", vehicle: "MH 04 AB 1234", litres: 120, amount: 10800, station: "Indian Oil, NH-44 Nagpur", date: "2026-10-29", status: "pending", receiptUrl: null },
    { id: "fa-002", driverName: "Sunil Patil", vehicle: "MH 12 CD 5678", litres: 85, amount: 7650, station: "BPCL, Pune Bypass", date: "2026-10-28", status: "pending", receiptUrl: null },
    { id: "fa-003", driverName: "Ajay Singh", vehicle: "GJ 01 EF 9012", litres: 200, amount: 18000, station: "HP Petrol, Ahmedabad", date: "2026-10-27", status: "approved" },
  ],
  expense: [
    { id: "ea-001", driverName: "Vikram Yadav", vehicle: "RJ 14 GH 3456", label: "Toll — Jaipur Bypass", amount: 680, date: "2026-10-29", status: "pending" },
    { id: "ea-002", driverName: "Ramesh Kumar", vehicle: "MH 04 AB 1234", label: "Tyre puncture repair", amount: 350, date: "2026-10-28", status: "pending" },
    { id: "ea-003", driverName: "Sunil Patil", vehicle: "MH 12 CD 5678", label: "Overnight meal", amount: 120, date: "2026-10-27", status: "rejected" },
  ],
  document: [
    { id: "da-001", driverName: "Ajay Singh", vehicle: "GJ 01 EF 9012", docType: "Fitness certificate", expiryDate: "2026-12-01", date: "2026-10-29", status: "pending" },
    { id: "da-002", driverName: "Vikram Yadav", vehicle: "RJ 14 GH 3456", docType: "PUC certificate", expiryDate: "2026-11-15", date: "2026-10-28", status: "approved" },
  ],
};

const APPROVAL_STATUS_COLOR = { pending: colors.warning, approved: colors.success, rejected: colors.error };
const APPROVAL_STATUS_BG = { pending: colors.pendingBg, approved: colors.validBg, rejected: colors.expiredBg };
const REJECT_REASONS = ["Duplicate entry", "Receipt missing", "Amount mismatch", "Not policy-approved", "Other"];

function ApprovalStatusPill({ status }) {
  return (
    <View style={{
      backgroundColor: APPROVAL_STATUS_BG[status] || colors.background,
      borderRadius: radius.full,
      paddingHorizontal: 8,
      paddingVertical: 2,
    }}>
      <AppText variant="small" color={APPROVAL_STATUS_COLOR[status] || colors.textMuted} weight="semibold" style={{ textTransform: "capitalize" }}>
        {status}
      </AppText>
    </View>
  );
}

function ApprovalCard({ item, type, onApprove, onReject, isActionOpen, onToggleAction }) {
  const [rejectReason, setRejectReason] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);
  const isPending = item.status === "pending";

  function submitReject() {
    if (!rejectReason) return;
    onReject(item.id, rejectReason);
    setConfirmReject(false);
    setRejectReason("");
  }

  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={{ gap: 8 }}>
        {/* Header row */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <AppText weight="semibold">{item.driverName}</AppText>
            <AppText variant="small" muted>{item.vehicle}</AppText>
          </View>
          <ApprovalStatusPill status={item.status} />
        </View>

        {/* Detail row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1, gap: 2 }}>
            {type === "fuel" && (
              <>
                <AppText variant="small">{item.litres} L — {item.station}</AppText>
                <AppText variant="small" muted>{item.date}</AppText>
              </>
            )}
            {type === "expense" && (
              <>
                <AppText variant="small">{item.label}</AppText>
                <AppText variant="small" muted>{item.date}</AppText>
              </>
            )}
            {type === "document" && (
              <>
                <AppText variant="small">{item.docType}</AppText>
                <AppText variant="small" muted>Expiry: {item.expiryDate}</AppText>
              </>
            )}
          </View>
          {item.amount != null && (
            <AppText weight="semibold" color={colors.primaryDeep}>
              ₹{Number(item.amount).toLocaleString("en-IN")}
            </AppText>
          )}
        </View>

        {/* Approve / Reject actions for pending items */}
        {isPending && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            <Button
              label="Approve"
              size="small"
              onPress={() => onApprove(item.id)}
              style={{ flex: 1 }}
            />
            <Button
              label="Reject"
              variant="secondary"
              size="small"
              onPress={() => setConfirmReject((v) => !v)}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {/* Reject reason picker */}
        {confirmReject && (
          <View style={{ gap: 6, marginTop: 4 }}>
            <AppText variant="small" weight="semibold">Reason for rejection</AppText>
            {REJECT_REASONS.map((reason) => (
              <Pressable
                key={reason}
                accessibilityRole="radio"
                accessibilityState={{ selected: rejectReason === reason }}
                onPress={() => setRejectReason(reason)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 6,
                }}
              >
                <View style={{
                  width: 18, height: 18, borderRadius: 9,
                  borderWidth: 1.5,
                  borderColor: rejectReason === reason ? colors.error : colors.border,
                  backgroundColor: rejectReason === reason ? colors.expiredBg : "transparent",
                  alignItems: "center", justifyContent: "center",
                }}>
                  {rejectReason === reason && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error }} />}
                </View>
                <AppText variant="small">{reason}</AppText>
              </Pressable>
            ))}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <Button label="Cancel" variant="secondary" size="small" onPress={() => { setConfirmReject(false); setRejectReason(""); }} style={{ flex: 1 }} />
              <Button label="Confirm reject" size="small" onPress={submitReject} disabled={!rejectReason} style={{ flex: 1 }} />
            </View>
          </View>
        )}
      </View>
    </Card>
  );
}

export function ManagerApprovals({ navigation }) {
  const [tab, setTab] = useState("Fuel");
  const [items, setItems] = useState({ fuel: [...APPROVAL_MOCK.fuel], expense: [...APPROVAL_MOCK.expense], document: [...APPROVAL_MOCK.document] });

  const tabKey = tab.toLowerCase();
  const list = items[tabKey] || [];
  const pendingCount = (t) => (items[t] || []).filter((i) => i.status === "pending").length;
  const totalPending = pendingCount("fuel") + pendingCount("expense") + pendingCount("document");

  function approve(id) {
    setItems((prev) => ({
      ...prev,
      [tabKey]: prev[tabKey].map((i) => i.id === id ? { ...i, status: "approved" } : i),
    }));
  }

  function reject(id, reason) {
    setItems((prev) => ({
      ...prev,
      [tabKey]: prev[tabKey].map((i) => i.id === id ? { ...i, status: "rejected", rejectReason: reason } : i),
    }));
  }

  return (
    <ManagerPage
      navigation={navigation}
      title="Approvals"
      subtitle={totalPending > 0 ? `${totalPending} item${totalPending !== 1 ? "s" : ""} waiting for your decision` : "All caught up — no pending approvals"}
      allowEmpty
    >
      <Filters
        values={["Fuel", "Expense", "Document"]}
        selected={tab}
        onSelect={setTab}
      />

      {list.length === 0 ? (
        <Card>
          <View style={s.empty}>
            <Ionicons name="checkmark-circle-outline" size={40} color={colors.success} />
            <AppText weight="semibold" style={{ textAlign: "center" }}>No {tab.toLowerCase()} approvals</AppText>
            <AppText variant="small" muted style={{ textAlign: "center" }}>Items submitted by drivers will appear here.</AppText>
          </View>
        </Card>
      ) : (
        <View>
          {list.map((item) => (
            <ApprovalCard
              key={item.id}
              item={item}
              type={tabKey}
              onApprove={approve}
              onReject={reject}
            />
          ))}
        </View>
      )}
    </ManagerPage>
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
