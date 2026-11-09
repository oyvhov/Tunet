import type { ComponentProps } from 'react';
import { useConfig } from '../../contexts';
import PinLockModal from './PinLockModal';

type SettingsPinLockModalProps = Omit<ComponentProps<typeof PinLockModal>, 'onForgot'>;

/** The prompt in front of the settings menus, with a way out for a forgotten PIN. */
export default function SettingsPinLockModal(props: SettingsPinLockModalProps) {
  const { disableSettingsLock } = useConfig();
  return <PinLockModal {...props} onForgot={disableSettingsLock} />;
}
