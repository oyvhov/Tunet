import { useState, useEffect } from 'react';
import { handleAddSelected } from '../services';

/** @typedef {import('../types/dashboard').UseAddCardDeps} UseAddCardDeps */
/** @typedef {import('../types/dashboard').UseAddCardResult} UseAddCardResult */

/**
 * Manages all "Add Card" dialog state, selection resets, type inference and submission.
 *
 * @param {UseAddCardDeps} deps
 * @returns {UseAddCardResult}
 */
export function useAddCard({
  showAddCardModal,
  activePage,
  isMediaPage,
  pagesConfig,
  persistConfig,
  cardSettings,
  persistCardSettings,
  getCardSettingsKey,
  saveCardSetting,
  setShowAddCardModal,
  setShowEditCardModal,
  setEditCardSettingsKey,
  t,
}) {
  // ── Selection state ────────────────────────────────────────────────────
  const [addCardTargetPage, setAddCardTargetPage] = useState('home');
  const [addCardType, setAddCardType] = useState('sensor');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [selectedWeatherId, setSelectedWeatherId] = useState(null);
  const [selectedTempId, setSelectedTempId] = useState(null);
  const [selectedAndroidTVMediaId, setSelectedAndroidTVMediaId] = useState(null);
  const [selectedAndroidTVRemoteId, setSelectedAndroidTVRemoteId] = useState(null);
  const [selectedCostTodayId, setSelectedCostTodayId] = useState(null);
  const [selectedCostMonthId, setSelectedCostMonthId] = useState(null);
  const [costSelectionTarget, setCostSelectionTarget] = useState('today');
  const [selectedNordpoolId, setSelectedNordpoolId] = useState(null);
  const [nordpoolDecimals, setNordpoolDecimals] = useState(2);
  const [selectedSpacerVariant, setSelectedSpacerVariant] = useState('divider');

  // ── Sync target page to active page ────────────────────────────────────
  useEffect(() => {
    if (showAddCardModal && addCardTargetPage !== 'header') {
      setAddCardTargetPage(activePage);
    }
  }, [showAddCardModal, activePage, addCardTargetPage]);

  // ── Reset search when modal closes ─────────────────────────────────────
  useEffect(() => {
    if (!showAddCardModal) {
      setSearchTerm('');
      // Reset target page so it doesn't stay stuck on 'header' or 'settings'
      setAddCardTargetPage(activePage);
    }
  }, [showAddCardModal, activePage]);

  // ── Reset selections when modal opens ──────────────────────────────────
  useEffect(() => {
    if (showAddCardModal) {
      setSelectedEntities([]);
      setSelectedWeatherId(null);
      setSelectedTempId(null);
      setSelectedCostTodayId(null);
      setSelectedCostMonthId(null);
      setCostSelectionTarget('today');
      setSelectedNordpoolId(null);
      setNordpoolDecimals(2);
      setSelectedSpacerVariant('divider');
    }
  }, [showAddCardModal]);

  // ── Infer card type from target page ───────────────────────────────────
  useEffect(() => {
    if (!showAddCardModal) return;
    if (isMediaPage(addCardTargetPage)) {
      setAddCardType('entity');
      return;
    }
    if (addCardTargetPage === 'header' || addCardTargetPage === 'settings') {
      setAddCardType('entity');
      return;
    }
    setAddCardType('sensor');
  }, [showAddCardModal, addCardTargetPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear stale selections when card type changes ──────────────────────
  useEffect(() => {
    if (!showAddCardModal) return;
    setSelectedEntities([]);
    setSelectedWeatherId(null);
    setSelectedTempId(null);
    setSelectedAndroidTVMediaId(null);
    setSelectedAndroidTVRemoteId(null);
    setSelectedCostTodayId(null);
    setSelectedCostMonthId(null);
    setCostSelectionTarget('today');
    setSelectedNordpoolId(null);
    setNordpoolDecimals(2);
  }, [addCardType, showAddCardModal]);

  // ── Labels ─────────────────────────────────────────────────────────────
  const getAddCardAvailableLabel = () => {
    if (addCardTargetPage === 'header') return t('addCard.available.people');
    if (addCardTargetPage === 'settings') return t('addCard.available.allEntities');
    if (addCardType === 'vacuum') return t('addCard.available.vacuums');
    if (addCardType === 'fan') return t('addCard.available.fans');
    if (addCardType === 'camera') return t('addCard.available.cameras');
    if (addCardType === 'climate') return t('addCard.available.climates');
    if (addCardType === 'cover') return t('addCard.available.covers');
    if (addCardType === 'cost') return t('addCard.available.costs');
    if (addCardType === 'media') return t('addCard.available.players');
    if (addCardType === 'car') return t('addCard.available.cars');
    if (addCardType === 'toggle') return t('addCard.available.toggles');
    if (addCardType === 'sensor') return t('addCard.available.sensors');
    if (addCardType === 'entity') return t('addCard.available.entities');
    return t('addCard.available.lights');
  };

  const getAddCardNoneLeftLabel = () => {
    const itemKey = addCardTargetPage === 'header'
      ? 'addCard.item.people'
      : addCardTargetPage === 'settings'
        ? 'addCard.item.entities'
        : addCardType === 'vacuum'
          ? 'addCard.item.vacuums'
          : addCardType === 'fan'
            ? 'addCard.item.fans'
          : addCardType === 'camera'
            ? 'addCard.item.cameras'
          : addCardType === 'climate'
            ? 'addCard.item.climates'
            : addCardType === 'cover'
              ? 'addCard.item.covers'
            : addCardType === 'cost'
              ? 'addCard.item.costs'
          : addCardType === 'media'
            ? 'addCard.item.players'
            : addCardType === 'car'
              ? 'addCard.item.cars'
            : addCardType === 'toggle'
              ? 'addCard.item.toggles'
            : addCardType === 'sensor'
              ? 'addCard.item.sensors'
              : addCardType === 'entity'
                ? 'addCard.item.entities'
                : 'addCard.item.lights';

    return t('addCard.noneLeft').replace('{item}', t(itemKey));
  };

  // ── Submit handler ─────────────────────────────────────────────────────
  const onAddSelected = (options = {}) => handleAddSelected({
    pagesConfig, persistConfig, addCardTargetPage, addCardType,
    selectedEntities, selectedWeatherId, selectedTempId,
    selectedAndroidTVMediaId, selectedAndroidTVRemoteId,
    selectedCostTodayId, selectedCostMonthId,
    selectedNordpoolId, nordpoolDecimals,
    selectedSpacerVariant: options.spacerVariant || selectedSpacerVariant,
    cardSettings, persistCardSettings, getCardSettingsKey,
    setSelectedEntities, setShowAddCardModal,
    setSelectedWeatherId, setSelectedTempId,
    setSelectedAndroidTVMediaId, setSelectedAndroidTVRemoteId,
    setSelectedCostTodayId, setSelectedCostMonthId,
    setCostSelectionTarget, setSelectedNordpoolId,
    setNordpoolDecimals, saveCardSetting,
    setShowEditCardModal, setEditCardSettingsKey,
  });

  return {
    addCardTargetPage, setAddCardTargetPage,
    addCardType, setAddCardType,
    searchTerm, setSearchTerm,
    selectedEntities, setSelectedEntities,
    selectedWeatherId, setSelectedWeatherId,
    selectedTempId, setSelectedTempId,
    selectedAndroidTVMediaId, setSelectedAndroidTVMediaId,
    selectedAndroidTVRemoteId, setSelectedAndroidTVRemoteId,
    selectedCostTodayId, setSelectedCostTodayId,
    selectedCostMonthId, setSelectedCostMonthId,
    costSelectionTarget, setCostSelectionTarget,
    selectedNordpoolId, setSelectedNordpoolId,
    nordpoolDecimals, setNordpoolDecimals,
    selectedSpacerVariant, setSelectedSpacerVariant,
    onAddSelected,
    getAddCardAvailableLabel,
    getAddCardNoneLeftLabel,
  };
}
