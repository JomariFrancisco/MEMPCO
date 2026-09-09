'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  isPortalSessionActive,
  PORTAL_SESSION_IDLE_TIMEOUT_MS,
  signOutPortal,
  touchPortalSession,
} from '@/lib/auth/portalAuth';

const PORTAL_ROUTE_PREFIXES = [
  '/employee-dashboard',
  '/admin-dashboard',
  '/marketing-admin',
  '/hr-admin',
];
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
const ACTIVITY_EVENT_THROTTLE_MS = 1000;
const SESSION_HEARTBEAT_MS = 30_000;
const SESSION_VERIFY_MS = 30_000;

const isPortalRoute = (pathname = '') =>
  PORTAL_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

export default function PortalSessionGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isPortalRoute(pathname)) return undefined;

    let cancelled = false;
    let isEndingSession = false;
    let hasVerifiedSession = false;
    let lastActivityAt = 0;
    let lastHeartbeatAt = 0;
    let idleTimer = null;
    let heartbeatTimer = null;

    const clearTimers = () => {
      if (idleTimer) window.clearTimeout(idleTimer);
      if (heartbeatTimer) window.clearTimeout(heartbeatTimer);

      idleTimer = null;
      heartbeatTimer = null;
    };

    const endSession = async (reason) => {
      if (cancelled || isEndingSession) return;

      isEndingSession = true;
      clearTimers();

      await signOutPortal().catch(() => {});

      if (!cancelled) {
        window.location.replace(`/LogIn?reason=${encodeURIComponent(reason)}`);
      }
    };

    const scheduleIdleSignOut = () => {
      if (idleTimer) window.clearTimeout(idleTimer);

      const remainingMs = Math.max(
        0,
        PORTAL_SESSION_IDLE_TIMEOUT_MS - (Date.now() - lastActivityAt)
      );

      idleTimer = window.setTimeout(() => {
        void endSession('inactive');
      }, remainingMs);
    };

    const refreshActivity = async () => {
      heartbeatTimer = null;
      lastHeartbeatAt = Date.now();

      try {
        const isActive = await touchPortalSession();

        if (!isActive) {
          await endSession('session-ended');
        }
      } catch (error) {
        console.warn('[Portal Session Refresh]', error);
      }
    };

    const scheduleActivityRefresh = () => {
      if (heartbeatTimer || isEndingSession) return;

      const delay = Math.max(0, SESSION_HEARTBEAT_MS - (Date.now() - lastHeartbeatAt));

      heartbeatTimer = window.setTimeout(() => {
        void refreshActivity();
      }, delay);
    };

    const recordActivity = () => {
      if (cancelled || isEndingSession) return;

      const now = Date.now();

      if (now - lastActivityAt < ACTIVITY_EVENT_THROTTLE_MS) return;

      lastActivityAt = now;
      scheduleIdleSignOut();
      scheduleActivityRefresh();
    };

    const verifySession = async () => {
      try {
        const isActive = await isPortalSessionActive();

        if (!isActive) {
          await endSession('session-ended');
          return false;
        }
      } catch (error) {
        console.warn('[Portal Session Verification]', error);
      }

      return true;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (!hasVerifiedSession) return;

      if (Date.now() - lastActivityAt >= PORTAL_SESSION_IDLE_TIMEOUT_MS) {
        void endSession('inactive');
        return;
      }

      recordActivity();
      void verifySession();
    };

    const initialize = async () => {
      const isActive = await verifySession();
      hasVerifiedSession = true;

      if (isActive && !cancelled) {
        recordActivity();
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    void initialize();

    const verificationTimer = window.setInterval(() => {
      void verifySession();
    }, SESSION_VERIFY_MS);

    return () => {
      cancelled = true;
      clearTimers();
      window.clearInterval(verificationTimer);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]);

  return null;
}
