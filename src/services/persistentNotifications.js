export function subscribePersistentNotifications(conn, onChange, onError) {
  if (!conn) return () => {};
  let disposed = false;
  let unsubscribe;
  let notifications = {};

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
