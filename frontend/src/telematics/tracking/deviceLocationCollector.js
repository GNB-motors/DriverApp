import * as Location from 'expo-location';
import { createDeviceLocationBroker } from './deviceLocationBroker';
export const deviceLocationCollector = createDeviceLocationBroker({
  watch: ({ interval, navigation }, callback) => Location.watchPositionAsync({
    accuracy: navigation ? Location.Accuracy.BestForNavigation : Location.Accuracy.Balanced,
    timeInterval: interval, distanceInterval: navigation ? 0 : 25,
  }, callback),
});
