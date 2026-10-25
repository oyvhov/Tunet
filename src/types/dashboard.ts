import type { CSSProperties, Dispatch, MutableRefObject, ReactNode, SetStateAction } from 'react';
import type { Connection } from 'home-assistant-js-websocket';
import type { HassConfig, HassEntity, Translate } from './ha';
import type { UnitsMode } from '../utils/units';
import type { PageSettingsEntry } from '../utils/cardUtils';
import type { IconComponent } from '../icons/iconMap';

export interface HomeAssistantConfig {
  url: string;
  fallbackUrl: string;
  token: string;
  authMethod: string;
  isIngress?: boolean;
  /** Ingress panel that can reuse the surrounding Home Assistant frontend's session. */
  haSession?: boolean;
}

export interface ConfigProviderProps {
  children: ReactNode;
}

export type EntityMap = Record<
  string,
  { state?: string; entity_id?: string; attributes?: HassEntity['attributes'] }
>;

export interface ConfigContextValue {
  currentTheme: string;
  setCurrentTheme: Dispatch<SetStateAction<string>>;
  toggleTheme: () => void;
  language: string;
  setLanguage: Dispatch<SetStateAction<string>>;
  unitsMode: UnitsMode;
  setUnitsMode: Dispatch<SetStateAction<UnitsMode>>;
  settingsLockEnabled: boolean;
  settingsLockSessionUnlocked: boolean;
  enableSettingsLock: (pin: string) => void;
  disableSettingsLock: () => void;
  unlockSettingsLock: (pin: string) => boolean;
  lockSettingsSession: () => void;
  inactivityTimeout: number;
  setInactivityTimeout: Dispatch<SetStateAction<number>>;
  bgMode: string;
  setBgMode: Dispatch<SetStateAction<string>>;
  bgColor: string;
  setBgColor: Dispatch<SetStateAction<string>>;
  bgGradient: string;
  setBgGradient: Dispatch<SetStateAction<string>>;
  bgImage: string;
  setBgImage: Dispatch<SetStateAction<string>>;
  cardTransparency: number;
  setCardTransparency: Dispatch<SetStateAction<number>>;
  cardBorderOpacity: number;
  setCardBorderOpacity: Dispatch<SetStateAction<number>>;
  cardBgColor: string;
  setCardBgColor: Dispatch<SetStateAction<string>>;
  cardMaterial: string;
  setCardMaterial: Dispatch<SetStateAction<string>>;
  density: string;
  setDensity: Dispatch<SetStateAction<string>>;
  cardScale: number;
  setCardScale: Dispatch<SetStateAction<number>>;
  appFont: string;
  setAppFont: Dispatch<SetStateAction<string>>;
  config: HomeAssistantConfig;
  setConfig: Dispatch<SetStateAction<HomeAssistantConfig>>;
}

export interface HomeAssistantProviderProps {
  children: ReactNode;
  config: HomeAssistantConfig;
}

export interface HomeAssistantContextValue {
  entities: EntityMap;
  connected: boolean;
  haUnavailable: boolean;
  haUnavailableVisible: boolean;
  entitiesLoaded: boolean;
  entityDataStale: boolean;
  oauthExpired: boolean;
  conn: Connection | null;
  activeUrl: string;
  // get_config result; older HA versions expose the unit fields at the top level.
  haConfig: (HassConfig & { temperature_unit?: string; length_unit?: string }) | null;
  lastEntityUpdateAt: number;
  disconnectedSince: number | null;
  authRef: MutableRefObject<unknown>;
  haUser: { id?: string; name?: string; is_owner?: boolean; is_admin?: boolean } | null;
}

export interface UseConnectionSetupDeps {
  config: HomeAssistantConfig;
  setConfig: Dispatch<SetStateAction<HomeAssistantConfig>>;
  connected: boolean;
  showOnboarding: boolean;
  setShowOnboarding: Dispatch<SetStateAction<boolean>>;
  showConfigModal: boolean;
  setShowConfigModal: Dispatch<SetStateAction<boolean>>;
  t: Translate;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export interface UseConnectionSetupResult {
  onboardingStep: number;
  setOnboardingStep: Dispatch<SetStateAction<number>>;
  onboardingUrlError: string;
  setOnboardingUrlError: Dispatch<SetStateAction<string>>;
  onboardingTokenError: string;
  setOnboardingTokenError: Dispatch<SetStateAction<string>>;
  testingConnection: boolean;
  testConnection: () => Promise<void>;
  connectionTestResult: ConnectionTestResult | null;
  setConnectionTestResult: Dispatch<SetStateAction<ConnectionTestResult | null>>;
  configTab: string;
  setConfigTab: Dispatch<SetStateAction<string>>;
  startOAuthLogin: (url?: string) => void;
  handleOAuthLogout: () => void;
  canAdvanceOnboarding: boolean;
  isOnboardingActive: boolean;
}

export type PagesConfig = { pages: string[]; header: string[] } & Record<string, unknown>;

export interface VisibilityCondition {
  type?: 'state' | 'not_state' | 'numeric' | 'attribute';
  states?: string[];
  operator?: '>' | '<' | '>=' | '<=' | '==';
  value?: string | number;
  attribute?: string;
  forSeconds?: number;
  entityId?: string;
  logic?: 'AND' | 'OR';
  enabled?: boolean;
  rules?: VisibilityCondition[];
}

export type CardSettingsMap = Record<string, Record<string, unknown>>;

export interface SensorCardAction {
  type?:
    | 'auto'
    | 'more-info'
    | 'toggle'
    | 'turn_on'
    | 'turn_off'
    | 'scene'
    | 'script'
    | 'press'
    | 'service'
    | 'none';
  entityId?: string;
  service?: string;
  targetMode?: 'entity' | 'none';
  data?: Record<string, unknown>;
  label?: string | null;
  labelOn?: string | null;
  labelOff?: string | null;
  icon?: string | null;
  trigger?: 'button' | 'icon' | 'card';
}

export interface SensorCardSettings {
  type?: 'sensor';
  entityId?: string;
  size?: 'small' | 'large';
  mobileWidth?: 'auto' | 'compact' | 'full';
  sensorStatusMode?: 'auto' | 'text' | 'entity' | 'attribute' | 'hidden' | null;
  sensorStatusText?: string | null;
  sensorStatusEntityId?: string | null;
  sensorStatusAttribute?: string | null;
  sensorAction?: SensorCardAction | null;
}

export interface PageSettings extends PageSettingsEntry {
  label?: string;
  icon?: string | null;
  hidden?: boolean;
  hideSinglePagePill?: boolean;
  gridColumns?: number;
}

export type PageSettingsMap = Record<string, PageSettings>;

export interface SectionSpacing {
  headerToStatus: number;
  statusToNav: number;
  navToGrid: number;
}

export interface HeaderSettings {
  showTitle: boolean;
  showClock: boolean;
  showClockOnMobile: boolean;
  showDate: boolean;
  showPagePillLabelsOnMobile?: boolean;
  headerStyle?: string;
  batteryVariant?: string;
  showBatteryNub?: boolean;
  navStyle?: 'pill' | 'segmented' | 'underline' | 'minimal' | 'expand';
  navSize?: 'sm' | 'md' | 'lg';
  navActiveAccent?: boolean;
  navShowIcons?: boolean;
  navUppercase?: boolean;
  mobileAlignment: 'left' | 'center' | 'right';
}

export interface StatusPillConfig {
  id: string;
  /** 'alarm' | 'media_player' | 'emby' | 'sonos' | 'sensor' etc. */
  type: string;
  visible?: boolean;
  clickable?: boolean;
  entityId?: string;
  mediaFilter?: string;
  mediaFilterMode?: string;
  mediaEntityIds?: string[];
  showCount?: boolean;
  groupPreset?: string;
  groupSelectionMode?: string;
  groupEntityIds?: string[];
  hideWhenEmpty?: boolean;
  mediaSelectionMode?: string;
  sonosHeadingSource?: string;
  sonosSubheadingSource?: string;
  playerNameDisplayFilter?: string;
  sessionSensorIds?: string[];
  icon?: string;
  iconBgColor?: string;
  iconColor?: string;
  animated?: boolean;
  showLabel?: boolean;
  showSublabel?: boolean;
  showCover?: boolean;
  decimals?: number | null;
  conditionEnabled?: boolean;
}

export interface PageProviderProps {
  children: ReactNode;
}

export interface PageContextValue {
  duplicateCard: (cardId: string, pageId?: string) => string | null;
  pagesConfig: PagesConfig;
  setPagesConfig: Dispatch<SetStateAction<PagesConfig>>;
  persistConfig: (newConfig: PagesConfig) => void;
  cardSettings: CardSettingsMap;
  setCardSettings: Dispatch<SetStateAction<CardSettingsMap>>;
  saveCardSetting: (id: string, setting: string, value: unknown) => void;
  customNames: Record<string, string>;
  saveCustomName: (id: string, name: string) => void;
  customIcons: Record<string, string>;
  saveCustomIcon: (id: string, iconName: string) => void;
  hiddenCards: string[];
  toggleCardVisibility: (cardId: string) => void;
  pageSettings: PageSettingsMap;
  setPageSettings: Dispatch<SetStateAction<PageSettingsMap>>;
  persistPageSettings: (newSettings: PageSettingsMap) => void;
  persistCustomNames: (newNames: Record<string, string>) => void;
  persistCustomIcons: (newIcons: Record<string, string>) => void;
  persistHiddenCards: (newHidden: string[]) => void;
  savePageSetting: (id: string, setting: string, value: unknown) => void;
  gridColumns: number;
  setGridColumns: (val: number) => void;
  dynamicGridColumns: boolean;
  setDynamicGridColumns: (val: boolean) => void;
  headerScale: number;
  updateHeaderScale: (newScale: number) => void;
  headerTitle: string;
  updateHeaderTitle: (newTitle: string) => void;
  headerSettings: HeaderSettings;
  updateHeaderSettings: (newSettings: HeaderSettings) => void;
  sectionSpacing: SectionSpacing;
  updateSectionSpacing: (partial: Partial<SectionSpacing>) => void;
  cardsOnlyMode: boolean;
  updateCardsOnlyMode: (nextValue: boolean) => void;
  persistCardSettings: (newSettings: CardSettingsMap) => void;
  gridGapH: number;
  setGridGapH: (val: number) => void;
  gridGapV: number;
  setGridGapV: (val: number) => void;
  statusPillsConfig: StatusPillConfig[];
  saveStatusPillsConfig: (newConfig: StatusPillConfig[]) => void;
  cardBorderRadius: number;
  setCardBorderRadius: (val: number) => void;
}

export interface UsePageManagementDeps {
  pagesConfig: PagesConfig;
  persistConfig: (newConfig: PagesConfig) => void;
  pageSettings: PageSettingsMap;
  persistPageSettings: (newSettings: PageSettingsMap) => void;
  savePageSetting: (id: string, setting: string, value: unknown) => void;
  pageDefaults: Record<string, { label?: string; icon?: IconComponent }>;
  activePage: string;
  setActivePage: (pageId: string) => void;
  showAddPageModal: boolean;
  setShowAddPageModal: (show: boolean) => void;
  showAddCardModal?: boolean;
  setShowAddCardModal?: (show: boolean) => void;
  t: Translate;
}

export interface UsePageManagementResult {
  newPageLabel: string;
  setNewPageLabel: (value: string) => void;
  newPageIcon: string | null;
  setNewPageIcon: (value: string | null) => void;
  editingPage: string | null;
  setEditingPage: (value: string | null) => void;
  createPage: () => void;
  createMediaPage: () => void;
  createSonosPage: () => void;
  createLightsPage: () => void;
  createBatteryPage: () => void;
  createRoomExplorerPage: () => void;
  deletePage: (pageId: string) => void;
  removeCard: (cardId: string, listName?: string) => void;
}

export interface UseAddCardDeps {
  showAddCardModal: boolean;
  activePage: string;
  isMediaPage?: (pageId: string) => boolean;
  isSonosPage?: (pageId: string) => boolean;
  isLightsPage?: (pageId: string) => boolean;
  isBatteryPage?: (pageId: string) => boolean;
  isRoomExplorerPage?: (pageId: string) => boolean;
  pagesConfig: PagesConfig;
  persistConfig: (newConfig: PagesConfig) => void;
  cardSettings: CardSettingsMap;
  persistCardSettings: (newSettings: CardSettingsMap) => void;
  hiddenCards: string[];
  persistHiddenCards: (newHidden: string[]) => void;
  getCardSettingsKey: (cardId: string, pageId?: string) => string;
  saveCardSetting: (id: string, setting: string, value: unknown) => void;
  setShowAddCardModal: (show: boolean) => void;
  setShowEditCardModal: (value: string | null) => void;
  setEditCardSettingsKey: (key: string | null) => void;
  t: Translate;
}

export interface UseAddCardResult {
  addCardTargetPage: string;
  setAddCardTargetPage: (value: string) => void;
  addCardType: string;
  setAddCardType: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedEntities: string[];
  setSelectedEntities: (value: string[]) => void;
  selectedWeatherId: string | null;
  setSelectedWeatherId: (value: string | null) => void;
  selectedTempId: string | null;
  setSelectedTempId: (value: string | null) => void;
  selectedAndroidTVMediaId: string | null;
  setSelectedAndroidTVMediaId: (value: string | null) => void;
  selectedAndroidTVRemoteId: string | null;
  setSelectedAndroidTVRemoteId: (value: string | null) => void;
  selectedAppleTVMediaId: string | null;
  setSelectedAppleTVMediaId: (value: string | null) => void;
  selectedAppleTVRemoteId: string | null;
  setSelectedAppleTVRemoteId: (value: string | null) => void;
  selectedCostTodayId: string | null;
  setSelectedCostTodayId: (value: string | null) => void;
  selectedCostMonthId: string | null;
  setSelectedCostMonthId: (value: string | null) => void;
  costSelectionTarget: string;
  setCostSelectionTarget: (value: string) => void;
  selectedNordpoolId: string | null;
  setSelectedNordpoolId: (value: string | null) => void;
  nordpoolDecimals: number;
  setNordpoolDecimals: (value: number) => void;
  selectedSpacerVariant: string;
  setSelectedSpacerVariant: (value: string) => void;
  onAddSelected: (options?: { spacerVariant?: string }) => void;
  getAddCardAvailableLabel: () => string;
  getAddCardNoneLeftLabel: () => string;
}

export interface ResponsiveGridResult {
  gridColCount: number;
  isCompactCards: boolean;
  isMobile: boolean;
  viewportWidth: number;
}

export interface ModalState {
  showNordpoolModal: string | null;
  showCostModal: string | null;
  activeClimateEntityModal:
    string | { entityId: string; cardId?: string; settingsKey?: string } | null;
  showLightModal: string | null;
  activeCarModal: string | null;
  showPersonModal: string | null;
  showAndroidTVModal: string | null;
  showAppleTVModal: string | null;
  showVacuumModal: boolean | null;
  showMowerModal: boolean | null;
  showFanModal: string | null;
  showSensorInfoModal: string | { entityId: string; cardId?: string } | null;
  showCalendarModal: boolean | null;
  showTodoModal: string | null;
  showRoomModal: string | null;
  showCoverModal: string | null;
  showCameraModal: string | null;
  showWeatherModal: string | null;
  showAlarmModal: string | null;
  showAlarmActionModal: { cardId: string; actionKey: string } | null;
  activeMediaModal: string | null;
  activeMediaGroupKey: string | null;
  activeMediaGroupIds: string[] | null;
  activeMediaSessionSensorIds: string[] | null;
  activeMediaId: string | null;
  showStatusGroupModal: { pill: StatusPillConfig; presetId: string } | null;
  showAddCardModal: boolean;
  showConfigModal: boolean;
  showAddPageModal: boolean;
  showHeaderEditModal: boolean;
  showEditCardModal: string | null;
  showStatusPillsConfig: boolean;
}

export interface ModalSetters {
  setShowNordpoolModal: (value: string | null) => void;
  setShowCostModal: (value: string | null) => void;
  setActiveClimateEntityModal: (value: ModalState['activeClimateEntityModal']) => void;
  setShowLightModal: (value: string | null) => void;
  setActiveCarModal: (value: string | null) => void;
  setShowPersonModal: (value: string | null) => void;
  setShowAndroidTVModal: (value: string | null) => void;
  setShowAppleTVModal: (value: string | null) => void;
  setShowVacuumModal: (value: boolean | null) => void;
  setShowMowerModal: (value: boolean | null) => void;
  setShowFanModal: (value: string | null) => void;
  setShowSensorInfoModal: (value: string | { entityId: string; cardId?: string } | null) => void;
  setShowCalendarModal: (value: boolean | null) => void;
  setShowTodoModal: (value: string | null) => void;
  setShowRoomModal: (value: string | null) => void;
  setShowCoverModal: (value: string | null) => void;
  setShowCameraModal: (value: string | null) => void;
  setShowWeatherModal: (value: string | null) => void;
  setShowAlarmModal: (value: string | null) => void;
  setShowAlarmActionModal: (value: { cardId: string; actionKey: string } | null) => void;
  setActiveMediaModal: (value: string | null) => void;
  setActiveMediaGroupKey: (value: string | null) => void;
  setActiveMediaGroupIds: (value: string[] | null) => void;
  setActiveMediaSessionSensorIds: (value: string[] | null) => void;
  setActiveMediaId: (value: string | null) => void;
  setShowStatusGroupModal: (value: { pill: StatusPillConfig; presetId: string } | null) => void;
  setShowAddCardModal: (value: boolean) => void;
  setShowConfigModal: (value: boolean) => void;
  setShowAddPageModal: (value: boolean) => void;
  setShowHeaderEditModal: (value: boolean) => void;
  setShowEditCardModal: (value: string | null) => void;
  setShowStatusPillsConfig: (value: boolean) => void;
}

export interface EntityModalActions {
  setShowNordpoolModal: (value: string | null) => void;
  setShowCostModal: (value: string | null) => void;
  setActiveClimateEntityModal: (value: ModalState['activeClimateEntityModal']) => void;
  setShowLightModal: (value: string | null) => void;
  setActiveCarModal: (value: string | null) => void;
  setShowPersonModal: (value: string | null) => void;
  setShowAndroidTVModal: (value: string | null) => void;
  setShowAppleTVModal: (value: string | null) => void;
  setShowVacuumModal: (value: boolean | null) => void;
  setShowMowerModal: (value: boolean | null) => void;
  setShowFanModal: (value: string | null) => void;
  setShowSensorInfoModal: (value: string | { entityId: string; cardId?: string } | null) => void;
  setShowCalendarModal: (value: boolean | null) => void;
  setShowTodoModal: (value: string | null) => void;
  setShowRoomModal: (value: string | null) => void;
  setShowCoverModal: (value: string | null) => void;
  setShowCameraModal: (value: string | null) => void;
  setShowWeatherModal: (value: string | null) => void;
  setShowAlarmModal: (value: string | null) => void;
  setShowAlarmActionModal: (value: { cardId: string; actionKey: string } | null) => void;
}

export interface MediaModalActions {
  setActiveMediaModal: (value: string | null) => void;
  setActiveMediaGroupKey: (value: string | null) => void;
  setActiveMediaGroupIds: (value: string[] | null) => void;
  setActiveMediaSessionSensorIds: (value: string[] | null) => void;
  setActiveMediaId: (value: string | null) => void;
}

export interface ManagementModalActions {
  setShowAddCardModal: (value: boolean) => void;
  setShowConfigModal: (value: boolean) => void;
  setShowAddPageModal: (value: boolean) => void;
  setShowHeaderEditModal: (value: boolean) => void;
  setShowEditCardModal: (value: string | null) => void;
  setShowStatusPillsConfig: (value: boolean) => void;
}

export type UseModalsResult = ModalState &
  ModalSetters & {
    entityModalActions: EntityModalActions;
    mediaModalActions: MediaModalActions;
    managementModalActions: ManagementModalActions;
    hasOpenModal: () => boolean;
    closeAllModals: () => void;
  };

export interface UseDashboardEffectsDeps {
  resolvedHeaderTitle: string;
  inactivityTimeout: number;
  resetToHome: () => void;
  activeMediaModal: string | null;
}

export interface UseDashboardEffectsResult {
  now: Date;
  mediaTick: number;
  optimisticLightBrightness: Record<string, number>;
  setOptimisticLightBrightness: Dispatch<SetStateAction<Record<string, number>>>;
}

export interface AppContentProps {
  showOnboarding: boolean;
  setShowOnboarding: Dispatch<SetStateAction<boolean>>;
}

export interface CardBaseProps {
  cardId: string;
  dragProps: Record<string, unknown>;
  controls: ReactNode;
  cardStyle: CSSProperties;
  editMode: boolean;
  isMobile?: boolean;
  entities?: EntityMap;
  customNames?: Record<string, string>;
  customIcons?: Record<string, string>;
  t: Translate;
  onOpen?: (...args: unknown[]) => void;
}
