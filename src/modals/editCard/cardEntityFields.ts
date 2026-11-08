export type CardEntityField = {
  settingKey: string;
  labelKey: string;
  domains: string[];
  required: boolean;
};

type CardSettings = Record<string, unknown>;

const entityField = (settingKey: string, domain: string): CardEntityField => ({
  settingKey,
  labelKey: 'editCard.entityRequired',
  domains: [domain],
  required: true,
});

const tvFields = (): CardEntityField[] => [
  {
    settingKey: 'mediaPlayerId',
    labelKey: 'addCard.mediaPlayerRequired',
    domains: ['media_player'],
    required: true,
  },
  {
    settingKey: 'remoteId',
    labelKey: 'addCard.remoteOptional',
    domains: ['remote'],
    required: false,
  },
];

/** Entity settings a card can swap in place; each key is the one its renderer reads. */
export function getCardEntityFields(cardId: string, settings: CardSettings): CardEntityField[] {
  if (cardId.startsWith('cover_card_')) return [entityField('coverId', 'cover')];
  if (cardId.startsWith('climate_card_')) return [entityField('climateId', 'climate')];
  if (cardId.startsWith('alarm_card_')) return [entityField('alarmId', 'alarm_control_panel')];
  if (cardId.startsWith('camera_card_')) return [entityField('cameraId', 'camera')];
  if (cardId.startsWith('lock_card_') || cardId.startsWith('lock.')) {
    return [entityField(settings.entityId ? 'entityId' : 'lockId', 'lock')];
  }
  if (cardId.startsWith('weather_temp_')) {
    return [
      entityField('weatherId', 'weather'),
      {
        settingKey: 'tempId',
        labelKey: 'addCard.tempSensorOptional',
        domains: ['sensor'],
        required: false,
      },
    ];
  }
  if (cardId.startsWith('nordpool_card_')) {
    return [
      {
        settingKey: 'nordpoolId',
        labelKey: 'addCard.nordpoolSensorRequired',
        domains: ['sensor'],
        required: true,
      },
    ];
  }
  if (cardId.startsWith('androidtv_card_') || cardId.startsWith('appletv_card_')) return tvFields();
  if (cardId.startsWith('light_') || cardId.startsWith('light.')) {
    return [entityField('entityId', 'light')];
  }
  if (cardId.startsWith('fan.') || cardId.startsWith('fan_card_')) {
    return [entityField('entityId', 'fan')];
  }
  if (cardId.startsWith('vacuum.')) return [entityField('entityId', 'vacuum')];
  if (cardId.startsWith('lawn_mower.')) return [entityField('entityId', 'lawn_mower')];
  if (cardId.startsWith('media_player.')) return [entityField('entityId', 'media_player')];
  return [];
}

export function getCardEntityValue(
  field: CardEntityField,
  cardId: string,
  settings: CardSettings
): string | null {
  const saved = settings[field.settingKey];
  if (typeof saved === 'string' && saved) return saved;
  const usesCardId = field.settingKey === 'entityId' || field.settingKey === 'lockId';
  return usesCardId && cardId.includes('.') ? cardId : null;
}
