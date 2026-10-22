import { useEffect } from 'react';
import { useHomeAssistantMeta } from '../../contexts';
import { useOptionalToast } from '../../contexts/ToastContext';
import { subscribePersistentNotifications } from '../../services/persistentNotifications';

export default function PersistentNotificationBridge() {
  const { conn, connected } = useHomeAssistantMeta();
  const toast = useOptionalToast();
  const addToast = toast?.addToast;

  useEffect(() => {
    if (!conn || !connected || !addToast) return undefined;
    let shown = new Map();
    return subscribePersistentNotifications(
      conn,
      (notifications) => {
        const next = new Map();
        for (const notification of notifications) {
          if (!notification.message) continue;
          const message = notification.title
            ? `${notification.title}: ${notification.message}`
            : notification.message;
          next.set(notification.id, message);
          if (shown.get(notification.id) !== message) addToast(message, 'info');
        }
        shown = next;
      },
      (error) => console.warn('[HA] Notification subscription failed:', error)
    );
  }, [conn, connected, addToast]);

  return null;
}
