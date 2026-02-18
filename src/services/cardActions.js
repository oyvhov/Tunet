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
    selectedSpacerVariant,
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

  const selectedEntitiesForType = () => {
    switch (addCardType) {
      case 'light':
        return selectedEntities.filter((id) => id.startsWith('light.'));
      case 'vacuum':
        return selectedEntities.filter((id) => id.startsWith('vacuum.'));
      case 'climate':
        return selectedEntities.filter((id) => id.startsWith('climate.'));
      case 'camera':
        return selectedEntities.filter((id) => id.startsWith('camera.'));
      case 'cover':
        return selectedEntities.filter((id) => id.startsWith('cover.'));
      case 'media':
        return selectedEntities.filter((id) => id.startsWith('media_player.'));
      default:
        return selectedEntities;
    }
  };

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
      const calendars = selectedEntities.filter((id) => id.startsWith('calendar.'));
      if (calendars.length === 0) return;
      const cardId = `calendar_card_${Date.now()}`;
      commitSingleCard(cardId, { calendars });
      setSelectedEntities([]);
      return;
    }

    case 'todo': {
      const cardId = `todo_card_${Date.now()}`;
      commitSingleCard(cardId, { size: 'large' }, { openEdit: true });
      return;
    }

    case 'media': {
      const mediaEntities = selectedEntitiesForType();
      if (mediaEntities.length === 0) return;
      const cardId = `media_group_${Date.now()}`;
      commitSingleCard(cardId, { mediaIds: mediaEntities });
      setSelectedEntities([]);
      return;
    }

    case 'climate': {
      const climateEntities = selectedEntitiesForType();
      if (climateEntities.length === 0) return;
      const newSettings = { ...cardSettings };
      const newCardIds = climateEntities.map((entityId) => {
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

    case 'camera': {
      const cameraEntities = selectedEntitiesForType();
      if (cameraEntities.length === 0) return;
      const newSettings = { ...cardSettings };
      const newCardIds = cameraEntities.map((entityId) => {
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

    case 'cover': {
      const coverEntities = selectedEntitiesForType();
      if (coverEntities.length === 0) return;
      const newSettings = { ...cardSettings };
      const newCardIds = coverEntities.map((entityId) => {
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

    case 'spacer': {
      const cardId = `spacer_card_${Date.now()}`;
      const variant = selectedSpacerVariant || 'spacer';
      const initialSettings = {
        variant,
        colSpan: 'full',
        heightPx: 40,
        headingAlign: 'center',
      };
      commitSingleCard(cardId, initialSettings);
      return;
    }

    // entity / toggle / sensor — default path for plain HA entities
    default: {
      const validSelectedEntities = selectedEntitiesForType();

      if (addCardType === 'entity' || addCardType === 'toggle' || addCardType === 'sensor') {
        const newSettings = { ...cardSettings };
        validSelectedEntities.forEach((id) => {
          const settingsKey = getCardSettingsKey(id, addCardTargetPage);
          newSettings[settingsKey] = {
            ...(newSettings[settingsKey] || {}),
            type: addCardType,
            size: newSettings[settingsKey]?.size || 'large',
          };
        });
        persistCardSettings(newSettings);
      }

      commitCards(validSelectedEntities);
      setSelectedEntities([]);
    }
  }
};
