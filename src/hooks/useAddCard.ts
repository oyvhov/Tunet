import { useState, useEffect, useCallback, useRef } from 'react';
import { handleAddSelected } from '../services';
import { revealCard } from '../utils/revealCard';
import type {
  CardSettingsMap,
  PagesConfig,
  UseAddCardDeps,
  UseAddCardResult,
} from '../types/dashboard';

const DEFAULT_ADD_CARD_TYPE = 'light';
const EMPTY_SELECTION: string[] = [];
// Types whose picks become one grouped card instead of one card per entity.
const GROUPED_TYPES = new Set(['media', 'sonos', 'calendar']);
// Types that add a single card without picking anything first.
export const NO_PICK_TYPES = new Set(['todo', 'car', 'spacer']);
// Types that use the entity id itself as the card id.
const ENTITY_ID_CARD_TYPES = new Set(['light', 'vacuum', 'mower', 'fan', 'toggle', 'entity']);

/**
 * Manages all "Add Card" dialog state, selection resets, type inference and submission.
 */
export function useAddCard({
  showAddCardModal,
  activePage,
  isMediaPage = () => false,
  isSonosPage = () => false,
  isLightsPage = () => false,
  isBatteryPage = () => false,
  isRoomExplorerPage = () => false,
  pagesConfig,
  persistConfig,
  cardSettings,
  persistCardSettings,
  hiddenCards,
  persistHiddenCards,
  getCardSettingsKey,
  saveCardSetting,
  setShowAddCardModal,
  setShowEditCardModal,
  setEditCardSettingsKey,
  t,
}: UseAddCardDeps): UseAddCardResult {
  // ── Selection state ────────────────────────────────────────────────────
  const [addCardTargetPage, setAddCardTargetPage] = useState('home');
  const [addCardType, setAddCardType] = useState(DEFAULT_ADD_CARD_TYPE);
  const [searchTerm, setSearchTerm] = useState('');
  // Picks are kept per card type so switching type and back keeps them.
  const [selectedEntitiesByType, setSelectedEntitiesByType] = useState<Record<string, string[]>>(
    {}
  );
  const selectedEntities = selectedEntitiesByType[addCardType] || EMPTY_SELECTION;
  const setSelectedEntities = useCallback(
    (value: string[] | ((prev: string[]) => string[])) => {
      setSelectedEntitiesByType((prev) => {
        const current = prev[addCardType] || EMPTY_SELECTION;
        const next = typeof value === 'function' ? value(current) : value;
        return { ...prev, [addCardType]: next };
      });
    },
    [addCardType]
  );
  const clearAllSelectedEntities = useCallback(() => setSelectedEntitiesByType({}), []);
  const [selectedWeatherId, setSelectedWeatherId] = useState<string | null>(null);
  const [selectedTempId, setSelectedTempId] = useState<string | null>(null);
  const [selectedAndroidTVMediaId, setSelectedAndroidTVMediaId] = useState<string | null>(null);
  const [selectedAndroidTVRemoteId, setSelectedAndroidTVRemoteId] = useState<string | null>(null);
  const [selectedAppleTVMediaId, setSelectedAppleTVMediaId] = useState<string | null>(null);
  const [selectedAppleTVRemoteId, setSelectedAppleTVRemoteId] = useState<string | null>(null);
  const [selectedCostTodayId, setSelectedCostTodayId] = useState<string | null>(null);
  const [selectedCostMonthId, setSelectedCostMonthId] = useState<string | null>(null);
  const [costSelectionTarget, setCostSelectionTarget] = useState('today');
  const [selectedNordpoolId, setSelectedNordpoolId] = useState<string | null>(null);
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
      setSelectedEntitiesByType({});
      setSelectedWeatherId(null);
      setSelectedTempId(null);
      setSelectedAndroidTVMediaId(null);
      setSelectedAndroidTVRemoteId(null);
      setSelectedAppleTVMediaId(null);
      setSelectedAppleTVRemoteId(null);
      setSelectedCostTodayId(null);
      setSelectedCostMonthId(null);
      setCostSelectionTarget('today');
      setSelectedNordpoolId(null);
      setNordpoolDecimals(2);
      setSelectedSpacerVariant('divider');
    }
  }, [showAddCardModal]);

  // ── Show what was added once the popup closes ──────────────────────────
  const cardsBeforeAddRef = useRef<{ page: string; cards: string[] } | null>(null);
  useEffect(() => {
    const cardsOn = (page: string) =>
      (pagesConfig[page] as string[] | undefined) || EMPTY_SELECTION;
    if (showAddCardModal) {
      cardsBeforeAddRef.current = { page: addCardTargetPage, cards: cardsOn(addCardTargetPage) };
      return;
    }
    const before = cardsBeforeAddRef.current;
    cardsBeforeAddRef.current = null;
    const added = before && cardsOn(before.page).find((id) => !before.cards.includes(id));
    if (added) revealCard(added);
  }, [showAddCardModal, addCardTargetPage, pagesConfig]);

  // ── Infer card type from target page ───────────────────────────────────
  useEffect(() => {
    if (!showAddCardModal) return;
    if (
      isMediaPage(addCardTargetPage) ||
      isSonosPage(addCardTargetPage) ||
      isLightsPage(addCardTargetPage) ||
      isBatteryPage(addCardTargetPage) ||
      isRoomExplorerPage(addCardTargetPage)
    ) {
      setAddCardType('entity');
      return;
    }
    if (addCardTargetPage === 'header' || addCardTargetPage === 'settings') {
      setAddCardType('entity');
      return;
    }
    setAddCardType(DEFAULT_ADD_CARD_TYPE);
  }, [showAddCardModal, addCardTargetPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Labels ─────────────────────────────────────────────────────────────
  const getAddCardAvailableLabel = () => {
    if (addCardTargetPage === 'header') return t('addCard.available.people');
    if (addCardTargetPage === 'settings') return t('addCard.available.allEntities');
    if (addCardType === 'lock') return t('addCard.available.locks');
    if (addCardType === 'vacuum') return t('addCard.available.vacuums');
    if (addCardType === 'mower') return t('addCard.available.mowers');
    if (addCardType === 'fan') return t('addCard.available.fans');
    if (addCardType === 'camera') return t('addCard.available.cameras');
    if (addCardType === 'climate') return t('addCard.available.climates');
    if (addCardType === 'cover') return t('addCard.available.covers');
    if (addCardType === 'alarm') return t('addCard.available.alarms');
    if (addCardType === 'cost') return t('addCard.available.costs');
    if (addCardType === 'media') return t('addCard.available.players');
    if (addCardType === 'sonos') return t('addCard.available.sonos');
    if (addCardType === 'car') return t('addCard.available.cars');
    if (addCardType === 'toggle') return t('addCard.available.toggles');
    if (addCardType === 'sensor') return t('addCard.available.sensors');
    if (addCardType === 'entity') return t('addCard.available.entities');
    return t('addCard.available.lights');
  };

  const getAddCardNoneLeftLabel = () => {
    const itemKey =
      addCardTargetPage === 'header'
        ? 'addCard.item.people'
        : addCardTargetPage === 'settings'
          ? 'addCard.item.entities'
          : addCardType === 'lock'
            ? 'addCard.item.locks'
            : addCardType === 'vacuum'
              ? 'addCard.item.vacuums'
              : addCardType === 'mower'
                ? 'addCard.item.mowers'
                : addCardType === 'fan'
                  ? 'addCard.item.fans'
                  : addCardType === 'camera'
                    ? 'addCard.item.cameras'
                    : addCardType === 'climate'
                      ? 'addCard.item.climates'
                      : addCardType === 'cover'
                        ? 'addCard.item.covers'
                        : addCardType === 'alarm'
                          ? 'addCard.item.alarms'
                          : addCardType === 'cost'
                            ? 'addCard.item.costs'
                            : addCardType === 'media'
                              ? 'addCard.item.players'
                              : addCardType === 'sonos'
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

  // ── Pending cards across all card types ────────────────────────────────
  const isSpecialTarget = addCardTargetPage === 'header' || addCardTargetPage === 'settings';
  const pendingAddTypes: string[] = isSpecialTarget
    ? selectedEntities.length > 0
      ? [addCardType]
      : []
    : [
        ...Object.keys(selectedEntitiesByType).filter(
          (type) => selectedEntitiesByType[type].length > 0
        ),
        ...(selectedWeatherId ? ['weather'] : []),
        ...(selectedAndroidTVMediaId ? ['androidtv'] : []),
        ...(selectedAppleTVMediaId ? ['appletv'] : []),
        ...(selectedCostTodayId && selectedCostMonthId ? ['cost'] : []),
        ...(selectedNordpoolId ? ['nordpool'] : []),
      ];
  const pendingAddCount = pendingAddTypes.reduce((count, type) => {
    const picks = selectedEntitiesByType[type];
    if (!picks || GROUPED_TYPES.has(type) || isSpecialTarget) {
      return count + (isSpecialTarget ? selectedEntities.length : 1);
    }
    return count + picks.length;
  }, 0);

  // ── Submit handler ─────────────────────────────────────────────────────
  const onAddSelected = (
    options: {
      spacerVariant?: string;
      // Room cards picked alongside other types, added to the same working copy.
      addRooms?: (
        config: PagesConfig,
        settings: CardSettingsMap
      ) => { config: PagesConfig; settings: CardSettingsMap } | null;
    } = {}
  ) => {
    const context = {
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
      selectedSpacerVariant: options.spacerVariant || selectedSpacerVariant,
      cardSettings,
      persistCardSettings,
      hiddenCards,
      persistHiddenCards,
      getCardSettingsKey,
      setSelectedEntities: clearAllSelectedEntities,
      setShowAddCardModal,
      setSelectedWeatherId,
      setSelectedTempId,
      setSelectedAndroidTVMediaId,
      setSelectedAndroidTVRemoteId,
      selectedAppleTVMediaId,
      selectedAppleTVRemoteId,
      setSelectedAppleTVMediaId,
      setSelectedAppleTVRemoteId,
      setSelectedCostTodayId,
      setSelectedCostMonthId,
      setCostSelectionTarget,
      setSelectedNordpoolId,
      setNordpoolDecimals,
      saveCardSetting,
      setShowEditCardModal,
      setEditCardSettingsKey,
    };

    if (pendingAddTypes.length <= 1 && !options.addRooms) {
      const type = pendingAddTypes[0] ?? addCardType;
      handleAddSelected({
        ...context,
        addCardType: type,
        selectedEntities: isSpecialTarget
          ? selectedEntities
          : selectedEntitiesByType[type] || EMPTY_SELECTION,
      });
      return;
    }

    // Several card types picked: add them one after another on a working copy
    // and persist once, so later types don't overwrite earlier ones.
    let workingConfig: PagesConfig = pagesConfig;
    let workingSettings: CardSettingsMap = cardSettings;
    const initialHidden = Array.isArray(hiddenCards) ? hiddenCards : [];
    let workingHidden = initialHidden;
    let editCardId: string | null = null;
    let editSettingsKey: string | null = null;

    pendingAddTypes.forEach((type) => {
      const onPage = new Set(
        (workingConfig[addCardTargetPage] as string[] | undefined) || EMPTY_SELECTION
      );
      const picks = (selectedEntitiesByType[type] || EMPTY_SELECTION).filter(
        (id) => !ENTITY_ID_CARD_TYPES.has(type) || !onPage.has(id)
      );
      handleAddSelected({
        ...context,
        addCardType: type,
        selectedEntities: picks,
        pagesConfig: workingConfig,
        cardSettings: workingSettings,
        hiddenCards: workingHidden,
        persistConfig: (next) => {
          workingConfig = next;
        },
        persistCardSettings: (next) => {
          workingSettings = next;
        },
        persistHiddenCards: (next) => {
          workingHidden = next;
        },
        setShowAddCardModal: () => {},
        setShowEditCardModal: (cardId) => {
          editCardId = cardId;
        },
        setEditCardSettingsKey: (key) => {
          editSettingsKey = key;
        },
      });
    });

    const rooms = options.addRooms?.(workingConfig, workingSettings);
    if (rooms) {
      workingConfig = rooms.config;
      workingSettings = rooms.settings;
    }

    if (workingSettings !== cardSettings) persistCardSettings(workingSettings);
    if (workingConfig !== pagesConfig) persistConfig(workingConfig);
    if (workingHidden !== initialHidden && typeof persistHiddenCards === 'function') {
      persistHiddenCards(workingHidden);
    }
    clearAllSelectedEntities();
    setShowAddCardModal(false);
    if (editCardId) {
      setShowEditCardModal(editCardId);
      setEditCardSettingsKey(editSettingsKey);
    }
  };

  return {
    addCardTargetPage,
    setAddCardTargetPage,
    addCardType,
    setAddCardType,
    searchTerm,
    setSearchTerm,
    selectedEntities,
    setSelectedEntities,
    selectedWeatherId,
    setSelectedWeatherId,
    selectedTempId,
    setSelectedTempId,
    selectedAndroidTVMediaId,
    setSelectedAndroidTVMediaId,
    selectedAndroidTVRemoteId,
    setSelectedAndroidTVRemoteId,
    selectedAppleTVMediaId,
    setSelectedAppleTVMediaId,
    selectedAppleTVRemoteId,
    setSelectedAppleTVRemoteId,
    selectedCostTodayId,
    setSelectedCostTodayId,
    selectedCostMonthId,
    setSelectedCostMonthId,
    costSelectionTarget,
    setCostSelectionTarget,
    selectedNordpoolId,
    setSelectedNordpoolId,
    nordpoolDecimals,
    setNordpoolDecimals,
    selectedSpacerVariant,
    setSelectedSpacerVariant,
    onAddSelected,
    pendingAddCount,
    getAddCardAvailableLabel,
    getAddCardNoneLeftLabel,
  };
}
