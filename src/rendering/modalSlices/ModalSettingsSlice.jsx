import { lazy } from 'react';
import { ModalSuspense } from '../../components';
import { themes } from '../../config/themes';
import { validateUrl } from '../../config/onboarding';

const ConfigModal = lazy(() => import('../../modals/ConfigModal'));
const ThemeSidebar = lazy(() => import('../../components/sidebars/ThemeSidebar'));
const LayoutSidebar = lazy(() => import('../../components/sidebars/LayoutSidebar'));
const HeaderSidebar = lazy(() => import('../../components/sidebars/HeaderSidebar'));

export function ModalSettingsSlice({ core, modals, appearance, layout, onboarding, profiles, onboardingSteps, entityHelpers }) {
  const { entities, connected, activeUrl, config, setConfig, t, language, setLanguage } = core;
  const {
    showConfigModal,
    setShowConfigModal,
    showThemeSidebar,
    setShowThemeSidebar,
    showLayoutSidebar,
    setShowLayoutSidebar,
    showHeaderEditModal,
    setShowHeaderEditModal,
    configTab,
    setConfigTab,
  } = modals;
  const {
    currentTheme,
    setCurrentTheme,
    bgMode,
    setBgMode,
    bgColor,
    setBgColor,
    bgGradient,
    setBgGradient,
    bgImage,
    setBgImage,
    cardTransparency,
    setCardTransparency,
    cardBorderOpacity,
    setCardBorderOpacity,
    cardBgColor,
    setCardBgColor,
    inactivityTimeout,
    setInactivityTimeout,
  } = appearance;
  const {
    gridGapH,
    setGridGapH,
    gridGapV,
    setGridGapV,
    gridColumns,
    setGridColumns,
    dynamicGridColumns,
    setDynamicGridColumns,
    effectiveGridColumns,
    cardBorderRadius,
    setCardBorderRadius,
    sectionSpacing,
    updateSectionSpacing,
    headerTitle,
    headerScale,
    headerSettings,
    updateHeaderTitle,
    updateHeaderScale,
    updateHeaderSettings,
  } = layout;
  const {
    showOnboarding,
    setShowOnboarding,
    isOnboardingActive,
    onboardingStep,
    setOnboardingStep,
    onboardingUrlError,
    setOnboardingUrlError,
    onboardingTokenError,
    setOnboardingTokenError,
    testingConnection,
    testConnection,
    connectionTestResult,
    setConnectionTestResult,
    startOAuthLogin,
    handleOAuthLogout,
    canAdvanceOnboarding,
  } = onboarding;
  const { getEntityImageUrl, callService } = entityHelpers;

  return (
    <>
      {(showConfigModal || showOnboarding) && (
        <ModalSuspense>
          <ConfigModal
            open={showConfigModal || showOnboarding}
            isOnboardingActive={isOnboardingActive}
            t={t}
            configTab={configTab}
            setConfigTab={setConfigTab}
            onboardingSteps={onboardingSteps}
            onboardingStep={onboardingStep}
            setOnboardingStep={setOnboardingStep}
            canAdvanceOnboarding={canAdvanceOnboarding}
            connected={connected}
            activeUrl={activeUrl}
            config={config}
            setConfig={setConfig}
            onboardingUrlError={onboardingUrlError}
            setOnboardingUrlError={setOnboardingUrlError}
            onboardingTokenError={onboardingTokenError}
            setOnboardingTokenError={setOnboardingTokenError}
            setConnectionTestResult={setConnectionTestResult}
            connectionTestResult={connectionTestResult}
            validateUrl={validateUrl}
            testConnection={testConnection}
            testingConnection={testingConnection}
            startOAuthLogin={startOAuthLogin}
            handleOAuthLogout={handleOAuthLogout}
            language={language}
            setLanguage={setLanguage}
            inactivityTimeout={inactivityTimeout}
            setInactivityTimeout={setInactivityTimeout}
            entities={entities}
            getEntityImageUrl={getEntityImageUrl}
            callService={callService}
            onClose={() => setShowConfigModal(false)}
            onFinishOnboarding={() => {
              setShowOnboarding(false);
              setShowConfigModal(false);
            }}
            profiles={profiles}
          />
        </ModalSuspense>
      )}

      <ModalSuspense>
        <ThemeSidebar
          open={showThemeSidebar}
          onClose={() => setShowThemeSidebar(false)}
          onSwitchToLayout={() => {
            setShowThemeSidebar(false);
            setShowLayoutSidebar(true);
          }}
          onSwitchToHeader={() => {
            setShowThemeSidebar(false);
            setShowHeaderEditModal(true);
          }}
          t={t}
          themes={themes}
          currentTheme={currentTheme}
          setCurrentTheme={setCurrentTheme}
          language={language}
          setLanguage={setLanguage}
          bgMode={bgMode}
          setBgMode={setBgMode}
          bgColor={bgColor}
          setBgColor={setBgColor}
          bgGradient={bgGradient}
          setBgGradient={setBgGradient}
          bgImage={bgImage}
          setBgImage={setBgImage}
          inactivityTimeout={inactivityTimeout}
          setInactivityTimeout={setInactivityTimeout}
        />
      </ModalSuspense>

      <ModalSuspense>
        <LayoutSidebar
          open={showLayoutSidebar}
          onClose={() => setShowLayoutSidebar(false)}
          onSwitchToTheme={() => {
            setShowLayoutSidebar(false);
            setShowThemeSidebar(true);
          }}
          onSwitchToHeader={() => {
            setShowLayoutSidebar(false);
            setShowHeaderEditModal(true);
          }}
          t={t}
          gridGapH={gridGapH}
          setGridGapH={setGridGapH}
          gridGapV={gridGapV}
          setGridGapV={setGridGapV}
          gridColumns={gridColumns}
          setGridColumns={setGridColumns}
          dynamicGridColumns={dynamicGridColumns}
          setDynamicGridColumns={setDynamicGridColumns}
          effectiveGridColumns={effectiveGridColumns}
          cardBorderRadius={cardBorderRadius}
          setCardBorderRadius={setCardBorderRadius}
          cardTransparency={cardTransparency}
          setCardTransparency={setCardTransparency}
          cardBorderOpacity={cardBorderOpacity}
          setCardBorderOpacity={setCardBorderOpacity}
          cardBgColor={cardBgColor}
          setCardBgColor={setCardBgColor}
          sectionSpacing={sectionSpacing}
          updateSectionSpacing={updateSectionSpacing}
          activePage={core.activePage}
          pageSettings={core.pageSettings}
          savePageSetting={core.savePageSetting}
        />
      </ModalSuspense>

      <ModalSuspense>
        <HeaderSidebar
          open={showHeaderEditModal}
          onClose={() => setShowHeaderEditModal(false)}
          headerTitle={headerTitle}
          headerScale={headerScale}
          headerSettings={headerSettings}
          updateHeaderTitle={updateHeaderTitle}
          updateHeaderScale={updateHeaderScale}
          updateHeaderSettings={updateHeaderSettings}
          onSwitchToTheme={() => {
            setShowHeaderEditModal(false);
            setShowThemeSidebar(true);
          }}
          onSwitchToLayout={() => {
            setShowHeaderEditModal(false);
            setShowLayoutSidebar(true);
          }}
          t={t}
        />
      </ModalSuspense>
    </>
  );
}
