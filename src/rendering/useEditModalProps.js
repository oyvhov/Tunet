import { useMemo } from 'react';

export function useEditModalProps({
  showEditCardModal,
  editCardSettingsKey,
  getCardSettingsKey,
  cardSettings,
  entities,
  resolveCarSettings,
}) {
  const editSettingsKey = showEditCardModal
    ? editCardSettingsKey || getCardSettingsKey(showEditCardModal)
    : null;

  return useMemo(() => {
    if (!showEditCardModal) return {};

    const rawEditSettings = editSettingsKey
      ? cardSettings[editSettingsKey] || cardSettings[showEditCardModal] || {}
      : {};
    const editId = showEditCardModal;
    const editEntity = editId ? entities[editId] : null;

    const isEditLight = !!editId && (editId.startsWith('light_') || editId.startsWith('light.'));
    const isEditMedia =
      !!editId &&
      (editId.startsWith('media_player.') ||
        editId === 'media_player' ||
        editId.startsWith('media_group_'));
    const isEditCalendar = !!editId && editId.startsWith('calendar_card_');
    const isEditTodo = !!editId && editId.startsWith('todo_card_');
    const isEditCost = !!editId && editId.startsWith('cost_card_');
    const isEditAndroidTV = !!editId && editId.startsWith('androidtv_card_');
    const isEditVacuum = !!editId && editId.startsWith('vacuum.');
    const isEditAutomation = !!editId && editId.startsWith('automation.');
    const isEditCar = !!editId && (editId === 'car' || editId.startsWith('car_card_'));
    const isEditRoom = !!editId && editId.startsWith('room_card_');
    const isEditCover = !!editId && editId.startsWith('cover_card_');
    const isEditAlarm = !!editId && editId.startsWith('alarm_card_');
    const isEditSpacer = !!editId && editId.startsWith('spacer_card_');
    const isEditCamera = !!editId && editId.startsWith('camera_card_');
    const isEditFan = !!editId && (editId.startsWith('fan.') || editId.startsWith('fan_card_'));

    const editSettings = isEditCar ? resolveCarSettings(editId, rawEditSettings) : rawEditSettings;
    const isEditGenericType =
      (!!editSettings?.type &&
        (editSettings.type === 'entity' ||
          editSettings.type === 'toggle' ||
          editSettings.type === 'sensor')) ||
      isEditVacuum ||
      isEditAutomation ||
      isEditCar ||
      isEditAndroidTV ||
      isEditRoom ||
      isEditFan;
    const isEditSensor = !!editSettings?.type && editSettings.type === 'sensor';
    const isEditWeatherTemp = !!editId && editId.startsWith('weather_temp_');

    const canEditName =
      !!editId &&
      !isEditWeatherTemp &&
      !isEditSpacer &&
      editId !== 'media_player' &&
      editId !== 'sonos';

    const isEditNordpool = !!editId && editId.startsWith('nordpool_card_');
    const canEditIcon =
      !!editId &&
      (isEditLight ||
        isEditCalendar ||
        isEditTodo ||
        isEditRoom ||
        isEditCover ||
        isEditAlarm ||
        isEditNordpool ||
        editId.startsWith('automation.') ||
        editId.startsWith('vacuum.') ||
        editId.startsWith('climate_card_') ||
        editId.startsWith('cost_card_') ||
        editId.startsWith('camera_card_') ||
        (!!editEntity && !isEditMedia) ||
        editId === 'car' ||
        editId.startsWith('car_card_') ||
        isEditFan);

    const canEditStatus =
      !!editEntity && !!editSettingsKey && editSettingsKey.startsWith('settings::');

    return {
      canEditName,
      canEditIcon,
      canEditStatus,
      isEditLight,
      isEditMedia,
      isEditCalendar,
      isEditTodo,
      isEditCost,
      isEditNordpool,
      isEditGenericType,
      isEditAndroidTV,
      isEditCar,
      isEditRoom,
      isEditSpacer,
      isEditCamera,
      isEditSensor,
      isEditWeatherTemp,
      isEditFan,
      isEditAlarm,
      editSettingsKey,
      editSettings,
    };
  }, [showEditCardModal, editSettingsKey, cardSettings, entities, resolveCarSettings]);
}
