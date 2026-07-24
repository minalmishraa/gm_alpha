'use client';

// ── Multi-Tab Synchronous Live Event Channel ──
const SYNC_CHANNEL_NAME = 'seriras_live_sync_channel';

export type SyncEventType =
  | 'EMERGENCY_UPDATED'
  | 'EMERGENCY_STARTED'
  | 'EMERGENCY_ENDED'
  | 'GPS_TICK'
  | 'DRIVER_LOCATION_UPDATED';

export interface SyncPayload {
  type: SyncEventType;
  payload?: any;
  timestamp: number;
}

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!channel && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
  return channel;
}

/** Broadcast event to all other open tabs in real-time */
export function broadcastLiveSync(type: SyncEventType, payload?: any) {
  const syncPayload: SyncPayload = {
    type,
    payload,
    timestamp: Date.now(),
  };

  // 1. Broadcast via BroadcastChannel
  const ch = getChannel();
  if (ch) {
    try {
      ch.postMessage(syncPayload);
    } catch {
      // Fallback
    }
  }

  // 2. Fallback via LocalStorage event for legacy tab sync
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('seriras_last_sync_event', JSON.stringify(syncPayload));
    } catch {
      // Ignore storage errors
    }
  }
}

/** Listen for real-time events broadcast from any tab */
export function subscribeLiveSync(callback: (event: SyncPayload) => void) {
  if (typeof window === 'undefined') return () => {};

  const handlers: Array<() => void> = [];

  // Listen on BroadcastChannel
  const ch = getChannel();
  if (ch) {
    const handleMessage = (msgEvent: MessageEvent<SyncPayload>) => {
      if (msgEvent.data && msgEvent.data.type) {
        callback(msgEvent.data);
      }
    };
    ch.addEventListener('message', handleMessage);
    handlers.push(() => ch.removeEventListener('message', handleMessage));
  }

  // Listen on window storage event
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'seriras_last_sync_event' && e.newValue) {
      try {
        const data: SyncPayload = JSON.parse(e.newValue);
        callback(data);
      } catch {
        // Ignore JSON errors
      }
    }
  };
  window.addEventListener('storage', handleStorage);
  handlers.push(() => window.removeEventListener('storage', handleStorage));

  return () => {
    handlers.forEach((fn) => fn());
  };
}
