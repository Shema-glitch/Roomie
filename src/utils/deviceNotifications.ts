/**
 * Native Android/iOS & Web Device Notification Bridge
 * - Uses @capacitor/local-notifications on native Android/iOS with high-importance heads-up channel
 * - Falls back cleanly to standard Web Notification API on browsers
 * - Handles Android 13+ POST_NOTIFICATIONS permission flow and tap deep-linking
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { debugLog } from './debugLog';
import { haptics } from './haptics';

const CHANNEL_ID = 'roomie_flat_alerts';
const PUSH_PREF_KEY = 'roomie_push_notifications_enabled';
const deliveredIds = new Set<string>();
let channelReady = false;

function hashToPositiveInt(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2000000000 || 1;
}

export function isDevicePushEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(PUSH_PREF_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setDevicePushEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PUSH_PREF_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage error
  }
}

export async function initDeviceNotificationChannel(): Promise<void> {
  if (channelReady || !Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Roomie Flat Alerts',
      description: 'Join requests, approval alerts, supermarket pings, and flatmate updates',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
    });
    channelReady = true;
    debugLog.info('notifications', 'channel_init', `Created Android channel ${CHANNEL_ID}`);
  } catch (err: unknown) {
    debugLog.warn(
      'notifications',
      'channel_init_error',
      err instanceof Error ? err.message : 'Failed creating notification channel'
    );
  }
}

export async function checkDeviceNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted';
    } catch {
      return false;
    }
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission === 'granted';
  }
  return false;
}

export async function requestDeviceNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await initDeviceNotificationChannel();
      const current = await LocalNotifications.checkPermissions();
      if (current.display === 'granted') {
        setDevicePushEnabled(true);
        return true;
      }
      const req = await LocalNotifications.requestPermissions();
      const granted = req.display === 'granted';
      setDevicePushEnabled(granted);
      debugLog.info('notifications', 'permission_request', `Native notification permission: ${req.display}`);
      return granted;
    } catch (err: unknown) {
      debugLog.warn(
        'notifications',
        'permission_error',
        err instanceof Error ? err.message : 'Permission prompt failed'
      );
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        setDevicePushEnabled(true);
        return true;
      }
      const perm = await Notification.requestPermission();
      const granted = perm === 'granted';
      setDevicePushEnabled(granted);
      return granted;
    } catch {
      return false;
    }
  }
  return false;
}

export async function showDeviceNotification(params: {
  id?: string;
  title: string;
  body: string;
  linkTarget?: Record<string, unknown>;
}): Promise<boolean> {
  if (!isDevicePushEnabled()) return false;

  const dedupKey = params.id || `${params.title}:${params.body}`;
  if (deliveredIds.has(dedupKey)) return false;
  deliveredIds.add(dedupKey);
  if (deliveredIds.size > 100) {
    const first = deliveredIds.values().next().value;
    if (first) deliveredIds.delete(first);
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await initDeviceNotificationChannel();
      const granted = await checkDeviceNotificationPermission();
      if (!granted) return false;

      const numericId = hashToPositiveInt(dedupKey);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: numericId,
            title: params.title,
            body: params.body,
            channelId: CHANNEL_ID,
            extra: params.linkTarget || {},
            smallIcon: 'ic_launcher',
          },
        ],
      });
      haptics.notificationPing();
      debugLog.info('notifications', 'native_banner_sent', `Displayed native alert: ${params.title}`);
      return true;
    } catch (err: unknown) {
      debugLog.warn(
        'notifications',
        'native_banner_error',
        err instanceof Error ? err.message : 'Failed scheduling local notification'
      );
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(params.title, { body: params.body });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function subscribeToDeviceNotificationTaps(
  onTap: (linkTarget: Record<string, unknown>) => void
): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};
  try {
    const handle = await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const extra = event.notification?.extra;
      if (extra && typeof extra === 'object') {
        onTap(extra as Record<string, unknown>);
      }
    });
    return () => {
      handle.remove();
    };
  } catch {
    return () => {};
  }
}
