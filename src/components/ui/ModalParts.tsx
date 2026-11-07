import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { X } from '../../icons';
import { useModalShell } from './AccessibleModalShell';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export type StatusTone = 'neutral' | 'on' | 'accent' | 'warn' | 'error';

interface StatusChipProps {
  label: ReactNode;
  tone?: StatusTone;
  detail?: ReactNode;
  dot?: boolean;
  className?: string;
  style?: CSSProperties;
  'data-testid'?: string;
}

/** Status shown under a popup title: a dot, a short state and an optional detail. */
export function StatusChip({
  label,
  tone = 'neutral',
  detail,
  dot = true,
  className,
  style,
  ...rest
}: StatusChipProps) {
  return (
    <span className={cx('status-chip', `status-chip--${tone}`, className)} style={style} {...rest}>
      {dot && <span className="status-chip__dot" aria-hidden="true" />}
      <span>{label}</span>
      {detail != null && detail !== '' && (
        <>
          <span className="status-chip__sep" aria-hidden="true" />
          <span className="status-chip__detail">{detail}</span>
        </>
      )}
    </span>
  );
}

interface ModalCloseButtonProps {
  onClose?: () => void;
  label: string;
  className?: string;
}

/** Round 44 px close button. Uses the shell's animated close when inside one. */
export function ModalCloseButton({ onClose, label, className }: ModalCloseButtonProps) {
  const shell = useModalShell();
  const handleClick = () => {
    if (shell) shell.requestClose();
    else onClose?.();
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cx('modal-close', className)}
      aria-label={label}
    >
      <X className="h-4 w-4" />
    </button>
  );
}

interface ModalHeaderProps {
  title: ReactNode;
  closeLabel: string;
  onClose?: () => void;
  icon?: ReactNode;
  iconClassName?: string;
  iconStyle?: CSSProperties;
  iconTestId?: string;
  status?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  hideClose?: boolean;
  titleId?: string;
  className?: string;
}

/** Popup header: icon tile, title, status line, optional actions and the close button. */
export function ModalHeader({
  title,
  closeLabel,
  onClose,
  icon,
  iconClassName,
  iconStyle,
  iconTestId,
  status,
  subtitle,
  actions,
  hideClose = false,
  titleId,
  className,
}: ModalHeaderProps) {
  const shell = useModalShell();
  const resolvedTitleId = titleId || shell?.titleId;
  return (
    <div className={cx('modal-header', className)}>
      {icon && (
        <div
          className={cx('modal-icon-tile', iconClassName)}
          style={iconStyle}
          data-testid={iconTestId}
        >
          {icon}
        </div>
      )}
      <div className="modal-header__text">
        <h2 id={resolvedTitleId} className="modal-title">
          {title}
        </h2>
        {status}
        {subtitle && <p className="modal-subtitle">{subtitle}</p>}
      </div>
      {(actions || !hideClose) && (
        <div className="modal-header__actions">
          {actions}
          {!hideClose && <ModalCloseButton onClose={onClose} label={closeLabel} />}
        </div>
      )}
    </div>
  );
}

type DivProps = HTMLAttributes<HTMLDivElement>;

/** The scrolling part of a popup. Header and footer stay put. */
export function ModalBody({ className, ...rest }: DivProps) {
  return <div className={cx('modal-body custom-scrollbar', className)} {...rest} />;
}

/** Fixed bottom bar for Cancel/Save. */
export function ModalFooter({ className, ...rest }: DivProps) {
  return <div className={cx('modal-footer', className)} {...rest} />;
}

interface ModalSectionProps extends Omit<DivProps, 'title'> {
  label?: ReactNode;
  action?: ReactNode;
  labelId?: string;
}

/** A labelled group inside a popup body. */
export function ModalSection({
  label,
  action,
  labelId,
  className,
  children,
  ...rest
}: ModalSectionProps) {
  return (
    <section
      className={cx('modal-section', className)}
      aria-labelledby={label ? labelId : undefined}
      {...rest}
    >
      {(label || action) && (
        <div className="modal-section__head">
          {label && (
            <h3 id={labelId} className="modal-section-label">
              {label}
            </h3>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
