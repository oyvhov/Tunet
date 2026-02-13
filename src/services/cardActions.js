/**
 * Handles adding selected entities/cards to the dashboard configuration.
 * Extracted from App.jsx to keep the main component lean.
 *
 * @param {Object} ctx - Context object with all required state & setters
 */
export const handleAddSelected = (ctx) => {
  const {
    pagesConfig,
    persistConfig,
    addCardTargetPage,
    addCardType,
    selectedEntities,
    selectedWeatherId,
    selectedTempId,
    selectedAndroidTVMediaId,
    selectedAndroidTVRemoteId,
    selectedCostTodayId,
    selectedCostMonthId,
    selectedNordpoolId,
    nordpoolDecimals,
    cardSettings,
    persistCardSettings,
    getCardSettingsKey,
    setSelectedEntities,
    setShowAddCardModal,
    setSelectedWeatherId,
    setSelectedTempId,
    setSelectedAndroidTVMediaId,
    setSelectedAndroidTVRemoteId,
    setSelectedCostTodayId,
    setSelectedCostMonthId,
    setCostSelectionTarget,
    setSelectedNordpoolId,
    setNordpoolDecimals,
    saveCardSetting: _saveCardSetting,
    setShowEditCardModal,
    setEditCardSettingsKey
  } = ctx;

  const newConfig = { ...pagesConfig };

  if (addCardTargetPage === 'header') {
    newConfig.header = [...(newConfig.header || []), ...selectedEntities];
    persistConfig(newConfig);
    setSelectedEntities([]);
    setShowAddCardModal(false);
    return;
  }

  if (addCardType === 'weather') {
    if (!selectedWeatherId) return;
    const cardId = `weather_temp_${Date.now()}`;
    newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
    persistConfig(newConfig);

    const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
    const newSettings = { ...cardSettings, [settingsKey]: { ...(cardSettings[settingsKey] || {}), weatherId: selectedWeatherId, tempId: selectedTempId || null } };
    persistCardSettings(newSettings);

    setSelectedWeatherId(null);
    setSelectedTempId(null);
    setShowAddCardModal(false);
    return;
  }

  if (addCardType === 'calendar') {
    const cardId = selectedEntities.length === 1 && selectedEntities[0].startsWith('calendar_card_')
      ? selectedEntities[0]
      : `calendar_card_${Date.now()}`;

    newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
    persistConfig(newConfig);
    setShowAddCardModal(false);
    return;
  }

  if (addCardType === 'todo') {
    const cardId = `todo_card_${Date.now()}`;
    newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
    persistConfig(newConfig);

    const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
    const newSettings = {
      ...cardSettings,
      [settingsKey]: { ...(cardSettings[settingsKey] || {}), size: 'large' }
    };
    persistCardSettings(newSettings);

    setShowAddCardModal(false);
    setShowEditCardModal(cardId);
    setEditCardSettingsKey(settingsKey);
    return;
  }

  if (addCardType === 'media') {
    if (selectedEntities.length === 0) return;
    const cardId = `media_group_${Date.now()}`;
    newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
    persistConfig(newConfig);

    const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
    const newSettings = { ...cardSettings, [settingsKey]: { ...(cardSettings[settingsKey] || {}), mediaIds: selectedEntities } };
    persistCardSettings(newSettings);

    setSelectedEntities([]);
    setShowAddCardModal(false);
    return;
  }

  if (addCardType === 'climate') {
    if (selectedEntities.length === 0) return;

    const newCardIds = [];
    const newSettings = { ...cardSettings };

    selectedEntities.forEach((entityId) => {
      const cardId = `climate_card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      newCardIds.push(cardId);
      const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
      newSettings[settingsKey] = { ...(newSettings[settingsKey] || {}), climateId: entityId };
    });

    newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), ...newCardIds];
    persistConfig(newConfig);
    persistCardSettings(newSettings);

    setSelectedEntities([]);
    setShowAddCardModal(false);
    return;
  }

  if (addCardType === 'androidtv') {
    if (!selectedAndroidTVMediaId) return;
    const cardId = `androidtv_card_${Date.now()}`;
    newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
    persistConfig(newConfig);

    const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
    const newSettings = {
      ...cardSettings,
      [settingsKey]: {
        ...(cardSettings[settingsKey] || {}),
        mediaPlayerId: selectedAndroidTVMediaId,
        remoteId: selectedAndroidTVRemoteId || null
      }
    };
    persistCardSettings(newSettings);

    setSelectedAndroidTVMediaId(null);
    setSelectedAndroidTVRemoteId(null);
    setShowAddCardModal(false);
    return;
  }

  if (addCardType === 'cost') {
    if (!selectedCostTodayId || !selectedCostMonthId) return;
    const cardId = `cost_card_${Date.now()}`;
    newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
    persistConfig(newConfig);

    const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
    const newSettings = {
      ...cardSettings,
      [settingsKey]: {
        ...(cardSettings[settingsKey] || {}),
        todayId: selectedCostTodayId,
        monthId: selectedCostMonthId
      }
    };
    persistCardSettings(newSettings);

    setSelectedCostTodayId(null);
    setSelectedCostMonthId(null);
    setCostSelectionTarget('today');
    setShowAddCardModal(false);
    return;
  }

  if (addCardType === 'nordpool') {
    if (!selectedNordpoolId) return;
    const cardId = `nordpool_card_${Date.now()}`;
    newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
    persistConfig(newConfig);

    const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
    const newSettings = {
      ...cardSettings,
      [settingsKey]: {
        ...(cardSettings[settingsKey] || {}),
        nordpoolId: selectedNordpoolId,
        decimals: nordpoolDecimals
      }
    };
    persistCardSettings(newSettings);

    setSelectedNordpoolId(null);
    setNordpoolDecimals(2);
    setShowAddCardModal(false);
    return;
  }

  if (addCardType === 'car') {
    const cardId = `car_card_${Date.now()}`;
    newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
    persistConfig(newConfig);

    const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
    const newSettings = {
      ...cardSettings,
      [settingsKey]: { ...(cardSettings[settingsKey] || {}), type: 'car', size: 'large' }
    };
    persistCardSettings(newSettings);

    setShowAddCardModal(false);
    setShowEditCardModal(cardId);
    setEditCardSettingsKey(settingsKey);
    return;
  }

  if (addCardType === 'entity' || addCardType === 'toggle' || addCardType === 'sensor') {
    const newSettings = { ...cardSettings };
    selectedEntities.forEach((id) => {
      const settingsKey = getCardSettingsKey(id, addCardTargetPage);
      newSettings[settingsKey] = { ...(newSettings[settingsKey] || {}), type: addCardType, size: newSettings[settingsKey]?.size || 'large' };
    });
    persistCardSettings(newSettings);
  }

  newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), ...selectedEntities];
  persistConfig(newConfig);
  setSelectedEntities([]);
  setShowAddCardModal(false);
};
