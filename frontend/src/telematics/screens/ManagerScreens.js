import HistoricalTripScreen from './HistoricalTripScreen';
import PushSettings from '../../components/PushSettings';
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import WorkspacePage from "../components/WorkspacePage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  AppText,
  Card,
  Button,
  TextField,
  colors,
  radius,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
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
const date = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
export function ManagerPage({ navigation, title, subtitle, action, children, allowEmpty = false, showSourceErrors = true }) {
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
  return (
    <WorkspacePage
      navigation={navigation}
      title={title}
      subtitle={subtitle}
      label={roleLabel}
      action={action}
      refreshing={loading && !!data}
      onRefresh={refresh}
      filters={branches.length > 1 ? (
        <ScrollView horizontal style={s.branchScroller} showsHorizontalScrollIndicator={false} contentContainerStyle={s.branchRow}>
          {branches.map((branch) => (
            <Pressable
              key={branch.id}
              accessibilityRole="button"
              accessibilityLabel={`Branch: ${branch.id === "all" ? "All branches" : branch.name}`}
              accessibilityState={{ selected: branchId === branch.id }}
              style={[s.branchFilter, branchId === branch.id && s.branchFilterSelected]}
              onPress={() => selectBranch(branch.id)}
            >
              <Ionicons name="business-outline" size={14} color={branchId === branch.id ? colors.white : colors.textMuted} />
              <AppText variant="caption" weight="semibold" color={branchId === branch.id ? colors.white : colors.textMuted}>
                {branch.id === "all" ? "All branches" : branch.name}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    >
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
    </WorkspacePage>
  );
}

export function ManagerHome({ navigation }) {
  const { data, branchId } = useManagerData();
  const pending = data
    ? data.fuel.filter((item) => item.status === "Pending review").length +
      data.bills.filter((item) => item.status === "Pending review").length
    : 0;
  return (
    <ManagerPage
      navigation={navigation}
      title="Your fleet, in focus."
      subtitle="The overview you need. The actions that matter."
    >
      <LinearGradient colors={colors.heroGradient} style={s.hero}>
        <AppText variant="caption" color={colors.onPrimaryMuted}>
          {branchId.toUpperCase()} · LOADED RECORDS
        </AppText>
        <AppText variant="display" color={colors.white}>
          {data?.vehicles.length || 0} trucks.
        </AppText>
        <AppText color={colors.onPrimaryMuted}>
          {data?.vehicles.filter((v) => v.status === "moving").length || 0}{" "}
          moving ·{" "}
          {data?.vehicles.filter((v) => v.status === "offline").length || 0}{" "}
          offline
        </AppText>
        <Button
          label="Explore fleet"
          variant="secondary"
          onPress={() => navigation.navigate("Fleet")}
          style={s.heroButton}
        />
      </LinearGradient>
      <View style={s.metrics}>
        <KpiCard
          value={data?.drivers.length || 0}
          label="Drivers"
          icon="people-outline"
          caption="In selected branch"
        />
        <KpiCard
          value={pending}
          label="To review"
          icon="receipt-outline"
          caption="Fuel and workshop bills"
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
        detail={`${pending} items across fuel and bills`}
        icon="water-outline"
        onPress={() => navigation.navigate("Fuel review")}
      />
      <MenuRow
        title="Maintenance & issues"
        detail="Track repairs and workshop bills"
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
      {!vehicles.length && <Empty />}
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
      {!vehicles.length && <Empty />}
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
  const { data } = useManagerData();
  const duty = route.name === "Duty board";
  const [filter, setFilter] = useState("All");
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
      subtitle="People behind every kilometre."
    >
      <Filters
        values={["All", "Driving", "Resting", "Unlinked"]}
        selected={filter}
        onSelect={setFilter}
      />
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
          {duty && (
            <AppText variant="caption" muted style={s.dutyCaption}>
              {Math.floor(driver.drivingMinutes / 60)}h{" "}
              {driver.drivingMinutes % 60}m driving
            </AppText>
          )}
        </Pressable>
      ))}
      {!drivers.length && <Empty />}
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
    {!trips.length && <Unavailable />}
  </ManagerPage>;
}

export function More({ navigation }) {
  return (
    <ManagerPage
      navigation={navigation}
      title="Fleet essentials"
      subtitle="The rest of your working toolkit."
    >
      {[
        ["Fleet", "bus-outline"],
        ["Duty board", "time-outline"],
        ["Fleet trips", "navigate-outline"],
        ["Maintenance", "construct-outline"],
        ["Fuel review", "water-outline"],
        ["Fleet documents", "document-text-outline"],
        ["Team & access", "people-outline"],
        ["AdBlue / DEF", "flask-outline"],
        ["Manager settings", "settings-outline"],
      ].map(([name, icon]) => (
        <MenuRow
          key={name}
          title={name === "Manager settings" ? "Settings & support" : name}
          icon={icon}
          onPress={() => navigation.navigate(name)}
        />
      ))}
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
  branchScroller: { flexGrow: 0 },
  branchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  branchFilter: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: colors.surface },
  branchFilterSelected: { backgroundColor: colors.primary },
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
