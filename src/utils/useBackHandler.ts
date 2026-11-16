import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { navigationStack } from './navigationStack';

/**
 * Registers an active back handler into the LIFO priority stack while `enabled` is true.
 * Higher priority runs first (modals = 100, full-screen flows/auth steps = 50, tab history = 10).
 */
export function useBackHandler(
  enabled: boolean,
  priority: number,
  handler: () => boolean | void
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    return navigationStack.register(priority, () => handlerRef.current());
  }, [enabled, priority]);
}

/**
 * Initializes native Capacitor listeners for Android hardware/gesture Back + Predictive Back
 * and StatusBar styling. Safe no-op on regular web browsers.
 */
export function initCapacitorNativeBridge(): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  StatusBar.setStyle({ style: Style.Light }).catch(() => {});

  // Toggle Capacitor's OnBackPressedCallback dynamically so Android 14+ Predictive Back
  // animates straight back to the launcher when the user is at the app root, and delegates
  // to our in-app navigationStack whenever a modal, flow, or secondary tab can go back.
  const unsubscribeStack = navigationStack.subscribe((hasEntries) => {
    CapApp.toggleBackButtonHandler({ enabled: hasEntries }).catch(() => {});
  });

  let removeListener: (() => void) | undefined;
  let cancelled = false;

  CapApp.addListener('backButton', () => {
    const handled = navigationStack.handleBack();
    if (!handled) {
      CapApp.minimizeApp().catch(() => {});
    }
  }).then((handle) => {
    if (cancelled) {
      handle.remove();
    } else {
      removeListener = () => handle.remove();
    }
  });

  return () => {
    cancelled = true;
    unsubscribeStack();
    removeListener?.();
  };
}
