import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCardGridSpan as _getCardGridSpan, getCardColSpan as _getCardColSpan, buildGridLayout as _buildGridLayout } from '../utils/gridLayout';
import { createDragAndDropHandlers } from '../utils/dragAndDrop';
import { dispatchCardRender } from '../rendering/cardRenderers';
import EditOverlay from '../components/ui/EditOverlay';

export function useCardRendering({
  editMode,
  pagesConfig,
  setPagesConfig,
  persistConfig,
  activePage,
  setActivePage,
  hiddenCards,
  isCardHiddenByLogic,
  gridColCount,
  gridGapV,
  cardSettings,
  getCardSettingsKey,
  entities,
  entitiesLoaded,
  conn,
  customNames,
  customIcons,
  getA,
  getS,
  getEntityImageUrl,
  callService,
  isMediaActive,
  saveCardSetting,
  language,
  isMobile,
  t,
  optimisticLightBrightness,
  setOptimisticLightBrightness,
  tempHistoryById,
  forecastsById,
  setShowLightModal,
  setShowSensorInfoModal,
  setActiveClimateEntityModal,
  setShowCostModal,
  setActiveVacuumId,
  setShowVacuumModal,
  setShowFanModal,
  setShowAndroidTVModal,
  setActiveCarModal,
  setShowWeatherModal,
  setShowNordpoolModal,
  setShowCalendarModal,
  setShowTodoModal,
  setShowRoomModal,
  setShowCoverModal,
  setShowAlarmModal,
  setShowAlarmActionModal,
  setShowEditCardModal,
  setEditCardSettingsKey,
  setShowCameraModal,
  setActiveMediaId,
  setActiveMediaGroupKey,
  setActiveMediaGroupIds,
  setActiveMediaModal,
  toggleCardVisibility,
  removeCard,
  isCardRemovable,
}) {
  const dragSourceRef = useRef(null);
  const touchTargetRef = useRef(null);
  const [touchTargetId, setTouchTargetId] = useState(null);
  const [touchPath, setTouchPath] = useState(null);
  const touchSwapCooldownRef = useRef(0);
  const pointerDragRef = useRef(false);
  const ignoreTouchRef = useRef(false);
  const [draggingId, setDraggingId] = useState(null);
  const [entitiesMissingReady, setEntitiesMissingReady] = useState(false);

  useEffect(() => {
    if (!entitiesLoaded) {
      setEntitiesMissingReady(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      setEntitiesMissingReady(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [entitiesLoaded]);

  const getCardGridSpan = useCallback((cardId) => {
    const rowPx = isMobile ? 82 : 100;
    const gapPx = isMobile ? 12 : gridGapV;
    return _getCardGridSpan(cardId, getCardSettingsKey, cardSettings, activePage, { rowPx, gapPx });
  }, [getCardSettingsKey, cardSettings, activePage, isMobile, gridGapV]);

  const getCardColSpan = useCallback((cardId) => {
    return _getCardColSpan(cardId, getCardSettingsKey, cardSettings);
  }, [getCardSettingsKey, cardSettings]);

  const moveCardInArray = useCallback((cardId, direction) => {
    const newConfig = { ...pagesConfig };
    const pageCards = [...(newConfig[activePage] || [])];
    const currentIndex = pageCards.indexOf(cardId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= pageCards.length) return;

    [pageCards[currentIndex], pageCards[newIndex]] = [pageCards[newIndex], pageCards[currentIndex]];
    newConfig[activePage] = pageCards;
    persistConfig(newConfig);
  }, [pagesConfig, activePage, persistConfig]);

  const gridLayout = useMemo(() => {
    const ids = pagesConfig[activePage] || [];
    const visibleIds = editMode ? ids : ids.filter(id => !(hiddenCards.includes(id) || isCardHiddenByLogic(id)));
    return _buildGridLayout(visibleIds, gridColCount, getCardGridSpan, getCardColSpan);
  }, [pagesConfig, activePage, gridColCount, hiddenCards, editMode, isCardHiddenByLogic, getCardGridSpan, getCardColSpan]);

  const dragAndDrop = useMemo(() => createDragAndDropHandlers({
    editMode,
    pagesConfig,
    setPagesConfig,
    persistConfig,
    activePage,
    dragSourceRef,
    touchTargetRef,
    touchSwapCooldownRef,
    touchPath,
    setTouchPath,
    touchTargetId,
    setTouchTargetId,
    setDraggingId,
    ignoreTouchRef,
  }), [
    editMode,
    pagesConfig,
    setPagesConfig,
    persistConfig,
    activePage,
    touchPath,
    touchTargetId,
  ]);

  const renderCard = useCallback((cardId, index, colIndex) => {
    const isHidden = hiddenCards.includes(cardId) || isCardHiddenByLogic(cardId);
    if (isHidden && !editMode) return null;
    const isDragging = draggingId === cardId;

    const {
      getDragProps,
      getCardStyle,
      startTouchDrag,
      updateTouchDrag,
      performTouchDrop,
      resetDragState,
    } = dragAndDrop;

    const dragProps = getDragProps({ cardId, index, colIndex });
    const cardStyle = getCardStyle({ cardId, isHidden, isDragging });
    const settingsKey = getCardSettingsKey(cardId);

    const getControls = (targetId) => {
      if (!editMode) return null;
      const editId = targetId || cardId;
      const controlsHidden = hiddenCards.includes(cardId) || isCardHiddenByLogic(cardId);
      const settings = cardSettings[settingsKey] || cardSettings[editId] || {};

      return (
        <EditOverlay
          cardId={cardId}
          editId={editId}
          settingsKey={settingsKey}
          isHidden={controlsHidden}
          currentSize={cardSettings[settingsKey]?.size || 'large'}
          settings={settings}
          canRemove={isCardRemovable(cardId)}
          onMoveLeft={() => moveCardInArray(cardId, 'left')}
          onMoveRight={() => moveCardInArray(cardId, 'right')}
          onEdit={() => { setShowEditCardModal(editId); setEditCardSettingsKey(settingsKey); }}
          onToggleVisibility={() => toggleCardVisibility(cardId)}
          onSaveSize={(size) => saveCardSetting(settingsKey, 'size', size)}
          onRemove={() => removeCard(cardId)}
          dragHandleProps={{
            onContextMenu: (e) => e.preventDefault(),
            onPointerDown: (e) => {
              if (!editMode || e.pointerType !== 'touch') return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              pointerDragRef.current = true;
              ignoreTouchRef.current = true;
              startTouchDrag(cardId, index, colIndex, e.clientX, e.clientY);
            },
            onPointerMove: (e) => {
              if (!editMode || e.pointerType !== 'touch') return;
              if (!pointerDragRef.current) return;
              e.preventDefault();
              updateTouchDrag(e.clientX, e.clientY);
            },
            onPointerUp: (e) => {
              if (!editMode || e.pointerType !== 'touch') return;
              if (!pointerDragRef.current) return;
              e.preventDefault();
              pointerDragRef.current = false;
              ignoreTouchRef.current = false;
              performTouchDrop(e.clientX, e.clientY);
              resetDragState();
            },
            onPointerCancel: (e) => {
              if (!editMode || e.pointerType !== 'touch') return;
              if (!pointerDragRef.current) return;
              e.preventDefault();
              pointerDragRef.current = false;
              ignoreTouchRef.current = false;
              const x = touchPath?.x ?? e.clientX;
              const y = touchPath?.y ?? e.clientY;
              performTouchDrop(x, y);
              resetDragState();
            },
          }}
          t={t}
        />
      );
    };

    const ctx = {
      entities, entitiesLoaded, entitiesMissingReady, editMode, conn, cardSettings, customNames, customIcons,
      getA, getS, getEntityImageUrl, callService, isMediaActive,
      saveCardSetting, language, isMobile, activePage, t,
      optimisticLightBrightness, setOptimisticLightBrightness,
      tempHistoryById, forecastsById, isCardHiddenByLogic,
      setShowLightModal, setShowSensorInfoModal, setActiveClimateEntityModal,
      setShowCostModal, setActiveVacuumId, setShowVacuumModal,
      setShowFanModal,
      setShowAndroidTVModal, setActiveCarModal, setShowWeatherModal,
      setShowNordpoolModal, setShowCalendarModal, setShowTodoModal,
      setShowRoomModal, setShowCoverModal, setShowAlarmModal, setShowAlarmActionModal, setShowEditCardModal, setEditCardSettingsKey,
      setShowCameraModal,
      setActivePage,
      openMediaModal: (mpId, groupKey, groupIds) => {
        setActiveMediaId(mpId);
        setActiveMediaGroupKey(groupKey);
        setActiveMediaGroupIds(groupIds);
        setActiveMediaModal('media');
      },
    };

    try {
      return dispatchCardRender(cardId, dragProps, getControls, cardStyle, settingsKey, ctx);
    } catch (error) {
      console.error('[CardRenderGuard] Failed to render card', { cardId, settingsKey, error });
      return (
        <div
          key={`${cardId}-render-error`}
          {...dragProps}
          className="w-full h-full rounded-2xl border p-3 text-xs flex items-center justify-center text-center"
          style={{
            ...cardStyle,
            backgroundColor: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
            color: 'var(--text-secondary)',
          }}
        >
          {t('card.error.render')}
        </div>
      );
    }
  }, [
    hiddenCards,
    isCardHiddenByLogic,
    editMode,
    draggingId,
    dragAndDrop,
    getCardSettingsKey,
    cardSettings,
    isCardRemovable,
    moveCardInArray,
    setShowEditCardModal,
    setEditCardSettingsKey,
    toggleCardVisibility,
    saveCardSetting,
    removeCard,
    t,
    touchPath,
    entities,
    entitiesLoaded,
    entitiesMissingReady,
    conn,
    customNames,
    customIcons,
    getA,
    getS,
    getEntityImageUrl,
    callService,
    isMediaActive,
    language,
    isMobile,
    activePage,
    optimisticLightBrightness,
    setOptimisticLightBrightness,
    tempHistoryById,
    forecastsById,
    setShowLightModal,
    setShowSensorInfoModal,
    setActiveClimateEntityModal,
    setShowCostModal,
    setActiveVacuumId,
    setShowVacuumModal,
    setShowFanModal,
    setShowAndroidTVModal,
    setActiveCarModal,
    setShowWeatherModal,
    setShowNordpoolModal,
    setShowCalendarModal,
    setShowTodoModal,
    setShowRoomModal,
    setActivePage,
    setShowCoverModal,
    setShowAlarmModal,
    setShowAlarmActionModal,
    setShowCameraModal,
    setActiveMediaId,
    setActiveMediaGroupKey,
    setActiveMediaGroupIds,
    setActiveMediaModal,
  ]);

  return {
    renderCard,
    gridLayout,
    draggingId,
    touchPath,
  };
}
