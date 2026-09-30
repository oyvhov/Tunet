import { useMemo } from 'react';
import { supportsMobileCardWidth } from '../utils/gridLayout';

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
    const isEntityCard = editId.startsWith('entity_card_');
    const isEditSensor =
      isEntityCard ||
      (rawEditSettings?.type === 'sensor' &&
        !/^(light[_.]|lock\.|vacuum\.|lawn_mower\.|fan\.|media_player\.)/.test(editId));
    const editEntityId = isEditSensor ? rawEditSettings.entityId || editId : editId;
    const editEntity = entities[editEntityId] || null;

    const isEditLight = !!editId && (editId.startsWith('light_') || editId.startsWith('light.'));
    const isEditMedia =
      !!editId &&
      (editId.startsWith('media_player.') ||
        editId === 'media_player' ||
        editId.startsWith('media_group_') ||
        editId.startsWith('sonos_group_'));
    const isEditCalendar = !!editId && editId.startsWith('calendar_card_');
    const isEditTodo = !!editId && editId.startsWith('todo_card_');
    const isEditCost = !!editId && editId.startsWith('cost_card_');
    const isEditAndroidTV = !!editId && editId.startsWith('androidtv_card_');
    const isEditAppleTV = !!editId && editId.startsWith('appletv_card_');
    const isEditVacuum = !!editId && editId.startsWith('vacuum.');
    const isEditAutomation = !!editId && editId.startsWith('automation.');
    const isEditCar = !!editId && (editId === 'car' || editId.startsWith('car_card_'));
    const isEditRoom = !!editId && editId.startsWith('room_card_');
    const isEditLock = !!editId && (editId.startsWith('lock_card_') || editId.startsWith('lock.'));
    const isEditCover = !!editId && editId.startsWith('cover_card_');
    const isEditAlarm = !!editId && editId.startsWith('alarm_card_');
    const isEditSpacer = !!editId && editId.startsWith('spacer_card_');
    const isEditCamera = !!editId && editId.startsWith('camera_card_');
    const isEditFan = !!editId && (editId.startsWith('fan.') || editId.startsWith('fan_card_'));
    const isEditClimate = !!editId && editId.startsWith('climate_card_');

    const editSettings = isEditCar ? resolveCarSettings(editId, rawEditSettings) : rawEditSettings;
    const nameFallbackEntityId = isEditSensor
      ? editEntityId
      : isEditCover
        ? editSettings?.coverId || null
        : isEditClimate
          ? editSettings?.climateId || null
          : isEditAppleTV || isEditAndroidTV
            ? editSettings?.mediaPlayerId || null
            : isEditLock
              ? editSettings?.lockId || editId
              : editId;
    const isEditGenericType =
      (!!editSettings?.type &&
        (editSettings.type === 'entity' ||
          editSettings.type === 'toggle' ||
          editSettings.type === 'sensor')) ||
      isEditVacuum ||
      isEditAutomation ||
      isEditCar ||
      isEditAndroidTV ||
      isEditAppleTV ||
      isEditRoom ||
      isEditLock ||
      isEditFan;
    const isEditWeatherTemp = !!editId && editId.startsWith('weather_temp_');
    const canEditMobileWidth = supportsMobileCardWidth(editId);

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
        isEditSensor ||
        isEditMedia ||
        isEditCalendar ||
        isEditTodo ||
        isEditRoom ||
        isEditLock ||
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
      isEditSensor ||
      (!!editEntity && !!editSettingsKey && editSettingsKey.startsWith('settings::'));

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
      isEditAppleTV,
      isEditVacuum,
      isEditCar,
      isEditRoom,
      isEditLock,
      isEditSpacer,
      isEditCamera,
      isEditSensor,
      isEditWeatherTemp,
      canEditMobileWidth,
      isEditFan,
      isEditClimate,
      isEditAlarm,
      nameFallbackEntityId,
      editSettingsKey,
      editSettings,
    };
  }, [showEditCardModal, editSettingsKey, cardSettings, entities, resolveCarSettings]);
}
