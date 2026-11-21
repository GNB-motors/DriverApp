import { VehicleCrewCard } from "./CrewScreens";
import HistoricalTripScreen from './HistoricalTripScreen';
import PushSettings from '../../components/PushSettings';
import Constants from 'expo-constants';
import { APP_VERSION } from "../services/appIdentity";
import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Alert,
  Linking,
  TouchableOpacity,
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
  const allVehicles = data?.vehicles || [];
  const counts = useMemo(
    () => ({
      all: allVehicles.length,
      moving: allVehicles.filter((v) => v.status === "moving").length,
      stopped: allVehicles.filter((v) => v.status === "stopped").length,
      idling: allVehicles.filter((v) => v.status === "idling").length,
      offline: allVehicles.filter((v) => v.status === "offline").length,
    }),
    [allVehicles],
  );

  const vehicles = useMemo(() => {
    return allVehicles.filter((v) => {
      const matchStatus = filter === "all" || v.status === filter;
      const matchQuery =
        !search.trim() ||
        `${v.plate} ${v.model}`
          .toLowerCase()
          .includes(search.trim().toLowerCase());
      return matchStatus && matchQuery;
    });
  }, [allVehicles, filter, search]);
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
        counts={counts}
      />
      {vehicles.map((v) => (
        <VehicleRow
          key={v.id}
          vehicle={v}
          onPress={() => navigation.navigate("Vehicle detail", { id: v.id })}
          navigation={navigation}
        />
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
  const { data, service, branchId } = useManagerData();
  const vehicle = data?.vehicles.find((v) => v.id === route.params?.id);
  const driver = data?.drivers.find((d) => d.id === vehicle?.driverId);

  // Active Trip & ETA (M05)
  const activeTrip = (data?.trips || []).find(
    (t) =>
      t.vehicleId === vehicle?.id &&
      (t.status === 'in_transit' ||
        t.status === 'active' ||
        t.status === 'started' ||
        String(t.status).toLowerCase().includes('transit'))
  );

  // Active Action Card Context (M05)
  const [activeCards, setActiveCards] = useState([]);
  useEffect(() => {
    let active = true;
    if (vehicle?.id || vehicle?.plate) {
      service
        .managerCards(branchId === 'all' ? undefined : branchId)
        .then((res) => {
          if (!active) return;
          const list = Array.isArray(res) ? res : res?.cards || res?.data?.cards || [];
          const matched = list.filter(
            (c) =>
              (c.subject?.vehicleId === vehicle?.id || c.subject?.plate === vehicle?.plate) &&
              c.state !== 'HANDLED' &&
              c.state !== 'DISMISSED'
          );
          setActiveCards(matched);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [service, branchId, vehicle?.id, vehicle?.plate]);

  const isMoving = vehicle?.status === 'moving' || (vehicle?.speedKmph && vehicle.speedKmph > 5);

  const handleCallDriver = () => {
    const phone = driver?.mobileNumber || driver?.phone;
    if (!phone) {
      Alert.alert('Call Driver', 'No verified phone number linked to this driver.');
      return;
    }
    if (isMoving && vehicle?.speedKmph && vehicle.speedKmph > 15) {
      Alert.alert(
        'Driver is in Motion',
        `Vehicle is moving at ${vehicle.speedKmph} km/h. Calling may distract the driver on the road. Proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call Now', onPress: () => Linking.openURL(`tel:${phone}`) },
        ]
      );
    } else {
      Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Could not launch dialer.'));
    }
  };

  return (
    <ManagerPage
      navigation={navigation}
      title="Vehicle details"
      subtitle="Position, people and pending work."
    >
      {vehicle ? (
        <>
          {/* Active Action Card Alert (M05) */}
          {activeCards.length > 0 && (
            <Pressable
              onPress={() =>
                navigation.navigate('Manager action detail', { actionId: activeCards[0].id || activeCards[0]._id })
              }
            >
              <Card
                style={{
                  backgroundColor: '#FEF2F2',
                  borderColor: '#FECACA',
                  borderWidth: 1,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="alert-circle" size={18} color={colors.error} />
                    <AppText variant="caption" weight="extrabold" color={colors.error}>
                      ACTIVE ACTION CARD
                    </AppText>
                  </View>
                  <AppText variant="caption" weight="bold" color={colors.primary}>
                    View Detail →
                  </AppText>
                </View>
                <AppText weight="bold" color={colors.text}>
                  {activeCards[0].fact || 'Immediate attention required on this truck'}
                </AppText>
              </Card>
            </Pressable>
          )}

          <VehicleRow vehicle={vehicle} />

          {/* Active Route & ETA (M05) */}
          {activeTrip && (
            <Card style={{ gap: 10, borderColor: colors.primary, borderWidth: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="navigate" size={16} color={colors.primary} />
                  <AppText variant="caption" weight="extrabold" color={colors.primaryDeep}>
                    ACTIVE ROUTE · IN TRANSIT
                  </AppText>
                </View>
                <AppText variant="caption" mono muted>
                  {activeTrip.distanceKm || 0} km total
                </AppText>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppText weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {activeTrip.from || 'Origin'}
                </AppText>
                <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
                <AppText weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {activeTrip.to || 'Destination'}
                </AppText>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  backgroundColor: colors.background,
                  padding: 8,
                  borderRadius: radius.sm,
                }}
              >
                <AppText variant="caption" muted>
                  Estimated Status:
                </AppText>
                <AppText variant="caption" weight="bold" color={colors.success}>
                  {isMoving ? `En-Route (${vehicle.speedKmph || 0} km/h)` : 'Temporarily Stopped'}
                </AppText>
              </View>

              <Button
                label="View active trip details"
                variant="secondary"
                onPress={() => navigation.navigate('Manager trip', { id: activeTrip.id })}
              />
            </Card>
          )}

          {/* Call & Driver Context (M05) */}
          {driver ? (
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="person-circle-outline" size={26} color={colors.primary} />
                  <View>
                    <AppText weight="bold">{driver.name}</AppText>
                    <AppText variant="caption" muted>
                      {driver.mobileNumber || 'No mobile listed'} · Assigned driver
                    </AppText>
                  </View>
                </View>
                <View
                  style={{
                    backgroundColor: isMoving ? colors.validBg : colors.background,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: radius.full,
                  }}
                >
                  <AppText
                    variant="caption"
                    weight="bold"
                    color={isMoving ? colors.success : colors.textMuted}
                  >
                    {isMoving ? 'Driving' : 'Stopped'}
                  </AppText>
                </View>
              </View>

              {isMoving && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#FEF3C7',
                    padding: 8,
                    borderRadius: radius.sm,
                  }}
                >
                  <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
                  <AppText variant="caption" color="#92400E" style={{ flex: 1 }}>
                    Vehicle moving at {vehicle.speedKmph || 0} km/h. Confirm road safety.
                  </AppText>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button
                  label="Call Driver"
                  icon="call"
                  style={{ flex: 1 }}
                  onPress={handleCallDriver}
                />
                <Button
                  label="Driver Profile"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => navigation.navigate('Driver detail', { id: driver.id })}
                />
              </View>
            </Card>
          ) : (
            <MenuRow
              title="No driver linked"
              detail="Link a driver from this branch"
              icon="person-outline"
              onPress={() =>
                navigation.navigate('Truck handover', { vehicleId: vehicle.id })
              }
            />
          )}

          <VehicleCrewCard navigation={navigation} vehicleId={vehicle.id} />
          <VehicleTrailMap vehicle={vehicle} />

          <MenuRow
            title="Odometer"
            detail={`${vehicle.odometerKm == null ? 'Unavailable' : vehicle.odometerKm.toLocaleString('en-IN')} km · reading`}
            icon="speedometer-outline"
          />

          <Button
            label="Link / hand over truck"
            variant="secondary"
            onPress={() =>
              navigation.navigate('Truck handover', { vehicleId: vehicle.id })
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
                  navigation.navigate('Manager trip', { id: t.id })
                }
              />
            ))}
          {!data.trips.some((t) => t.vehicleId === vehicle.id) && (
            <AppText muted>No trips for this truck in the loaded recent records.</AppText>
          )}
          {user.role === 'OWNER' && (
            <Button
              label="All trips for this truck"
              variant="secondary"
              onPress={() => navigation.navigate('Fleet trips', { vehicleId: vehicle.id })}
            />
          )}
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
  const duty = route.name === 'Duty board';
  const [filter, setFilter] = useState('All');
  const availableStates = [...new Set((data?.drivers || []).map((driver) => driver.state).filter((state) => state && state !== 'Unavailable'))];
  const filters = ['All', ...availableStates, 'Unlinked'];
  const drivers =
    data?.drivers.filter(
      (d) =>
        filter === 'All' ||
        (filter === 'Unlinked' ? !d.vehicleId : d.state === filter),
    ) || [];
  return (
    <ManagerPage
      navigation={navigation}
      title={duty ? 'Duty board' : 'Your drivers'}
      subtitle={duty ? roleText(t, 'managerDutySubtitle', 'Driver and truck assignments in this branch.') : 'People behind every kilometre.'}
    >
      <Filters
        values={filters}
        selected={filter}
        onSelect={setFilter}
      />
      {duty && (data?.drivers || []).some((driver) => !Number.isFinite(driver.drivingMinutes)) && (
        <Card>
          <AppText weight="semibold">{roleText(t, 'managerDutyTimeUnavailableTitle', 'Driving-time data unavailable')}</AppText>
          <AppText muted>{roleText(t, 'managerDutyTimeUnavailableBody', 'Driver assignments are shown below; duty hours are not connected in this view.')}</AppText>
        </Card>
      )}
      {drivers.map((driver) => (
        <Pressable
          key={driver.id}
          accessibilityRole="button"
          accessibilityLabel={`Open ${driver.name}`}
          onPress={() =>
            navigation.navigate('Driver detail', { id: driver.id })
          }
        >
          <DriverRow driver={driver} />
          {duty && Number.isFinite(driver.drivingMinutes) && (
            <AppText variant="caption" muted style={s.dutyCaption}>
              {Math.floor(driver.drivingMinutes / 60)}h{' '}
              {driver.drivingMinutes % 60}m driving
            </AppText>
          )}
        </Pressable>
      ))}
      {!drivers.length && !data?.errors?.drivers && <Empty />}
      <Button
        label="Link a driver to a truck"
        variant="secondary"
        onPress={() => navigation.navigate('Truck handover')}
      />
    </ManagerPage>
  );
}

export function DriverDetail({ navigation, route }) {
  const { user } = useAuth();
  const { data } = useManagerData();
  const driver = data?.drivers.find((d) => d.id === route.params?.id);
  const vehicle = data?.vehicles.find((v) => v.id === driver?.vehicleId);
  const isMoving = vehicle?.status === 'moving' || (vehicle?.speedKmph && vehicle.speedKmph > 5);

  const handleCallDriver = () => {
    const phone = driver?.mobileNumber || driver?.phone;
    if (!phone) {
      Alert.alert('Call Driver', 'No phone number available for this driver.');
      return;
    }
    if (isMoving && vehicle?.speedKmph && vehicle.speedKmph > 15) {
      Alert.alert(
        'Driver is in Motion',
        `Assigned truck ${vehicle?.plate || ''} is moving at ${vehicle.speedKmph} km/h. Calling may distract driver. Proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call Now', onPress: () => Linking.openURL(`tel:${phone}`) },
        ]
      );
    } else {
      Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Could not open dialer.'));
    }
  };

  return (
    <ManagerPage navigation={navigation} title="Driver details" subtitle="Profile, assignment and duty history">
      {driver ? (
        <>
          <DriverRow driver={driver} />

          {/* Call Flow for Manager & Owner (M07) */}
          <View style={{ gap: 8 }}>
            {isMoving && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#FEF3C7',
                  padding: 8,
                  borderRadius: radius.sm,
                }}
              >
                <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
                <AppText variant="caption" color="#92400E" style={{ flex: 1 }}>
                  Truck in motion at {vehicle.speedKmph || 0} km/h. Confirm road safety before calling.
                </AppText>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label="Call driver"
                icon="call-outline"
                disabled={!driver.mobileNumber && !driver.phone}
                style={{ flex: 1 }}
                onPress={handleCallDriver}
              />
              <Button
                label="Message"
                icon="chatbubble-outline"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => navigation.navigate('Messages')}
              />
            </View>
          </View>

          {Number.isFinite(driver.limitMinutes) ? (
            <DutyCard driver={driver} />
          ) : (
            <Card style={{ gap: 4 }}>
              <AppText weight="bold">Daily Duty Status</AppText>
              <AppText variant="caption" muted>
                {driver.state ? `Current state: ${driver.state}` : 'Normal duty hours. No fatigue violations detected.'}
              </AppText>
            </Card>
          )}

          {vehicle ? (
            <View style={{ gap: 6 }}>
              <AppText variant="h3">Assigned Truck</AppText>
              <VehicleRow
                vehicle={vehicle}
                onPress={() => navigation.navigate('Vehicle detail', { id: vehicle.id })}
              />
            </View>
          ) : (
            <Empty
              title="No truck linked"
              detail="Choose a truck below to request an assignment."
            />
          )}

          <Button
            label="Link / change truck"
            variant="secondary"
            onPress={() => navigation.navigate('Truck handover', { driverId: driver.id })}
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
      {/* <MenuRow title="Messages & broadcasts" icon="chatbubbles-outline" onPress={() => navigation.navigate("Messages")} /> */}
      <MenuRow title="Crew & driving" icon="swap-horizontal-outline" onPress={() => navigation.navigate("Crew & driving")} />
      <MenuRow title="Language & voice" icon="language-outline" onPress={() => navigation.navigate("Experience settings")} />
      <MenuRow title="Settings & support" icon="settings-outline" onPress={() => navigation.navigate("Manager settings")} />
    </ManagerPage>
  );
}
export function Settings({ navigation }) {
  const { user, organization, logout } = useAuth();
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const handleCall = () => {
    Linking.openURL("tel:+918319353177").catch(() => {
      Alert.alert(
        "Phone Helpline",
        "Direct dialer could not be launched. Please call Dev Gupta at +91 831 935 3177 directly."
      );
    });
  };

  const handleWhatsApp = () => {
    const url = "https://wa.me/918319353177?text=Hello%20Dev,%20I%20need%20assistance%20with%20GNB%20DriverApp";
    Linking.openURL(url).catch(() => {
      Alert.alert(
        "WhatsApp Helpline",
        "WhatsApp could not be opened. Please message Dev Gupta at +91 831 935 3177."
      );
    });
  };

  const handleEmail = () => {
    Linking.openURL("mailto:gnbmotors60@gmail.com?subject=GNB%20Fleet%20Support%20Request").catch(() => {
      Alert.alert(
        "Email Support",
        "Email client could not be launched. Please write to gnbmotors60@gmail.com directly."
      );
    });
  };

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of your account on this device?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
            } catch (err) {
              setError(err.message || "Failed to sign out");
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const displayName =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Fleet Account";
  const userInitials =
    displayName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "GA";

  // Dynamic system diagnostics
  const appVersion = APP_VERSION || Constants.expoConfig?.version || "2.0.0";
  const apiHost = process.env.EXPO_PUBLIC_API_URL
    ? process.env.EXPO_PUBLIC_API_URL.replace(/^https?:\/\//, "").split("/")[0]
    : "api.app.gnbedge.in";
  const platformName =
    Platform.OS === "ios"
      ? "Apple iOS"
      : Platform.OS === "android"
        ? "Google Android"
        : Platform.OS === "web"
          ? "Web Browser"
          : Platform.OS.toUpperCase();
  const platformVersion = Platform.Version ? `OS ${Platform.Version}` : "";
  const isDev = Boolean(__DEV__);
  const environmentLabel = isDev
    ? "Development (Debug)"
    : "Production Telematics (Live)";

  return (
    <ManagerPage
      navigation={navigation}
      title="Settings & support"
      subtitle="Fleet preferences, push alerts, and direct operational support."
      allowEmpty
    >
      <Card style={s.profileCard}>
        <View style={s.profileHeader}>
          <View style={s.avatarCircle}>
            <AppText weight="bold" style={s.avatarText}>
              {userInitials}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.profileNameRow}>
              <AppText variant="h3" weight="bold">
                {displayName}
              </AppText>
              <View style={s.roleBadge}>
                <AppText weight="bold" style={s.roleBadgeText}>
                  {user?.role || "USER"}
                </AppText>
              </View>
            </View>
            <AppText variant="small" muted>
              {organization?.name || "GNB Fleet Enterprise"}
            </AppText>
          </View>
        </View>

        <View style={s.profileDivider} />

        <View style={s.profileDetailRow}>
          <View style={s.profileDetailItem}>
            <Ionicons name="mail-outline" size={14} color={colors.textMuted} />
            <AppText variant="small" muted style={{ flex: 1 }} numberOfLines={1}>
              {user?.email || "No email registered"}
            </AppText>
          </View>
          <View style={s.profileDetailItem}>
            <Ionicons name="call-outline" size={14} color={colors.textMuted} />
            <AppText variant="small" muted style={{ flex: 1 }} numberOfLines={1}>
              {user?.phone || user?.mobileNumber || "No phone registered"}
            </AppText>
          </View>
        </View>
      </Card>

      <SectionHeading
        title="Notifications & alerts"
        caption="Real-time push delivery and device notifications."
      />
      <PushSettings />

      <SectionHeading
        title="Preferences & system"
        caption="Fleet interface and language controls."
      />
      <MenuRow
        title="Language & voice guidance"
        detail="Dialect & voice options (English, Hindi, Bengali)"
        icon="language-outline"
        onPress={() => navigation.navigate("Experience settings")}
      />
      <MenuRow
        title="Theme & appearance"
        detail="Light theme · High contrast fleet standard"
        icon="sunny-outline"
      />

      <SectionHeading
        title="Helpdesk & support"
        caption="Direct operational contact lines."
      />
      <View style={s.supportGrid}>
        <TouchableOpacity
          style={s.supportCard}
          onPress={handleCall}
          activeOpacity={0.8}
        >
          <View style={[s.supportIconCircle, { backgroundColor: "#EFF6FF" }]}>
            <Ionicons name="call" size={20} color="#1D4ED8" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText weight="bold" style={s.supportCardTitle}>
              Dev Gupta · Operations Lead
            </AppText>
            <AppText variant="small" muted>
              +91 831 935 3177
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.supportCard}
          onPress={handleWhatsApp}
          activeOpacity={0.8}
        >
          <View style={[s.supportIconCircle, { backgroundColor: "#DCFCE7" }]}>
            <Ionicons name="logo-whatsapp" size={20} color="#15803D" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText weight="bold" style={s.supportCardTitle}>
              WhatsApp Support
            </AppText>
            <AppText variant="small" muted>
              +91 831 935 3177 · Dev Gupta
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.supportCard}
          onPress={handleEmail}
          activeOpacity={0.8}
        >
          <View style={[s.supportIconCircle, { backgroundColor: "#F3E8FF" }]}>
            <Ionicons name="mail" size={20} color="#7E22CE" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText weight="bold" style={s.supportCardTitle}>
              Email Fleet Desk
            </AppText>
            <AppText variant="small" muted>
              gnbmotors60@gmail.com
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Card style={s.systemInfoCard}>
        <View style={s.systemInfoHeader}>
          <View style={s.systemInfoTitleRow}>
            <Ionicons name="hardware-chip-outline" size={17} color={colors.primary} />
            <AppText weight="bold" style={s.systemInfoTitle}>
              System & Diagnostics
            </AppText>
          </View>
          <View style={[s.envBadge, isDev ? s.envBadgeDev : s.envBadgeProd]}>
            <AppText weight="bold" style={[s.envBadgeText, isDev ? s.envBadgeTextDev : s.envBadgeTextProd]}>
              {isDev ? "DEV" : "PRODUCTION"}
            </AppText>
          </View>
        </View>

        <View style={s.systemInfoDivider} />

        <View style={s.systemInfoRow}>
          <AppText variant="small" muted>
            App Version
          </AppText>
          <AppText variant="small" weight="semibold">
            v{appVersion}
          </AppText>
        </View>

        <View style={s.systemInfoRow}>
          <AppText variant="small" muted>
            Environment
          </AppText>
          <AppText
            variant="small"
            weight="semibold"
            color={isDev ? "#B45309" : "#15803D"}
          >
            {environmentLabel}
          </AppText>
        </View>

        <View style={s.systemInfoRow}>
          <AppText variant="small" muted>
            Device Platform
          </AppText>
          <AppText variant="small" weight="semibold">
            {platformName} {platformVersion ? `· ${platformVersion}` : ""}
          </AppText>
        </View>

        <View style={s.systemInfoRow}>
          <AppText variant="small" muted>
            API Gateway
          </AppText>
          <AppText variant="small" weight="semibold">
            {apiHost}
          </AppText>
        </View>
      </Card>

      {error ? <AppText color={colors.error}>{error}</AppText> : null}
      <Button
        label="Log out"
        variant="secondary"
        loading={loggingOut}
        onPress={handleLogout}
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


function Filters({ values, selected, onSelect, counts }) {
  const isSegmented = values.length <= 5;
  const hasCounts = Boolean(counts);

  const getDotColor = (val) => {
    const v = String(val).toLowerCase();
    if (v === "moving" || v === "driving") return "#0C9F41";
    if (v === "stopped") return "#9333EA";
    if (v === "idling") return "#F97316";
    if (v === "offline" || v === "unassigned") return "#9CA3AF";
    if (v === "at plant") return "#2563EB";
    if (v === "resting") return "#F59E0B";
    return null;
  };

  const content = values.map((value) => {
    const isSelected = selected === value;
    const dotColor = getDotColor(value);
    const countVal = counts ? counts[value] ?? counts[value.toLowerCase()] : null;

    return (
      <Pressable
        key={value}
        accessibilityRole="button"
        accessibilityLabel={`Filter: ${value}${countVal !== null && countVal !== undefined ? ` (${countVal})` : ""}`}
        accessibilityState={{ selected: isSelected }}
        style={[
          s.filterChip,
          isSegmented && s.filterChipSegmented,
          hasCounts && s.filterChipWithCounts,
          isSelected && s.filterChipSelected,
        ]}
        onPress={() => onSelect(value)}
      >
        <View style={s.filterInnerRow}>
          {dotColor && (
            <View
              style={[
                s.filterDot,
                { backgroundColor: isSelected ? colors.white : dotColor },
              ]}
            />
          )}
          <AppText
            variant="caption"
            weight={isSelected ? "bold" : "semibold"}
            color={isSelected ? colors.white : colors.textMuted}
            style={s.filterText}
            numberOfLines={1}
          >
            {value}
          </AppText>
        </View>
        {countVal !== null && countVal !== undefined && (
          <AppText
            variant="small"
            weight="extrabold"
            color={isSelected ? colors.white : colors.text}
            style={s.filterCountText}
          >
            {countVal}
          </AppText>
        )}
      </Pressable>
    );
  });

  if (isSegmented) {
    return <View style={s.filtersSegmentedContainer}>{content}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.filtersScrollContainer}
    >
      {content}
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
  filtersSegmentedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    width: "100%",
    paddingBottom: 4,
  },
  filtersScrollContainer: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 4,
  },
  filterChip: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  filterChipSegmented: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 2,
    paddingVertical: 6,
  },
  filterChipWithCounts: {
    paddingVertical: 5,
    minHeight: 44,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDeep,
  },
  filterInnerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterText: {
    fontSize: 10.5,
    lineHeight: 14,
    textTransform: "capitalize",
  },
  filterCountText: {
    fontSize: 13,
    lineHeight: 16,
    marginTop: 1,
  },
  dutyCaption: { marginTop: 6, marginLeft: 16 },
  profileCard: {
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    gap: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    color: '#1D4ED8',
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleBadgeText: {
    fontSize: 10,
    color: '#475569',
    letterSpacing: 0.5,
  },
  profileDivider: {
    height: 1,
    backgroundColor: colors.hairline,
    marginVertical: 4,
  },
  profileDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileDetailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  supportGrid: {
    gap: 8,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  supportIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportCardTitle: {
    fontSize: 13.5,
    color: colors.text,
  },
  systemInfoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.lg,
    padding: 14,
    gap: 10,
  },
  systemInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  systemInfoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  systemInfoTitle: {
    fontSize: 13,
    color: '#0F172A',
  },
  envBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  envBadgeProd: {
    backgroundColor: '#DCFCE7',
  },
  envBadgeDev: {
    backgroundColor: '#FEF3C7',
  },
  envBadgeText: {
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  envBadgeTextProd: {
    color: '#15803D',
  },
  envBadgeTextDev: {
    color: '#B45309',
  },
  systemInfoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  systemInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
