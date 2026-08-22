import { useAuth } from '../context/AuthContext';
import { apiConfigured } from '../services/client';
import { useApi } from './useApi';
import vehicleService from '../services/vehicleService';

/**
 * Resolve the signed-in driver's active vehicle. The fuel/repair create endpoints
 * require a vehicleId, but those screens are opened with no vehicle in context —
 * so we source it from the driver's assigned vehicle(s). Returns the first one.
 *
 *   const { vehicleId, vehicle, loading } = useDriverVehicle();
 */
export function useDriverVehicle() {
  const { token } = useAuth();
  const { data, loading } = useApi(
    () => vehicleService.listVehicles(),
    [],
    { enabled: apiConfigured() && !!token, fallback: [] },
  );
  const rows = Array.isArray(data) ? data : (data?.results || data?.rows || data?.items || data?.data || []);
  const vehicle = rows[0] || null;
  const vehicleId = vehicle?._id || vehicle?.id || null;
  return { vehicleId, vehicle, loading };
}

export default useDriverVehicle;
