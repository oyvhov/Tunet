import { buildOnboardingSteps } from '../config/onboarding';
import { useHomeAssistantMeta } from '../contexts';
import { useProfiles } from '../hooks/useProfiles';
import { ModalEntitySlice } from './modalSlices/ModalEntitySlice';
import { ModalManagementSlice } from './modalSlices/ModalManagementSlice';
import { ModalSettingsSlice } from './modalSlices/ModalSettingsSlice';
import { buildProfilesContextSetters } from './profileContextSetters';
import { useEditModalProps } from './useEditModalProps';

export default function ModalOrchestrator({
  entities,
  conn,
  activeUrl,
  connected,
  authRef,
  config,
  setConfig,
  t,
  language,
  setLanguage,
  modals,
  appearance,
  layout,
  onboarding,
  pageManagement,
  entityHelpers,
  addCard,
  cardConfig,
  mediaTick,
}) {
  const { showEditCardModal, editCardSettingsKey } = modals;
  const {
    cardSettings,
    getCardSettingsKey,
    persistCardSettings,
    persistCustomNames,
    persistCustomIcons,
    persistHiddenCards,
    saveStatusPillsConfig,
  } = cardConfig;
  const { persistConfig, persistPageSettings } = pageManagement;
  const {
    setGridColumns,
    setGridGapH,
    setGridGapV,
    setCardBorderRadius,
    updateHeaderScale,
    updateHeaderTitle,
    updateHeaderSettings,
    updateSectionSpacing,
  } = layout;
  const {
    setCurrentTheme,
    setBgMode,
    setBgColor,
    setBgGradient,
    setBgImage,
    setCardTransparency,
    setCardBorderOpacity,
    setCardBgColor,
    setInactivityTimeout,
  } = appearance;

  const resolveCarSettings = (_cardId, settings = {}) => settings;
  const editModalProps = useEditModalProps({
    showEditCardModal,
    editCardSettingsKey,
    getCardSettingsKey,
    cardSettings,
    entities,
    resolveCarSettings,
  });

  const onboardingSteps = buildOnboardingSteps(t);

  const { haUser } = useHomeAssistantMeta();
  const profileContextSetters = buildProfilesContextSetters({
    page: {
      persistConfig,
      persistCardSettings,
      persistPageSettings,
      persistCustomNames,
      persistCustomIcons,
      persistHiddenCards,
      saveStatusPillsConfig,
    },
    layout: {
      setGridColumns,
      setGridGapH,
      setGridGapV,
      setCardBorderRadius,
      updateHeaderScale,
      updateHeaderTitle,
      updateHeaderSettings,
      updateSectionSpacing,
    },
    appearance: {
      setCurrentTheme,
      setBgMode,
      setBgColor,
      setBgGradient,
      setBgImage,
      setCardTransparency,
      setCardBorderOpacity,
      setCardBgColor,
      setInactivityTimeout,
    },
    setLanguage,
  });

  const profilesHook = useProfiles({
    haUser,
    contextSetters: profileContextSetters,
  });

  const profilesProps = {
    ...profilesHook,
    haUser,
  };

  const core = {
    entities,
    conn,
    activeUrl,
    connected,
    authRef,
    config,
    setConfig,
    t,
    language,
    setLanguage,
    activePage: pageManagement.activePage,
    pageSettings: pageManagement.pageSettings,
    savePageSetting: pageManagement.savePageSetting,
    gridColumns: layout.gridColumns,
  };

  return (
    <>
      <ModalSettingsSlice
        core={core}
        modals={modals}
        appearance={appearance}
        layout={layout}
        onboarding={onboarding}
        profiles={profilesProps}
        onboardingSteps={onboardingSteps}
        entityHelpers={entityHelpers}
      />

      <ModalEntitySlice
        core={core}
        modals={modals}
        cardConfig={cardConfig}
        entityHelpers={entityHelpers}
        resolveCarSettings={resolveCarSettings}
      />

      <ModalManagementSlice
        core={core}
        modals={modals}
        pageManagement={pageManagement}
        addCard={addCard}
        cardConfig={cardConfig}
        entityHelpers={entityHelpers}
        editModalProps={editModalProps}
        mediaTick={mediaTick}
      />
    </>
  );
}
