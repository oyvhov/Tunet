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
    setShowEditCardModal,
    setEditCardSettingsKey,
  } = ctx;

  const newConfig = { ...pagesConfig };

  // -- Helpers ---------------------------------------------------------------

  /** Append card(s) to page, persist config, and close the add-card modal. */
  const commitCards = (cardIds) => {
    newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), ...cardIds];
    persistConfig(newConfig);
    setShowAddCardModal(false);
  };

  /** Save card settings for a single card and commit it to the page. */
  const commitSingleCard = (cardId, settingsPayload, { openEdit = false } = {}) => {
    const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
    const newSettings = {
      ...cardSettings,
      [settingsKey]: { ...(cardSettings[settingsKey] || {}), ...settingsPayload },
    };
    persistCardSettings(newSettings);
    commitCards([cardId]);
    if (openEdit) {
      setShowEditCardModal(cardId);
      setEditCardSettingsKey(settingsKey);
    }
  };

  // -- Header (special case: plain entities) ---------------------------------

  if (addCardTargetPage === 'header') {
    newConfig.header = [...(newConfig.header || []), ...selectedEntities];
    persistConfig(newConfig);
    setSelectedEntities([]);
    setShowAddCardModal(false);
    return;
  }

  // -- Card-type handlers ----------------------------------------------------

  switch (addCardType) {
    case 'weather': {
      if (!selectedWeatherId) return;
      const cardId = `weather_temp_${Date.now()}`;
      commitSingleCard(cardId, { weatherId: selectedWeatherId, tempId: selectedTempId || null });
      setSelectedWeatherId(null);
      setSelectedTempId(null);
      return;
    }

    case 'calendar': {
      const cardId = selectedEntities.length === 1 && selectedEntities[0].startsWith('calendar_card_')
        ? selectedEntities[0]
        : `calendar_card_${Date.now()}`;
      commitCards([cardId]);
      return;
    }

    case 'todo': {
      const cardId = `todo_card_${Date.now()}`;
      commitSingleCard(cardId, { size: 'large' }, { openEdit: true });
      return;
    }

    case 'media': {
      if (selectedEntities.length === 0) return;
      const cardId = `media_group_${Date.now()}`;
      commitSingleCard(cardId, { mediaIds: selectedEntities });
      setSelectedEntities([]);
      return;
    }

    case 'climate': {
      if (selectedEntities.length === 0) return;
      const newSettings = { ...cardSettings };
      const newCardIds = selectedEntities.map((entityId) => {
        const cardId = `climate_card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
        newSettings[settingsKey] = { ...(newSettings[settingsKey] || {}), climateId: entityId };
        return cardId;
      });
      persistCardSettings(newSettings);
      commitCards(newCardIds);
      setSelectedEntities([]);
      return;
    }

    case 'cover': {
      if (selectedEntities.length === 0) return;
      const newSettings = { ...cardSettings };
      const newCardIds = selectedEntities.map((entityId) => {
        const cardId = `cover_card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
        newSettings[settingsKey] = { ...(newSettings[settingsKey] || {}), coverId: entityId };
        return cardId;
      });
      persistCardSettings(newSettings);
      commitCards(newCardIds);
      setSelectedEntities([]);
      return;
    }

    case 'camera': {
      if (selectedEntities.length === 0) return;
      const newSettings = { ...cardSettings };
      const newCardIds = selectedEntities.map((entityId) => {
        const cardId = `camera_card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
        newSettings[settingsKey] = { ...(newSettings[settingsKey] || {}), cameraId: entityId };
        return cardId;
      });
      persistCardSettings(newSettings);
      commitCards(newCardIds);
      setSelectedEntities([]);
      return;
    }

    case 'androidtv': {
      if (!selectedAndroidTVMediaId) return;
      const cardId = `androidtv_card_${Date.now()}`;
      commitSingleCard(cardId, {
        mediaPlayerId: selectedAndroidTVMediaId,
        remoteId: selectedAndroidTVRemoteId || null,
      });
      setSelectedAndroidTVMediaId(null);
      setSelectedAndroidTVRemoteId(null);
      return;
    }

    case 'cost': {
      if (!selectedCostTodayId || !selectedCostMonthId) return;
      const cardId = `cost_card_${Date.now()}`;
      commitSingleCard(cardId, { todayId: selectedCostTodayId, monthId: selectedCostMonthId });
      setSelectedCostTodayId(null);
      setSelectedCostMonthId(null);
      setCostSelectionTarget('today');
      return;
    }

    case 'nordpool': {
      if (!selectedNordpoolId) return;
      const cardId = `nordpool_card_${Date.now()}`;
      commitSingleCard(cardId, { nordpoolId: selectedNordpoolId, decimals: nordpoolDecimals });
      setSelectedNordpoolId(null);
      setNordpoolDecimals(2);
      return;
    }

    case 'car': {
      const cardId = `car_card_${Date.now()}`;
      commitSingleCard(cardId, { type: 'car', size: 'large' }, { openEdit: true });
      return;
    }

    // entity / toggle / sensor — default path for plain HA entities
    default: {
      if (addCardType === 'entity' || addCardType === 'toggle' || addCardType === 'sensor') {
        const newSettings = { ...cardSettings };
        selectedEntities.forEach((id) => {
          const settingsKey = getCardSettingsKey(id, addCardTargetPage);
          newSettings[settingsKey] = {
            ...(newSettings[settingsKey] || {}),
            type: addCardType,
            size: newSettings[settingsKey]?.size || 'large',
          };
        });
        persistCardSettings(newSettings);
      }

      commitCards(selectedEntities);
      setSelectedEntities([]);
    }
  }
};
