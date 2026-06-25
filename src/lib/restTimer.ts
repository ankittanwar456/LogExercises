import { Capacitor, registerPlugin } from "@capacitor/core";

export interface RestTimerPermissionStatus {
  notifications: "granted" | "denied" | "prompt";
}

export interface RestTimerPlugin {
  start(options: { startedAt: number }): Promise<void>;
  stop(): Promise<void>;
  checkPermissions(): Promise<RestTimerPermissionStatus>;
  requestPermissions(): Promise<RestTimerPermissionStatus>;
}

const RestTimer = registerPlugin<RestTimerPlugin>("RestTimer");

export const isRestTimerLockScreenSupported = () => Capacitor.isNativePlatform();

export const startRestTimerLockScreen = async (startedAt: number) => {
  if (!isRestTimerLockScreenSupported()) return;

  await RestTimer.start({ startedAt });
};

export const stopRestTimerLockScreen = async () => {
  if (!isRestTimerLockScreenSupported()) return;

  await RestTimer.stop();
};

export const requestRestTimerPermissions = async () => {
  if (!isRestTimerLockScreenSupported()) {
    return { notifications: "granted" as const };
  }

  return RestTimer.requestPermissions();
};
