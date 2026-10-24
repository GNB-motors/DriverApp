import React, { useEffect, useState } from "react";
import { AppText, Button, Card } from "../../components/ui";
import { useManagerData } from "../context/ManagerDataContext";
import FleetMap from "./FleetMap";
export default function VehicleTrailMap({ vehicle }) {
  const { service, branchId } = useManagerData();
  const [state, setState] = useState({
    key: null,
    points: [],
    loading: true,
    error: null,
  });
  const [retry, setRetry] = useState(0);
  const key = `${branchId}:${vehicle.telemetryRegistration}`;
  useEffect(() => {
    let active = true;
    setState({ key, points: [], loading: true, error: null });
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 3600000);
    service
      .getTrail(vehicle.telemetryRegistration, {
        branchId: branchId === "all" ? undefined : branchId,
        from: from.toISOString(),
        to: to.toISOString(),
      })
      .then((result) => {
        if (active)
          setState({
            key,
            points: result.points,
            truncated: result.truncated,
            loading: false,
            error: null,
          });
      })
      .catch((error) => {
        if (active)
          setState({ key, points: [], loading: false, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [service, key, retry]);
  return (
    <>
      <FleetMap
        vehicles={[vehicle]}
        trailPoints={state.key === key ? state.points : []}
      />
      {state.loading ? (
        <AppText muted>Loading recorded trail…</AppText>
      ) : state.error ? (
        <Card>
          <AppText muted>{state.error}</AppText>
          <Button
            label="Retry trail"
            variant="secondary"
            onPress={() => setRetry((value) => value + 1)}
          />
        </Card>
      ) : (
        <AppText variant="caption" muted>
          {state.points.length
            ? `Recorded positions from the last 24 hours${state.truncated ? " · Trail is sampled" : ""}`
            : "No recorded trail in the last 24 hours."}
        </AppText>
      )}
    </>
  );
}
