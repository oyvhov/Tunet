import { lazy } from 'react';
import { ModalSuspense, getServerInfo } from '../../components';
import { formatDuration } from '../../utils';
import { buildRoomCardsPayload } from './roomCardUtils';

const AddPageModal = lazy(() => import('../../modals/AddPageModal'));
const AddCardContent = lazy(() => import('../../modals/AddCardContent'));
const EditCardModal = lazy(() => import('../../modals/EditCardModal'));
const EditPageModal = lazy(() => import('../../modals/EditPageModal'));
const MediaModal = lazy(() => import('../../modals/MediaModal'));
const StatusPillsConfigModal = lazy(() => import('../../modals/StatusPillsConfigModal'));

export function ModalManagementSlice({
  core,
  modals,
  pageManagement,
  addCard,
  cardConfig,
  entityHelpers,
  editModalProps,
  mediaTick,
}) {
  const { entities, conn, t } = core;
  const {
    activeMediaModal,
    setActiveMediaModal,
    activeMediaGroupKey,
    setActiveMediaGroupKey,
    activeMediaGroupIds,
    setActiveMediaGroupIds,
    activeMediaSessionSensorIds,
    setActiveMediaSessionSensorIds,
    activeMediaId,
    setActiveMediaId,
    showAddCardModal,
    setShowAddCardModal,
    showAddPageModal,
    setShowAddPageModal,
    showEditCardModal,
    setShowEditCardModal: setEditCardModalVisibility,
    showStatusPillsConfig,
    setShowStatusPillsConfig,
    setEditCardSettingsKey,
  } = modals;
  const {
    pageDefaults,
    editingPage,
    setEditingPage,
    newPageLabel,
    setNewPageLabel,
    newPageIcon,
    setNewPageIcon,
    createPage,
    createMediaPage,
    deletePage,
    pageSettings,
    savePageSetting,
    pagesConfig,
    persistConfig,
  } = pageManagement;
  const {
    addCardTargetPage,
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
    getAddCardAvailableLabel,
    getAddCardNoneLeftLabel,
  } = addCard;
  const {
    cardSettings,
    saveCardSetting,
    persistCardSettings,
    customNames,
    saveCustomName,
    saveCustomIcon,
    customIcons,
    hiddenCards,
    toggleCardVisibility,
    getCardSettingsKey,
    statusPillsConfig,
    saveStatusPillsConfig,
  } = cardConfig;
  const { callService, getEntityImageUrl, getA, isSonosActive, isMediaActive } = entityHelpers;

  return (
    <>
      {showAddCardModal && (
        <ModalSuspense>
          <AddCardContent
            onClose={() => setShowAddCardModal(false)}
            addCardTargetPage={addCardTargetPage}
            addCardType={addCardType}
            setAddCardType={setAddCardType}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            entities={entities}
            pagesConfig={pagesConfig}
            selectedEntities={selectedEntities}
            setSelectedEntities={setSelectedEntities}
            selectedWeatherId={selectedWeatherId}
            setSelectedWeatherId={setSelectedWeatherId}
            selectedTempId={selectedTempId}
            setSelectedTempId={setSelectedTempId}
            selectedAndroidTVMediaId={selectedAndroidTVMediaId}
            setSelectedAndroidTVMediaId={setSelectedAndroidTVMediaId}
            selectedAndroidTVRemoteId={selectedAndroidTVRemoteId}
            setSelectedAndroidTVRemoteId={setSelectedAndroidTVRemoteId}
            selectedCostTodayId={selectedCostTodayId}
            setSelectedCostTodayId={setSelectedCostTodayId}
            selectedCostMonthId={selectedCostMonthId}
            setSelectedCostMonthId={setSelectedCostMonthId}
            costSelectionTarget={costSelectionTarget}
            setCostSelectionTarget={setCostSelectionTarget}
            selectedNordpoolId={selectedNordpoolId}
            setSelectedNordpoolId={setSelectedNordpoolId}
            nordpoolDecimals={nordpoolDecimals}
            setNordpoolDecimals={setNordpoolDecimals}
            selectedSpacerVariant={selectedSpacerVariant}
            setSelectedSpacerVariant={setSelectedSpacerVariant}
            onAddSelected={onAddSelected}
            onAddRoom={(areas, areaEntitiesById) => {
              const payload = buildRoomCardsPayload({
                areas,
                areaEntitiesById,
                pagesConfig,
                addCardTargetPage,
                cardSettings,
                getCardSettingsKey,
              });
              if (!payload) return;

              payload.customNames.forEach(({ cardId, name }) => {
                saveCustomName(cardId, name);
              });

              persistConfig(payload.newConfig);
              persistCardSettings(payload.newSettings);
              setShowAddCardModal(false);

              if (areas.length === 1 && payload.firstCardId && payload.firstSettingsKey) {
                setEditCardModalVisibility(payload.firstCardId);
                setEditCardSettingsKey(payload.firstSettingsKey);
              }
            }}
            conn={conn}
            getAddCardAvailableLabel={getAddCardAvailableLabel}
            getAddCardNoneLeftLabel={getAddCardNoneLeftLabel}
            t={t}
          />
        </ModalSuspense>
      )}

      {editingPage && (
        <ModalSuspense>
          <EditPageModal
            isOpen={!!editingPage}
            onClose={() => setEditingPage(null)}
            t={t}
            editingPage={editingPage}
            pageSettings={pageSettings}
            savePageSetting={savePageSetting}
            pageDefaults={pageDefaults}
            onDelete={deletePage}
          />
        </ModalSuspense>
      )}

      {showAddPageModal && (
        <ModalSuspense>
          <AddPageModal
            isOpen={showAddPageModal}
            onClose={() => setShowAddPageModal(false)}
            t={t}
            newPageLabel={newPageLabel}
            setNewPageLabel={setNewPageLabel}
            newPageIcon={newPageIcon}
            setNewPageIcon={setNewPageIcon}
            onCreate={createPage}
            onCreateMedia={createMediaPage}
          />
        </ModalSuspense>
      )}

      {showEditCardModal && (
        <ModalSuspense>
          <EditCardModal
            isOpen={!!showEditCardModal}
            onClose={() => {
              setEditCardModalVisibility(null);
              setEditCardSettingsKey(null);
            }}
            t={t}
            entityId={showEditCardModal}
            entities={entities}
            conn={conn}
            customNames={customNames}
            saveCustomName={saveCustomName}
            customIcons={customIcons}
            saveCustomIcon={saveCustomIcon}
            saveCardSetting={saveCardSetting}
            hiddenCards={hiddenCards}
            toggleCardVisibility={toggleCardVisibility}
            gridColumns={core.gridColumns}
            pagesConfig={pagesConfig}
            pageSettings={pageSettings}
            {...editModalProps}
          />
        </ModalSuspense>
      )}

      {activeMediaModal && (
        <ModalSuspense>
          <MediaModal
            show={!!activeMediaModal}
            onClose={() => {
              setActiveMediaModal(null);
              setActiveMediaGroupKey(null);
              setActiveMediaGroupIds(null);
              setActiveMediaSessionSensorIds(null);
            }}
            activeMediaModal={activeMediaModal}
            activeMediaGroupKey={activeMediaGroupKey}
            activeMediaGroupIds={activeMediaGroupIds}
            activeMediaSessionSensorIds={activeMediaSessionSensorIds}
            activeMediaId={activeMediaId}
            setActiveMediaId={setActiveMediaId}
            entities={entities}
            cardSettings={cardSettings}
            customNames={customNames}
            mediaTick={mediaTick}
            conn={conn}
            callService={callService}
            getA={getA}
            getEntityImageUrl={getEntityImageUrl}
            isMediaActive={isMediaActive}
            isSonosActive={isSonosActive}
            t={t}
            formatDuration={formatDuration}
            getServerInfo={getServerInfo}
          />
        </ModalSuspense>
      )}

      {showStatusPillsConfig && (
        <ModalSuspense>
          <StatusPillsConfigModal
            show={showStatusPillsConfig}
            onClose={() => setShowStatusPillsConfig(false)}
            statusPillsConfig={statusPillsConfig}
            onSave={saveStatusPillsConfig}
            entities={entities}
            t={t}
          />
        </ModalSuspense>
      )}
    </>
  );
}
