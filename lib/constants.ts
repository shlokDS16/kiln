import { Platform } from "react-native";

// HealthKit is iOS-only; hooks short-circuit to safe zeros elsewhere.
export const HEALTHKIT_ENABLED = Platform.OS === "ios";
export const DAILY_FOCUS_TARGET_MIN = 180;
