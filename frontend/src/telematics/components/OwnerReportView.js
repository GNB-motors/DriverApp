import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  AppText,
  Card,
  Button,
  Badge,
  BottomSheet,
  TextField,
  SegmentedControl,
  BackHeader,
  SectionHeader,
  colors,
  spacing,
  radius,
  elevation,
} from "../../components/ui";
import { Choice } from "./FormControls";
import {
  istDay,
  yesterday,
  shiftDay,
  validBusinessDay,
  displayMetric,
  sectionNames,
  hisabTiles,
  adaptWebOwnerReport,
} from "../services/ownerReport";
import {
  reportMeta,
  friendlyLabel,
  metricValue,
  shortNumber,
  sectionState,
  groupSections,
} from "../services/ownerPresentation";
import { GNB_LOGO_URI } from "../experience/gnbLogoUri";
import { useManagerData } from "../context/ManagerDataContext";
import {
  FleetTopBar,
  FleetPulseSection,
  FleetTodayHighlights,
  OperationalHubSection,
  RecentExceptionsSection,
} from "./FleetDashboardElements";

export function OwnerScreen({ navigation, title, subtitle, action, children }) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const back = navigation.getState().type === "stack" && navigation.canGoBack();
  return (
    <View style={s.screen}>
      {focused && <StatusBar style="dark" />}
      <BackHeader
        active={focused}
        title={title}
        subtitle={subtitle}
        onBack={back ? () => navigation.goBack() : undefined}
        right={action}
      />
      <KeyboardAvoidingView
        style={s.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            s.detailBody,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
export function IconAction({ icon, label, onPress, disabled, light = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.iconAction,
        light && s.iconLight,
        (disabled || pressed) && s.dim,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={light ? colors.white : colors.text}
      />
    </Pressable>
  );
}
export function OwnerGroupRow({
  title,
  subtitle,
  icon,
  right,
  onPress,
  last = false,
  expanded,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={expanded == null ? undefined : { expanded }}
      onPress={onPress}
      style={({ pressed }) => [
        s.groupRow,
        !last && s.rowBorder,
        pressed && s.dim,
      ]}
    >
      {icon && (
        <View style={s.rowIcon}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
      )}
      <View style={s.grow}>
        <AppText variant="small" weight="semibold">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" muted style={s.rowSub}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      <Ionicons
        name={
          expanded == null
            ? "chevron-forward"
            : expanded
              ? "chevron-up"
              : "chevron-down"
        }
        size={16}
        color={colors.fog300}
      />
    </Pressable>
  );
}
export function DateSelector({ date, onChange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(date);
  useEffect(() => setDraft(date), [date, open]);
  const title =
    date === yesterday()
      ? "Yesterday"
      : date === istDay()
        ? "Today"
        : new Date(`${date}T12:00:00+05:30`).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            timeZone: "Asia/Kolkata",
          });
  return (
    <>
      <View style={s.dateRow}>
        <View>
          <AppText variant="caption" muted>
            DAILY REPORT
          </AppText>
          <AppText variant="small" weight="semibold">
            {new Date(`${date}T12:00:00+05:30`).toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              timeZone: "Asia/Kolkata",
            })}{" "}
            <AppText variant="caption" muted>
              · IST
            </AppText>
          </AppText>
        </View>
        <View style={s.dateActions}>
          <IconAction
            icon="chevron-back"
            label="Previous day"
            onPress={() => onChange(shiftDay(date, -1))}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose report date"
            onPress={() => setOpen(true)}
            style={s.dateChip}
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color={colors.primary}
            />
            <AppText variant="small" weight="semibold" color={colors.primary}>
              {title}
            </AppText>
          </Pressable>
          <IconAction
            icon="chevron-forward"
            label="Next day"
            disabled={date >= istDay()}
            onPress={() => onChange(shiftDay(date, 1))}
          />
        </View>
      </View>
      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <View style={s.sheetHeading}>
          <AppText variant="h2">Report date</AppText>
          <IconAction
            icon="close"
            label="Close date picker"
            onPress={() => setOpen(false)}
          />
        </View>
        <AppText variant="small" muted>
          Choose a business day in Indian Standard Time.
        </AppText>
        <SegmentedControl
          variant="pill"
          value={draft}
          options={[
            { label: "Yesterday", value: yesterday() },
            { label: "Today", value: istDay() },
          ]}
          onChange={setDraft}
        />
        {Platform.OS === "web" ? (
          <TextField
            label="Report date (YYYY-MM-DD)"
            value={draft}
            onChangeText={setDraft}
            maxLength={10}
          />
        ) : (
          <DateTimePicker
            value={
              new Date(
                `${validBusinessDay(draft) ? draft : date}T12:00:00+05:30`,
              )
            }
            maximumDate={new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            timeZoneName="Asia/Kolkata"
            themeVariant="light"
            onChange={(event, value) => {
              if (event.type !== "dismissed" && value) setDraft(istDay(value));
            }}
          />
        )}
        <Button
          label="Show report"
          disabled={!validBusinessDay(draft) || draft > istDay()}
          onPress={() => {
            onChange(draft);
            setOpen(false);
          }}
        />
      </BottomSheet>
    </>
  );
}
export function Highlight({ label, icon, value, unit, caption, onPress }) {
  return (
    <Card
      padding={14}
      onPress={onPress}
      accessibilityLabel={`${label}: ${value == null ? "unavailable" : shortNumber(value, unit === "INR")}`}
      style={s.highlight}
    >
      <View style={s.highlightTop}>
        <Ionicons name={icon} size={17} color={colors.primary} />
        <Ionicons name="arrow-forward" size={15} color={colors.fog300} />
      </View>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText
        mono
        weight="medium"
        style={s.highlightValue}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {shortNumber(value, unit === "INR")}
        {value != null && unit === "km" ? (
          <AppText variant="small" mono muted>
            {" "}
            km
          </AppText>
        ) : null}
      </AppText>
      <AppText variant="caption" muted>
        {value == null ? "Data unavailable" : caption}
      </AppText>
    </Card>
  );
}
function FleetHero({ section, onOpen }) {
  const moving = metricValue(section, "moving"),
    total = metricValue(section, "total");
  const observation = section?.sources?.find(
    (source) => source.observedAt,
  )?.observedAt;
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel="Fleet right now"
    >
      <LinearGradient
        colors={colors.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <View style={s.spread}>
          <AppText
            variant="label"
            color={colors.onPrimaryMuted}
            style={s.heroEyebrow}
          >
            Fleet right now
          </AppText>
          <View style={s.heroTag}>
            <Ionicons name="radio-outline" size={12} color={colors.white} />
            <AppText variant="caption" color={colors.white}>
              Truck telemetry
            </AppText>
          </View>
        </View>
        <View style={s.heroMain}>
          <View style={s.grow}>
            <View style={s.heroNumbers}>
              <AppText mono color={colors.white} style={s.heroValue}>
                {shortNumber(moving)}
              </AppText>
              <AppText mono color={colors.onPrimaryMuted} style={s.heroTotal}>
                / {shortNumber(total)}
              </AppText>
            </View>
            <AppText variant="small" color={colors.onPrimaryMuted}>
              trucks moving
            </AppText>
          </View>
          <View style={s.heroArrow}>
            <Ionicons name="arrow-forward" size={21} color={colors.white} />
          </View>
        </View>
        <View style={s.heroStats}>
          {[
            ["parked", "Parked"],
            ["idling", "Idling"],
            ["offline", "Offline"],
            ["unknown", "Unknown"],
          ].map(([key, label]) => (
            <View style={s.heroStat} key={key}>
              <AppText
                variant="small"
                mono
                weight="medium"
                color={colors.white}
              >
                {shortNumber(metricValue(section, key))}
              </AppText>
              <AppText variant="caption" color={colors.onPrimaryMuted}>
                {label}
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" color={colors.onPrimaryMuted}>
          {observation
            ? `Latest observation ${new Date(observation).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST`
            : "Truck observation time unavailable"}
        </AppText>
      </LinearGradient>
    </Pressable>
  );
}
function ReportRow({ name, section, onOpen, last }) {
  const meta = reportMeta[name] || [
    sectionNames[name] || friendlyLabel(name),
    "analytics-outline",
    "count",
  ];
  const metric = section?.metrics?.[meta[2]];
  const state = sectionState(section);
  return (
    <OwnerGroupRow
      title={meta[0]}
      icon={meta[1]}
      subtitle={state.label}
      last={last}
      onPress={onOpen}
      right={
        <AppText mono variant="small" weight="medium" style={s.rowAmount}>
          {metricValue(section, meta[2]) == null
            ? "—"
            : shortNumber(metric.value, metric.unit === "INR")}
          {metricValue(section, meta[2]) != null && metric.unit === "L"
            ? " L"
            : ""}
        </AppText>
      }
    />
  );
}
export function OwnerReportDashboard({
  navigation,
  route,
  request,
  digest = null,
  date,
  onDateChange,
  branchId,
  branches = [],
  onBranchChange,
  user,
  language,
  onLanguageChange,
  speaking,
  onListen,
  onStop,
  speechError,
}) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const showBack = Boolean(
    route?.name === "Aaj ka hisaab" ||
      route?.name === "Digest" ||
      route?.name === "Owner report" ||
      (navigation?.canGoBack?.() && route?.name !== "Today" && route?.name !== "Home") ||
      (navigation?.getState?.()?.type === "stack" && navigation?.canGoBack?.()),
  );
  const [tab, setTab] = useState("Summary");
  const [branchOpen, setBranchOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);

  const managerContext = useManagerData();
  const fleetVehicles = managerContext?.data?.vehicles || [];
  const movingVehicles = fleetVehicles.filter((v) => v.status === "moving").length;
  const idlingVehicles = fleetVehicles.filter((v) => v.status === "idling").length;
  const stoppedVehicles = fleetVehicles.filter((v) => v.status === "stopped").length;
  const offlineVehicles = fleetVehicles.filter((v) => v.status === "offline").length;
  const driversOnDuty = (managerContext?.data?.drivers || []).length;

  const totalDistanceToday = useMemo(() => {
    let km = 0;
    for (const v of fleetVehicles) {
      if (Number.isFinite(v.todayKm) && v.todayKm > 0) km += v.todayKm;
    }
    if (km === 0 && Array.isArray(managerContext?.data?.trips)) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayTime = todayStart.getTime();
      for (const t of managerContext.data.trips) {
        if (t.startedAt && new Date(t.startedAt).getTime() >= todayTime) {
          km += Number(t.distanceKm) || 0;
        }
      }
    }
    return Math.round(km);
  }, [fleetVehicles, managerContext?.data?.trips]);

  const lowFuelVehicles = useMemo(() => {
    return fleetVehicles.filter((v) => {
      if (Number.isFinite(v.primaryFuelLevel) && v.primaryFuelLevel > 0 && v.primaryFuelLevel < 20) return true;
      if (Number.isFinite(v.fuelLitres) && v.fuelLitres > 0 && v.fuelLitres < 35) return true;
      return false;
    });
  }, [fleetVehicles]);

  const unreadAlertsCount = managerContext?.data?.alertFeed?.unacknowledgedCount || 0;
  const recentAlerts = useMemo(() => {
    const list = managerContext?.data?.alertFeed?.items || managerContext?.data?.alerts || [];
    return list.slice(0, 3);
  }, [managerContext?.data?.alertFeed?.items, managerContext?.data?.alerts]);

  const currentBranchName =
    (branches || managerContext?.branches || []).find(
      (b) => b.id === (branchId || managerContext?.branchId),
    )?.name || "All branches";

  const userName =
    user?.name || user?.firstName || (user?.phone ? `+${user.phone}` : "Owner");
  const rawRole = (user?.role || "").toLowerCase();
  const userRole = rawRole === "manager" ? "Branch Manager" : "Owner";
  const isOwner = rawRole === "owner";

  const onRefresh = useCallback(async () => {
    await Promise.allSettled([request.reload(), managerContext?.refresh?.()]);
  }, [request, managerContext]);

  const sections = useMemo(() => {
    const webAdapted = digest?.data ? adaptWebOwnerReport(digest.data)?.sections : {};
    return {
      ...webAdapted,
      ...(request.data?.sections || {}),
    };
  }, [digest?.data, request.data?.sections]);

  const detail = (name) =>
    navigation.navigate("Owner report section", { name, date });

  const handleSectionOpen = (name) => {
    switch (name) {
      case 'diesel':
        navigation.navigate('Fuel logs', {
          fuelType: 'DIESEL',
          date,
          title: 'Diesel Purchases',
        });
        break;
      case 'adblue':
        navigation.navigate('Fuel logs', {
          fuelType: 'DEF',
          date,
          title: 'AdBlue Purchases',
        });
        break;
      case 'expenses':
      case 'expenseReviews':
        navigation.navigate('Manager approvals', {
          filter: 'DRIVER',
          date,
          title: 'Driver Bills & Claims',
        });
        break;
      case 'fuelReviews':
      case 'sensorReconciliation':
        navigation.navigate('Fuel logs', {
          statusFilter: 'FLAGGED',
          filter: 'FLAGGED',
          date,
          title: 'Fuel Audits & Discrepancies',
        });
        break;
      case 'documents':
        navigation.navigate('Fleet documents', {
          filter: 'EXPIRING',
          title: 'Expiring Fleet Papers',
        });
        break;
      case 'trips':
        navigation.navigate('Fleet trips', {
          timePreset: 'TODAY',
          date,
          title: 'Completed Trips',
        });
        break;
      case 'distance':
        navigation.navigate('Fleet trips', {
          timePreset: 'TODAY',
          highlightMetric: 'distance',
          date,
          title: 'Distance Driven',
        });
        break;
      case 'issues':
      case 'issuesRaised':
      case 'inbox':
      case 'deviations':
      case 'deviationsRaised':
        navigation.navigate('Alerts', {
          title: 'Fleet Alerts & Exceptions',
          filter: 'Pending',
        });
        break;
      case 'people':
      case 'pairedDrivers':
      case 'crew':
        navigation.navigate('Duty board');
        break;
      case 'driverTrends':
        navigation.navigate('Owner trends', { date });
        break;
      default:
        detail(name);
        break;
    }
  };

  const handleHighlightPress = (tile) => {
    if (tile.key === 'trips') {
      navigation.navigate('Fleet trips', {
        timePreset: 'TODAY',
        date,
        title: 'Trips Started Today',
      });
    } else if (tile.key === 'km') {
      navigation.navigate('Fleet trips', {
        timePreset: 'TODAY',
        filter: 'distance',
        highlightMetric: 'distance',
        date,
        title: 'Loaded Kilometers',
      });
    } else if (tile.key === 'diesel') {
      navigation.navigate('Fuel logs', {
        fuelType: 'DIESEL',
        date,
        title: 'Diesel Billed',
      });
    } else if (tile.key === 'bills') {
      navigation.navigate('Manager approvals', {
        filter: 'DRIVER',
        category: 'BILLS',
        date,
        title: 'Driver Bills & Advances',
      });
    } else if (tile.route) {
      navigation.navigate(tile.route);
    } else {
      handleSectionOpen(tile.section);
    }
  };

  const group = groupSections(sections, tab);
  // Same four boxes as the manager home and the web Daily Digest (GET /owner-report).
  const highlights = hisabTiles(digest?.data, { today: date === istDay() });

  return (
    <View style={s.screen}>
      {focused && <StatusBar style="dark" />}

      {/* Top Header */}
      <FleetTopBar
        insets={insets}
        userName={userName}
        userRole={userRole}
        showBack={showBack}
        onBack={() => {
          if (navigation?.canGoBack?.()) {
            navigation.goBack();
          } else {
            navigation?.navigate?.("More");
          }
        }}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.dashboard,
          { paddingBottom: spacing.xl + insets.bottom + 80 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={request.loading && !!request.data}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Fleet Pulse KPI Bar */}
        <FleetPulseSection
          title="Fleet Pulse"
          branchName={currentBranchName}
          onOpenBranch={managerContext?.canSwitchBranch === false ? undefined : () => setBranchOpen(true)}
          movingCount={movingVehicles}
          idlingCount={idlingVehicles}
          stoppedCount={stoppedVehicles}
          offlineCount={offlineVehicles}
          onDutyCount={driversOnDuty}
          navigation={navigation}
        />

        {/* Fleet Today Highlights Bar */}
        <FleetTodayHighlights
          totalDistanceToday={totalDistanceToday}
          onRoadCount={movingVehicles + idlingVehicles}
          totalVehiclesCount={fleetVehicles.length}
          exceptionsCount={unreadAlertsCount + lowFuelVehicles.length}
          hasAlertsOrLowFuel={lowFuelVehicles.length > 0 || unreadAlertsCount > 0}
        />

        {/* Section: Aaj ka hisab */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeaderBar}>
            <AppText variant="h2" weight="extrabold" color={colors.text}>
              Aaj ka hisab
            </AppText>
          </View>

          <DateSelector date={date} onChange={onDateChange} />

          {request.error && (
            <Card variant="outline" style={s.block}>
              <AppText variant="small" weight="semibold">
                {request.data
                  ? "Could not refresh this report"
                  : "Your report could not load"}
              </AppText>
              <AppText variant="small" muted>
                {request.data
                  ? "Showing your last loaded figures for this date and branch."
                  : request.error}
              </AppText>
              <Button
                label="Try again"
                size="sm"
                variant="secondary"
                onPress={request.reload}
              />
            </Card>
          )}

          {date === istDay() && (
            <View style={s.notice}>
              <Ionicons name="time-outline" size={16} color={colors.warning} />
              <AppText variant="caption" color={colors.warning} style={s.grow}>
                Today is still in progress. Daily totals are partial.
              </AppText>
            </View>
          )}

          {digest?.error ? (
            <AppText variant="caption" color={colors.error}>
              {digest.error}
            </AppText>
          ) : null}
          {digest?.loading && !digest?.data ? (
            <View style={s.grid} accessibilityRole="progressbar" accessibilityLabel="Loading report">
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[s.skeleton, s.highlight, { height: 110 }]} />
              ))}
            </View>
          ) : (
            <View style={s.grid}>
              {highlights.map((tile) => (
                <Highlight
                  key={tile.key}
                  label={tile.label}
                  icon={tile.icon}
                  unit={tile.unit}
                  caption={tile.caption}
                  value={tile.value}
                  onPress={() => handleHighlightPress(tile)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Section: Operational Hub */}
        <View style={s.sectionWrap}>
          <OperationalHubSection navigation={navigation} />

          {/* Recent Exceptions */}
          <RecentExceptionsSection
            alerts={recentAlerts}
            unacknowledgedCount={unreadAlertsCount}
            navigation={navigation}
            onViewAll={() => navigation.navigate("Alerts")}
            onSelectAlert={() => navigation.navigate("Alerts")}
          />

          <View style={{ marginTop: 14 }}>
            <SegmentedControl
              variant="pill"
              options={["Summary", "Money", "Work", "People"]}
              value={tab}
              onChange={setTab}
            />
          </View>

          {tab === "Summary" ? (
            <View style={s.hubContent}>
              <SectionHeader
                label="Needs your review"
                right={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open alerts"
                    onPress={() => navigation.navigate("Alerts")}
                    hitSlop={8}
                  >
                    <AppText
                      variant="small"
                      weight="semibold"
                      color={colors.rage700}
                    >
                      View all alerts
                    </AppText>
                  </Pressable>
                }
              />
              <Card padding={0}>
                {[
                  {
                    id: 'driverClaims',
                    title: 'Driver Expense Claims',
                    icon: 'receipt-outline',
                    count: metricValue(sections.expenseReviews, 'count') ?? metricValue(sections.expenses, 'pending') ?? null,
                    subtitle: 'Awaiting approval · Driver bills & WhatsApp slips',
                    badgeTone: (metricValue(sections.expenseReviews, 'count') ?? metricValue(sections.expenses, 'pending') ?? 0) > 0 ? 'pending' : 'neutral',
                    onPress: () =>
                      navigation.navigate('Manager approvals', {
                        filter: 'DRIVER',
                        category: 'BILLS',
                        title: 'Driver Bills & Claims',
                      }),
                  },
                  {
                    id: 'fuelAudits',
                    title: 'Fuel Audits & Discrepancies',
                    icon: 'water-outline',
                    count: metricValue(sections.fuelReviews, 'count') ?? (lowFuelVehicles.length > 0 ? lowFuelVehicles.length : null),
                    subtitle: 'Sensor variance & unverified fuel entries',
                    badgeTone: (metricValue(sections.fuelReviews, 'count') ?? lowFuelVehicles.length) > 0 ? 'warning' : 'neutral',
                    onPress: () =>
                      navigation.navigate('Fuel logs', {
                        statusFilter: 'FLAGGED',
                        filter: 'FLAGGED',
                        title: 'Fuel Audits & Discrepancies',
                      }),
                  },
                  {
                    id: 'expiringDocs',
                    title: 'Expiring Compliance & Papers',
                    icon: 'document-text-outline',
                    count: metricValue(sections.documents, 'count') ?? null,
                    subtitle: 'RC, Fitness, Insurance due within 7 days',
                    badgeTone: (metricValue(sections.documents, 'count') ?? 0) > 0 ? 'expired' : 'neutral',
                    onPress: () =>
                      navigation.navigate('Fleet documents', {
                        filter: 'EXPIRING',
                        title: 'Expiring Fleet Papers',
                      }),
                  },
                  {
                    id: 'criticalAlerts',
                    title: 'Critical Fleet Escalations',
                    icon: 'warning-outline',
                    count: unreadAlertsCount,
                    subtitle: 'SOS, speed & safety alarms needing attention',
                    badgeTone: unreadAlertsCount > 0 ? 'expired' : 'neutral',
                    onPress: () =>
                      navigation.navigate('Alerts', {
                        filter: 'Pending',
                        title: 'Critical Fleet Alerts',
                      }),
                  },
                ].map((item, index) => (
                  <OwnerGroupRow
                    key={item.id}
                    title={item.title}
                    icon={item.icon}
                    subtitle={
                      item.count == null
                        ? 'Review data unavailable'
                        : item.count === 0
                          ? 'All items cleared · Queue clean'
                          : `${item.count} waiting · ${item.subtitle}`
                    }
                    right={
                      <Badge
                        tone={item.badgeTone}
                        label={item.count == null ? '—' : String(item.count)}
                      />
                    }
                    onPress={item.onPress}
                    last={index === 3}
                  />
                ))}
              </Card>

              <SectionHeader label="Your workspace" />
              <View style={s.quickActions}>
                {[
                  ["Reviews", "documents-outline", "Capture reviews"],
                  ["Crew", "people-outline", "Crew & driving"],
                  ["Trends", "trending-up-outline", "Owner trends"],
                ].map(([label, icon, route]) => (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    onPress={() =>
                      navigation.navigate(
                        route,
                        route === "Owner trends" ? { date } : undefined,
                      )
                    }
                    style={s.quickAction}
                  >
                    <View style={s.quickIcon}>
                      <Ionicons
                        name={icon}
                        size={21}
                        color={colors.primary}
                      />
                    </View>
                    <AppText variant="caption" weight="semibold">
                      {label}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              {sections.dataHealth && (
                <Card
                  padding={14}
                  onPress={() => detail("dataHealth")}
                  accessibilityLabel="View data health"
                >
                  <View style={s.row}>
                    <Ionicons
                      name="pulse-outline"
                      size={19}
                      color={colors.primary}
                    />
                    <View style={s.grow}>
                      <AppText variant="small" weight="semibold">
                        Know what’s behind the numbers
                      </AppText>
                      <AppText variant="caption" muted>
                        Coverage, source times & missing data
                      </AppText>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.fog300}
                    />
                  </View>
                </Card>
              )}
            </View>
          ) : (
            <View style={s.hubContent}>
              <SectionHeader
                label={
                  tab === "Money"
                    ? "Recorded money & evidence"
                    : tab === "People"
                      ? "Drivers & duty"
                      : "Fleet & operations"
                }
              />
              <Card padding={0}>
                {group.map((name, i) => (
                  <ReportRow
                    key={name}
                    name={name}
                    section={sections[name]}
                    onOpen={() => handleSectionOpen(name)}
                    last={i === group.length - 1}
                  />
                ))}
                {!group.length && (
                  <View style={s.empty}>
                    <AppText variant="small" muted>
                      No report sections available in this view.
                    </AppText>
                  </View>
                )}
              </Card>
              <AppText variant="caption" muted>
                Tap a row for its figures, coverage and supporting records.
                Unavailable figures are shown as —.
              </AppText>
            </View>
          )}

          {request.data && (
            <View style={s.footer}>
              <Ionicons name="sync-outline" size={13} color={colors.fog300} />
              <AppText variant="caption" muted style={s.grow}>
                Report checked{" "}
                {new Date(request.data.generatedAt).toLocaleTimeString(
                  "en-IN",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Kolkata",
                  },
                )}{" "}
                IST · pull to refresh
              </AppText>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="About this report"
            onPress={() => setAboutOpen(true)}
            style={{
              minHeight: 44,
              justifyContent: "center",
              alignSelf: "flex-start",
            }}
          >
            <AppText
              variant="caption"
              weight="semibold"
              color={colors.rage700}
            >
              About this report
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
      <BottomSheet
        visible={managerContext?.canSwitchBranch !== false && branchOpen}
        onClose={() => setBranchOpen(false)}
      >
        <View style={s.sheetHeading}>
          <AppText variant="h2">Your branches</AppText>
          <IconAction
            icon="close"
            label="Close branch selector"
            onPress={() => setBranchOpen(false)}
          />
        </View>
        <ScrollView style={s.sheetList}>
          {branches.map((b) => (
            <OwnerGroupRow
              key={b.id}
              icon="business-outline"
              title={b.name}
              right={
                branchId === b.id ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                  />
                ) : null
              }
              onPress={() => {
                onBranchChange(b.id);
                setBranchOpen(false);
              }}
            />
          ))}
        </ScrollView>
        {isOwner && (
          <View style={{ paddingTop: spacing.md }}>
            <Button
              label="Inspect branch overview"
              variant="secondary"
              onPress={() => {
                setBranchOpen(false);
                navigation.navigate('Branch overview', { id: branchId === 'all' ? undefined : branchId });
              }}
            />
          </View>
        )}
      </BottomSheet>
      <BottomSheet visible={aboutOpen} onClose={() => setAboutOpen(false)}>
        <View style={s.sheetHeading}>
          <AppText variant="h2">About this report</AppText>
          <IconAction
            icon="close"
            label="Close report information"
            onPress={() => setAboutOpen(false)}
          />
        </View>
        <AppText variant="small" muted>
          Daily figures use the selected IST business day. Fleet state and
          review queues describe now. — means data is unavailable, not zero.
        </AppText>
        {(request.data?.notes || []).map((note, index) => (
          <AppText key={index} variant="small" muted>
            {note}
          </AppText>
        ))}
      </BottomSheet>
      <BottomSheet visible={audioOpen} onClose={() => setAudioOpen(false)}>
        <View style={s.sheetHeading}>
          <AppText variant="h2">Listen to your report</AppText>
          <IconAction
            icon="close"
            label="Close audio options"
            onPress={() => setAudioOpen(false)}
          />
        </View>
        <AppText variant="small" muted>
          A spoken summary of the selected business day, including missing-data
          qualifications.
        </AppText>
        <Choice
          label="Report language"
          value={language}
          onChange={onLanguageChange}
          options={[
            ["en", "English"],
            ["hi", "हिन्दी"],
            ["bn", "বাংলা"],
          ]}
        />
        {speechError ? (
          <AppText variant="small" color={colors.error}>
            {speechError}
          </AppText>
        ) : null}
        <Button
          label={speaking ? "Stop narration" : "Listen to report"}
          icon={speaking ? "stop-outline" : "volume-high-outline"}
          disabled={!request.data}
          onPress={speaking ? onStop : onListen}
        />
      </BottomSheet>
    </View>
  );
}
export function OwnerSectionContent({ name, section, onRecords }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const state = sectionState(section);
  return (
    <>
      <View style={s.row}>
        <Badge label={state.label} tone={state.tone} />
        <AppText variant="caption" muted>
          {section?.coverage || "Unknown"} coverage
        </AppText>
      </View>
      {section?.availability !== "unavailable" &&
        section?.status !== "error" && (
          <Card padding={0}>
            {Object.entries(section?.metrics || {}).map(([key, metric], i) => (
              <View key={key} style={[s.metricRow, i > 0 && s.metricBorder]}>
                <View style={s.grow}>
                  <AppText variant="small" weight="semibold">
                    {key === "count"
                      ? name === "trips"
                        ? "Completed trips"
                        : "Matching records"
                      : friendlyLabel(key)}
                  </AppText>
                  <AppText variant="caption" muted style={s.rowSub}>
                    {metric.meaning}
                  </AppText>
                </View>
                <AppText
                  mono
                  variant="small"
                  weight="medium"
                  style={s.metricValue}
                >
                  {displayMetric(metric)}
                </AppText>
              </View>
            ))}
          </Card>
        )}
      {section?.drilldown && (
        <Button
          label="View supporting records"
          icon="list-outline"
          onPress={onRecords}
        />
      )}
      {(section?.notes || []).length > 0 && (
        <Card variant="tinted" style={s.block}>
          <AppText variant="small" weight="semibold">
            About these figures
          </AppText>
          {section.notes.map((note, i) => (
            <AppText variant="small" muted key={i}>
              {note}
            </AppText>
          ))}
        </Card>
      )}
      <Card padding={0}>
        <OwnerGroupRow
          title="Sources & freshness"
          expanded={sourcesOpen}
          icon="information-circle-outline"
          subtitle="Where these figures come from"
          onPress={() => setSourcesOpen(!sourcesOpen)}
          last
        />
        {sourcesOpen && (
          <View style={s.sourceBody}>
            {(section?.sources || []).map((source, i) => (
              <View style={s.block} key={i}>
                <AppText variant="small" weight="semibold">
                  {source.name}
                </AppText>
                <AppText variant="caption" muted>
                  Last source observation:{" "}
                  {source.observedAt
                    ? new Date(source.observedAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      }) + " IST"
                    : "Unavailable"}
                </AppText>
                <AppText variant="caption" muted>
                  Checked:{" "}
                  {source.checkedAt
                    ? new Date(source.checkedAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      }) + " IST"
                    : "Unavailable"}
                </AppText>
              </View>
            ))}
            {!section?.sources?.length && (
              <AppText variant="small" muted>
                No source records are connected for this section.
              </AppText>
            )}
          </View>
        )}
      </Card>
    </>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  grow: { flex: 1, minWidth: 0 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 8,
    paddingRight: 14,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeftLogo: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 2,
    gap: 6,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogo: {
    width: 88,
    height: 46,
  },
  headerRightUser: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2,
    paddingLeft: 10,
  },
  userNameText: {
    fontSize: 16,
    lineHeight: 20,
    textAlign: "right",
  },
  userRoleText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: "right",
  },
  pulseSection: {
    gap: 10,
  },
  pulseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  pulseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  branchPillPulse: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.tealTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  branchPillPulseText: {
    fontSize: 11,
    lineHeight: 15,
    maxWidth: 150,
  },
  pulseCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...elevation.sm,
  },
  pulseCol: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    paddingHorizontal: 1,
  },
  pulseColTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  pulseColLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  pulseColNumber: {
    fontSize: 18,
    lineHeight: 22,
    marginTop: 3,
  },
  pulseDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.hairline,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  highlightsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...elevation.sm,
  },
  highlightItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  highlightIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  highlightCol: {
    flex: 1,
    minWidth: 0,
  },
  highlightLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  highlightDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.hairline,
    marginHorizontal: 8,
  },
  sectionWrap: {
    gap: 12,
  },
  sectionHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginTop: 4,
  },
  hubContent: {
    gap: 14,
  },
  dashboard: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 16,
  },
  detailBody: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    padding: 20,
    gap: 16,
  },
  title: { marginTop: 3 },
  spread: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconAction: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLight: { backgroundColor: colors.onPrimaryFaint },
  dim: { opacity: 0.4 },
  branchChip: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  dateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  dateActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  hero: { padding: 16, borderRadius: radius.lg, gap: 10 },
  heroEyebrow: { fontSize: 10, letterSpacing: 1.1 },
  heroTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: colors.onPrimaryFaint,
    borderRadius: radius.full,
  },
  heroMain: { flexDirection: "row", alignItems: "center" },
  heroNumbers: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  heroValue: { fontSize: 36, lineHeight: 42 },
  heroTotal: { fontSize: 20, lineHeight: 28 },
  heroArrow: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.onPrimaryFaint,
    justifyContent: "center",
    alignItems: "center",
  },
  heroStats: {
    flexDirection: "row",
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onPrimaryFaint,
  },
  heroStat: { flex: 1, gap: 3 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  highlight: { width: "48%", flexGrow: 1, flexBasis: "46%", gap: 5 },
  highlightTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  highlightValue: { fontSize: 23, lineHeight: 29 },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    minHeight: 66,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.blueTint,
    alignItems: "center",
    justifyContent: "center",
  },
  rowSub: { marginTop: 3 },
  rowAmount: { maxWidth: "30%", textAlign: "right" },
  quickActions: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    minHeight: 68,
  },
  quickIcon: {
    width: 42,
    height: 42,
    backgroundColor: colors.blueTint,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colors.pendingBg,
  },
  sheetHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetList: { maxHeight: 340 },
  block: { gap: 10 },
  empty: { padding: 20 },
  skeleton: { borderRadius: radius.lg, backgroundColor: colors.fog700 },
  metricRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    padding: 16,
  },
  metricBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  metricValue: { maxWidth: "42%", textAlign: "right" },
  sourceBody: {
    padding: 16,
    gap: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
