import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppContent } from '../App';

const mockFns = {
  setActivePage: vi.fn(),
  setEditMode: vi.fn(),
  setShowAddCardModal: vi.fn(),
  requestSettingsAccess: vi.fn((callback) => callback()),
};

vi.mock('../layouts', () => ({
  DashboardLayout: (props) => (
    <div>
      <button data-testid="page-switch" onClick={() => props.setActivePage('kitchen')}>
        switch
      </button>
      <button data-testid="edit-on" onClick={() => props.guardedSetEditMode(true)}>
        edit
      </button>
      <button data-testid="modal-open" onClick={() => props.guardedSetShowAddCardModal(true)}>
        open
      </button>
      <button data-testid="modal-close" onClick={() => props.guardedSetShowAddCardModal(false)}>
        close
      </button>
    </div>
  ),
}));

vi.mock('../components', () => ({
  PersonStatus: () => null,
}));

vi.mock('../contexts', () => ({
  AppUiProvider: ({ children }) => children,
  HomeAssistantProvider: ({ children }) => children,
  ModalProvider: ({ children }) => children,
  useConfig: () => ({
    currentTheme: 'glassmorphism',
    setCurrentTheme: vi.fn(),
    language: 'en',
    setLanguage: vi.fn(),
    inactivityTimeout: 0,
    setInactivityTimeout: vi.fn(),
    bgMode: 'theme',
    setBgMode: vi.fn(),
    bgColor: '#000',
    setBgColor: vi.fn(),
    bgGradient: '',
    setBgGradient: vi.fn(),
    bgImage: '',
    setBgImage: vi.fn(),
    cardTransparency: 60,
    setCardTransparency: vi.fn(),
    cardBorderOpacity: 40,
    setCardBorderOpacity: vi.fn(),
    cardBgColor: '',
    setCardBgColor: vi.fn(),
    appFont: 'sans',
    settingsLockEnabled: true,
    settingsLockSessionUnlocked: false,
    unlockSettingsLock: vi.fn(() => true),
    config: { token: 'x', authMethod: 'token', url: '', fallbackUrl: '' },
    setConfig: vi.fn(),
  }),
  usePages: () => ({
    pagesConfig: { pages: ['home', 'kitchen'], home: [], kitchen: [], header: [] },
    setPagesConfig: vi.fn(),
    persistConfig: vi.fn(),
    cardSettings: {},
    saveCardSetting: vi.fn(),
    customNames: {},
    saveCustomName: vi.fn(),
    customIcons: {},
    saveCustomIcon: vi.fn(),
    hiddenCards: [],
    toggleCardVisibility: vi.fn(),
    pageSettings: {},
    persistPageSettings: vi.fn(),
    persistCustomNames: vi.fn(),
    persistCustomIcons: vi.fn(),
    persistHiddenCards: vi.fn(),
    savePageSetting: vi.fn(),
    gridColumns: 3,
    setGridColumns: vi.fn(),
    dynamicGridColumns: false,
    setDynamicGridColumns: vi.fn(),
    gridGapH: 16,
    setGridGapH: vi.fn(),
    gridGapV: 16,
    setGridGapV: vi.fn(),
    cardBorderRadius: 22,
    setCardBorderRadius: vi.fn(),
    headerScale: 1,
    updateHeaderScale: vi.fn(),
    headerTitle: 'Home',
    updateHeaderTitle: vi.fn(),
    headerSettings: { showTitle: true, showClock: true, showClockOnMobile: true, showDate: true },
    updateHeaderSettings: vi.fn(),
    sectionSpacing: { headerToStatus: 0, statusToNav: 0, navToGrid: 24 },
    updateSectionSpacing: vi.fn(),
    persistCardSettings: vi.fn(),
    statusPillsConfig: [],
    saveStatusPillsConfig: vi.fn(),
  }),
  useHomeAssistant: () => ({
    entities: {
      'update.core': { entity_id: 'update.core', state: 'off', attributes: {} },
    },
    entitiesLoaded: true,
    connected: true,
    haUnavailableVisible: false,
    oauthExpired: false,
    conn: {},
    activeUrl: 'http://localhost:8123',
    authRef: { current: null },
  }),
  useModalState: () => ({
    setShowNordpoolModal: vi.fn(),
    setShowCostModal: vi.fn(),
    setActiveClimateEntityModal: vi.fn(),
    setShowLightModal: vi.fn(),
    setActiveCarModal: vi.fn(),
    setShowPersonModal: vi.fn(),
    setShowAndroidTVModal: vi.fn(),
    setShowVacuumModal: vi.fn(),
    setShowFanModal: vi.fn(),
    setShowSensorInfoModal: vi.fn(),
    setShowCalendarModal: vi.fn(),
    setShowTodoModal: vi.fn(),
    setShowRoomModal: vi.fn(),
    setShowCoverModal: vi.fn(),
    setShowCameraModal: vi.fn(),
    setShowWeatherModal: vi.fn(),
    setShowAlarmModal: vi.fn(),
    setShowAlarmActionModal: vi.fn(),
    activeMediaModal: null,
    setActiveMediaModal: vi.fn(),
    setActiveMediaGroupKey: vi.fn(),
    setActiveMediaGroupIds: vi.fn(),
    setActiveMediaSessionSensorIds: vi.fn(),
    activeMediaId: null,
    setActiveMediaId: vi.fn(),
    showAddCardModal: false,
    setShowAddCardModal: mockFns.setShowAddCardModal,
    showConfigModal: false,
    setShowConfigModal: vi.fn(),
    showAddPageModal: false,
    setShowAddPageModal: vi.fn(),
    setShowHeaderEditModal: vi.fn(),
    setShowEditCardModal: vi.fn(),
    setShowStatusPillsConfig: vi.fn(),
    hasOpenModal: vi.fn(() => false),
    closeAllModals: vi.fn(),
  }),
  useAppUiStateContext: () => ({
    activeVacuumId: null,
    setActiveVacuumId: vi.fn(),
    showThemeSidebar: false,
    setShowThemeSidebar: vi.fn(),
    showLayoutSidebar: false,
    setShowLayoutSidebar: vi.fn(),
    editCardSettingsKey: null,
    setEditCardSettingsKey: vi.fn(),
    editMode: false,
    setEditMode: mockFns.setEditMode,
  }),
}));

vi.mock('../hooks', () => ({
  useSmartTheme: vi.fn(),
  useTempHistory: () => [{}, vi.fn()],
  useWeatherForecast: () => [{}, vi.fn()],
  useAddCard: () => ({
    addCardTargetPage: 'home',
    setAddCardTargetPage: vi.fn(),
    addCardType: 'entity',
    setAddCardType: vi.fn(),
    searchTerm: '',
    setSearchTerm: vi.fn(),
    selectedEntities: [],
    setSelectedEntities: vi.fn(),
    selectedWeatherId: null,
    setSelectedWeatherId: vi.fn(),
    selectedTempId: null,
    setSelectedTempId: vi.fn(),
    selectedAndroidTVMediaId: null,
    setSelectedAndroidTVMediaId: vi.fn(),
    selectedAndroidTVRemoteId: null,
    setSelectedAndroidTVRemoteId: vi.fn(),
    selectedCostTodayId: null,
    setSelectedCostTodayId: vi.fn(),
    selectedCostMonthId: null,
    setSelectedCostMonthId: vi.fn(),
    costSelectionTarget: 'today',
    setCostSelectionTarget: vi.fn(),
    selectedNordpoolId: null,
    setSelectedNordpoolId: vi.fn(),
    nordpoolDecimals: 0,
    setNordpoolDecimals: vi.fn(),
    selectedSpacerVariant: 'spacer',
    setSelectedSpacerVariant: vi.fn(),
    onAddSelected: vi.fn(),
    getAddCardAvailableLabel: () => '',
    getAddCardNoneLeftLabel: () => '',
  }),
  useConnectionSetup: () => ({
    onboardingStep: 0,
    setOnboardingStep: vi.fn(),
    onboardingUrlError: '',
    setOnboardingUrlError: vi.fn(),
    onboardingTokenError: '',
    setOnboardingTokenError: vi.fn(),
    testingConnection: false,
    testConnection: vi.fn(),
    connectionTestResult: null,
    setConnectionTestResult: vi.fn(),
    configTab: 'connection',
    setConfigTab: vi.fn(),
    startOAuthLogin: vi.fn(),
    handleOAuthLogout: vi.fn(),
    canAdvanceOnboarding: true,
    isOnboardingActive: false,
  }),
  useResponsiveGrid: () => ({ gridColCount: 3, isCompactCards: false, isMobile: false }),
  useEntityHelpers: () => ({
    getS: vi.fn(() => ''),
    getA: vi.fn(() => ''),
    getEntityImageUrl: vi.fn(() => ''),
    callService: vi.fn(),
    isSonosActive: vi.fn(() => false),
    isMediaActive: vi.fn(() => false),
    hvacMap: {},
    fanMap: {},
    swingMap: {},
  }),
  usePageManagement: () => ({
    newPageLabel: '',
    setNewPageLabel: vi.fn(),
    newPageIcon: null,
    setNewPageIcon: vi.fn(),
    editingPage: null,
    setEditingPage: vi.fn(),
    createPage: vi.fn(),
    createMediaPage: vi.fn(),
    deletePage: vi.fn(),
    removeCard: vi.fn(),
  }),
  useDashboardEffects: () => ({
    now: new Date('2026-01-01T00:00:00Z'),
    mediaTick: 0,
    optimisticLightBrightness: {},
    setOptimisticLightBrightness: vi.fn(),
  }),
  usePageRouting: () => ({ activePage: 'home', setActivePage: mockFns.setActivePage }),
  useCardRendering: () => ({
    renderCard: vi.fn(),
    gridLayout: {},
    draggingId: null,
    touchPath: null,
  }),
  useSettingsAccessControl: () => ({
    showPinLockModal: false,
    pinLockError: '',
    requestSettingsAccess: mockFns.requestSettingsAccess,
    handlePinSubmit: vi.fn(),
    closePinLockModal: vi.fn(),
  }),
  usePopupTriggers: vi.fn(),
  useDashboardStateCoordinator: () => ({
    popupModalActions: {},
    updateCount: 0,
    resetToHome: vi.fn(),
    pageDefaults: { home: { label: 'Home' } },
    pages: [
      { id: 'home', label: 'Home' },
      { id: 'kitchen', label: 'kitchen' },
    ],
    getCardSettingsKey: (cardId, pageId = 'home') => `${pageId}::${cardId}`,
    isCardRemovable: vi.fn(() => true),
    isCardHiddenByLogic: vi.fn(() => false),
    isMediaPage: vi.fn(() => false),
    hasEnabledPopupTriggers: false,
  }),
  useGuardedUiActions: (deps) => ({
    guardedSetShowEditCardModal: vi.fn(),
    guardedSetEditMode: (nextValue) => {
      const resolved = typeof nextValue === 'function' ? nextValue(deps.editMode) : nextValue;
      if (!resolved) {
        deps.setEditMode(false);
        return;
      }
      deps.requestSettingsAccess(() => {
        deps.setEditMode(true);
      });
    },
    guardedSetShowAddCardModal: (show) => {
      if (!show) {
        deps.setShowAddCardModal(false);
        return;
      }
      deps.requestSettingsAccess(() => {
        deps.setShowAddCardModal(true);
      });
    },
    guardedSetShowConfigModal: vi.fn(),
    guardedSetShowThemeSidebar: vi.fn(),
    guardedSetShowLayoutSidebar: vi.fn(),
    guardedSetShowHeaderEditModal: vi.fn(),
    guardedToggleCardVisibility: vi.fn(),
    guardedRemoveCard: vi.fn(),
  }),
  useAppViewModels: () => ({
    dashboardGridPage: {},
    dashboardGridMedia: {},
    dashboardGridGrid: {},
    dashboardGridCards: {},
    dashboardGridActions: {},
    modalManagerCore: {},
    modalManagerState: {},
    modalManagerAppearance: {},
    modalManagerLayout: {},
    modalManagerOnboarding: {},
    modalManagerPageManagement: {},
    modalManagerEntityHelpers: {},
    modalManagerAddCard: {},
    modalManagerCardConfig: {},
  }),
}));

describe('AppContent orchestration flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFns.requestSettingsAccess.mockImplementation((callback) => callback());
  });

  it('handles modal open/close, page switch, and edit guard in one flow', () => {
    render(<AppContent showOnboarding={false} setShowOnboarding={vi.fn()} />);

    fireEvent.click(screen.getByTestId('page-switch'));
    fireEvent.click(screen.getByTestId('edit-on'));
    fireEvent.click(screen.getByTestId('modal-open'));
    fireEvent.click(screen.getByTestId('modal-close'));

    expect(mockFns.setActivePage).toHaveBeenCalledWith('kitchen');
    expect(mockFns.requestSettingsAccess).toHaveBeenCalledTimes(2);
    expect(mockFns.setEditMode).toHaveBeenCalledWith(true);
    expect(mockFns.setShowAddCardModal).toHaveBeenCalledWith(true);
    expect(mockFns.setShowAddCardModal).toHaveBeenCalledWith(false);
  });
});
