export function buildRoomCardsPayload({
  areas,
  areaEntitiesById,
  pagesConfig,
  addCardTargetPage,
  cardSettings,
  getCardSettingsKey,
  timestamp,
}) {
  if (!Array.isArray(areas) || areas.length === 0) {
    return null;
  }

  const resolvedTimestamp = Number.isFinite(timestamp) ? timestamp : Date.now();
  const newConfig = { ...pagesConfig };
  const targetCards = [...(newConfig[addCardTargetPage] || [])];
  const newSettings = { ...cardSettings };
  const customNames = [];

  let firstCardId = null;
  let firstSettingsKey = null;

  areas.forEach((area, index) => {
    const cardId = `room_card_${resolvedTimestamp}_${index}`;
    const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
    const areaEntityIds = areaEntitiesById?.[area.area_id] || [];
    const areaName = area.name || area.area_id;

    targetCards.push(cardId);
    newSettings[settingsKey] = {
      areaId: area.area_id,
      areaName,
      areaIcon: area.icon || null,
      icon: area.icon || null,
      entityIds: areaEntityIds,
      includedEntityIds: [],
      excludedEntityIds: [],
      showLights: true,
      showTemp: true,
      showMotion: true,
      showHumidity: false,
      showClimate: false,
      showLightChip: true,
      showMediaChip: true,
      showActiveChip: true,
      showVacuumChip: true,
      showOccupiedIndicator: true,
      showIconWatermark: true,
      showPopupClimate: true,
      showPopupLights: true,
      showPopupTempOverview: true,
      showPopupMedia: true,
      showPopupVacuum: true,
      size: 'large',
    };

    customNames.push({ cardId, name: areaName });

    if (index === 0) {
      firstCardId = cardId;
      firstSettingsKey = settingsKey;
    }
  });

  newConfig[addCardTargetPage] = targetCards;

  return {
    newConfig,
    newSettings,
    customNames,
    firstCardId,
    firstSettingsKey,
  };
}
