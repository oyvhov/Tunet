export type PersistentNotification = Record<string, unknown>;

export type PersistentNotificationWithId = PersistentNotification & { id: string };

interface PersistentNotificationUpdate {
  type: 'current' | 'added' | 'updated' | 'removed';
  notifications?: Record<string, PersistentNotification>;
}

type Unsubscribe = () => unknown;

// Structural subset of home-assistant-js-websocket's Connection that this module uses.
interface NotificationConnection {
  subscribeMessage(
    callback: (update: PersistentNotificationUpdate) => void,
    message: { type: string }
  ): Promise<Unsubscribe | undefined> | Unsubscribe | undefined;
}

export function subscribePersistentNotifications(
  conn: NotificationConnection | null | undefined,
  onChange: (notifications: PersistentNotificationWithId[]) => void,
  onError?: (error: unknown) => void
): () => void {
  if (!conn) return () => {};
  let disposed = false;
  let unsubscribe: Unsubscribe | undefined;
  let notifications: Record<string, PersistentNotification> = {};

  const subscription = conn.subscribeMessage(
    (update) => {
      if (disposed) return;
      if (update.type === 'current') notifications = {};
      if (update.type === 'removed') {
        for (const id of Object.keys(update.notifications || {})) delete notifications[id];
      } else {
        Object.assign(notifications, update.notifications || {});
      }
      onChange(
        Object.entries(notifications).map(([id, notification]) => ({ ...notification, id }))
      );
    },
    { type: 'persistent_notification/subscribe' }
  );

  Promise.resolve(subscription)
    .then((stop) => {
      if (disposed) stop?.();
      else unsubscribe = stop;
    })
    .catch((error) => {
      if (!disposed) onError?.(error);
    });

  return () => {
    disposed = true;
    unsubscribe?.();
  };
}
