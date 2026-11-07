import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  block?: boolean;
  icon?: ReactNode;
}

/** The one button used in popups: primary, secondary, destructive or ghost. */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    block = false,
    icon,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref
) {
  const classes = [
    'ui-button',
    `ui-button--${variant}`,
    size === 'sm' ? 'ui-button--sm' : '',
    block ? 'ui-button--block' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button ref={ref} type={type} className={classes} {...rest}>
      {icon}
      {children}
    </button>
  );
});

export default Button;
