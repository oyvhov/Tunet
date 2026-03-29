import { useToast } from '../../contexts/ToastContext';
import { X } from '../../icons';

const TYPE_STYLES = {
  error: {
    bg: 'var(--status-error-bg)',
    border: 'var(--status-error-border)',
    text: 'var(--status-error-fg)',
  },
  success: {
    bg: 'var(--status-success-bg)',
    border: 'var(--status-success-border)',
    text: 'var(--status-success-fg)',
  },
  info: {
    bg: 'var(--status-info-bg)',
    border: 'var(--status-info-border)',
    text: 'var(--status-info-fg)',
  },
};

export default function ToastContainer() {
  const { toasts } = useToast();
  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((toast) => {
        const style = TYPE_STYLES[toast.type] || TYPE_STYLES.error;
        return (
          <div
            key={toast.id}
            role="alert"
            className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-md popup-anim"
            style={{
              background: style.bg,
              border: `1px solid ${style.border}`,
              color: style.text,
            }}
          >
            <span className="flex-1">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
