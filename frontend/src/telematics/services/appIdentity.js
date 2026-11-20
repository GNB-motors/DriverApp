import Constants from "expo-constants";
import * as Crypto from "expo-crypto";

// The backend's version gate compares X-App-Version with each v2 route's
// minimum and answers 426 when it is older, so this must be the real build version.
export const APP_VERSION = Constants.expoConfig?.version ?? null;

export const newIdempotencyKey = () => Crypto.randomUUID();
