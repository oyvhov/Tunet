/**
 * @typedef {Object} HomeAssistantConfig
 * @property {string} url
 * @property {string} fallbackUrl
 * @property {string} token
 * @property {string} authMethod
 * @property {boolean} [isIngress]
 */

/**
 * @typedef {Object} ConfigProviderProps
 * @property {import('react').ReactNode} children
 */

/**
 * @typedef {Object<string, { state?: string, attributes?: Record<string, unknown> }>} EntityMap
 */

/**
 * @typedef {Object} ConfigContextValue
 * @property {string} currentTheme
 * @property {import('react').Dispatch<import('react').SetStateAction<string>>} setCurrentTheme
 * @property {() => void} toggleTheme
 * @property {string} language
 * @property {import('react').Dispatch<import('react').SetStateAction<string>>} setLanguage
 * @property {'follow_ha' | 'metric' | 'imperial'} unitsMode
 * @property {import('react').Dispatch<import('react').SetStateAction<'follow_ha' | 'metric' | 'imperial'>>} setUnitsMode
 * @property {boolean} settingsLockEnabled
 * @property {boolean} settingsLockSessionUnlocked
 * @property {(pin: string) => void} enableSettingsLock
 * @property {() => void} disableSettingsLock
 * @property {(pin: string) => boolean} unlockSettingsLock
 * @property {() => void} lockSettingsSession
 * @property {number} inactivityTimeout
 * @property {import('react').Dispatch<import('react').SetStateAction<number>>} setInactivityTimeout
 * @property {string} bgMode
 * @property {import('react').Dispatch<import('react').SetStateAction<string>>} setBgMode
 * @property {string} bgColor
 * @property {import('react').Dispatch<import('react').SetStateAction<string>>} setBgColor
 * @property {string} bgGradient
 * @property {import('react').Dispatch<import('react').SetStateAction<string>>} setBgGradient
 * @property {string} bgImage
 * @property {import('react').Dispatch<import('react').SetStateAction<string>>} setBgImage
 * @property {number} cardTransparency
 * @property {import('react').Dispatch<import('react').SetStateAction<number>>} setCardTransparency
 * @property {number} cardBorderOpacity
 * @property {import('react').Dispatch<import('react').SetStateAction<number>>} setCardBorderOpacity
 * @property {string} cardBgColor
 * @property {import('react').Dispatch<import('react').SetStateAction<string>>} setCardBgColor
 * @property {HomeAssistantConfig} config
 * @property {import('react').Dispatch<import('react').SetStateAction<HomeAssistantConfig>>} setConfig
 */

/**
 * @typedef {Object} HomeAssistantProviderProps
 * @property {import('react').ReactNode} children
 * @property {HomeAssistantConfig} config
 */

/**
 * @typedef {Object} HomeAssistantContextValue
 * @property {EntityMap} entities
 * @property {boolean} connected
 * @property {boolean} haUnavailable
 * @property {boolean} haUnavailableVisible
 * @property {boolean} oauthExpired
 * @property {unknown} conn
 * @property {string} activeUrl
 * @property {Record<string, unknown> | null} haConfig
 * @property {import('react').MutableRefObject<unknown>} authRef
 * @property {{ id?: string, name?: string, is_owner?: boolean, is_admin?: boolean } | null} haUser
 */

/**
 * @typedef {Object} UseConnectionSetupDeps
 * @property {HomeAssistantConfig} config
 * @property {import('react').Dispatch<import('react').SetStateAction<HomeAssistantConfig>>} setConfig
 * @property {boolean} connected
 * @property {boolean} showOnboarding
 * @property {import('react').Dispatch<import('react').SetStateAction<boolean>>} setShowOnboarding
 * @property {boolean} showConfigModal
 * @property {import('react').Dispatch<import('react').SetStateAction<boolean>>} setShowConfigModal
 * @property {(key: string) => string} t
 */

/**
 * @typedef {Object} ConnectionTestResult
 * @property {boolean} success
 * @property {string} message
 */

/**
 * @typedef {Object} UseConnectionSetupResult
 * @property {number} onboardingStep
 * @property {import('react').Dispatch<import('react').SetStateAction<number>>} setOnboardingStep
 * @property {string} onboardingUrlError
 * @property {import('react').Dispatch<import('react').SetStateAction<string>>} setOnboardingUrlError
 * @property {string} onboardingTokenError
 * @property {import('react').Dispatch<import('react').SetStateAction<string>>} setOnboardingTokenError
 * @property {boolean} testingConnection
 * @property {() => Promise<void>} testConnection
 * @property {ConnectionTestResult | null} connectionTestResult
 * @property {import('react').Dispatch<import('react').SetStateAction<ConnectionTestResult | null>>} setConnectionTestResult
 * @property {string} configTab
 * @property {import('react').Dispatch<import('react').SetStateAction<string>>} setConfigTab
 * @property {() => void} startOAuthLogin
 * @property {() => void} handleOAuthLogout
 * @property {boolean} canAdvanceOnboarding
 * @property {boolean} isOnboardingActive
 */

/**
 * @typedef {{ pages: string[], header: string[] } & Record<string, unknown>} PagesConfig
 */

/**
 * @typedef {Object} VisibilityCondition
 * @property {'state' | 'not_state' | 'numeric' | 'attribute'} [type]
 * @property {string[]} [states]
 * @property {'>' | '<' | '>=' | '<=' | '=='} [operator]
 * @property {string | number} [value]
 * @property {string} [attribute]
 * @property {number} [forSeconds]
 * @property {string} [entityId]
 * @property {'AND' | 'OR'} [logic]
 * @property {boolean} [enabled]
 * @property {VisibilityCondition[]} [rules]
 */

/**
 * @typedef {Record<string, Record<string, unknown>>} CardSettingsMap
 */

/**
 * @typedef {Record<string, Record<string, unknown>>} PageSettingsMap
 */

/**
 * @typedef {Object} SectionSpacing
 * @property {number} headerToStatus
 * @property {number} statusToNav
 * @property {number} navToGrid
 */

/**
 * @typedef {Object} HeaderSettings
 * @property {boolean} showTitle
 * @property {boolean} showClock
 * @property {boolean} showClockOnMobile
 * @property {boolean} showDate
 */

/**
 * @typedef {Object} PageProviderProps
 * @property {import('react').ReactNode} children
 */

/**
 * @typedef {Object} PageContextValue
 * @property {PagesConfig} pagesConfig
 * @property {import('react').Dispatch<import('react').SetStateAction<PagesConfig>>} setPagesConfig
 * @property {(newConfig: PagesConfig) => void} persistConfig
 * @property {CardSettingsMap} cardSettings
 * @property {import('react').Dispatch<import('react').SetStateAction<CardSettingsMap>>} setCardSettings
 * @property {(id: string, setting: string, value: unknown) => void} saveCardSetting
 * @property {Record<string, string>} customNames
 * @property {(id: string, name: string) => void} saveCustomName
 * @property {Record<string, string>} customIcons
 * @property {(id: string, iconName: string) => void} saveCustomIcon
 * @property {string[]} hiddenCards
 * @property {(cardId: string) => void} toggleCardVisibility
 * @property {PageSettingsMap} pageSettings
 * @property {import('react').Dispatch<import('react').SetStateAction<PageSettingsMap>>} setPageSettings
 * @property {(newSettings: PageSettingsMap) => void} persistPageSettings
 * @property {(newNames: Record<string, string>) => void} persistCustomNames
 * @property {(newIcons: Record<string, string>) => void} persistCustomIcons
 * @property {(newHidden: string[]) => void} persistHiddenCards
 * @property {(id: string, setting: string, value: unknown) => void} savePageSetting
 * @property {number} gridColumns
 * @property {(val: number) => void} setGridColumns
 * @property {boolean} dynamicGridColumns
 * @property {(val: boolean) => void} setDynamicGridColumns
 * @property {number} headerScale
 * @property {(newScale: number) => void} updateHeaderScale
 * @property {string} headerTitle
 * @property {(newTitle: string) => void} updateHeaderTitle
 * @property {HeaderSettings} headerSettings
 * @property {(newSettings: HeaderSettings) => void} updateHeaderSettings
 * @property {SectionSpacing} sectionSpacing
 * @property {(partial: Partial<SectionSpacing>) => void} updateSectionSpacing
 * @property {(newSettings: CardSettingsMap) => void} persistCardSettings
 * @property {number} gridGapH
 * @property {(val: number) => void} setGridGapH
 * @property {number} gridGapV
 * @property {(val: number) => void} setGridGapV
 * @property {unknown[]} statusPillsConfig
 * @property {(newConfig: unknown[]) => void} saveStatusPillsConfig
 * @property {number} cardBorderRadius
 * @property {(val: number) => void} setCardBorderRadius
 */

/**
 * @typedef {Object} UsePageManagementDeps
 * @property {PagesConfig} pagesConfig
 * @property {(newConfig: PagesConfig) => void} persistConfig
 * @property {PageSettingsMap} pageSettings
 * @property {(newSettings: PageSettingsMap) => void} persistPageSettings
 * @property {(id: string, setting: string, value: unknown) => void} savePageSetting
 * @property {Record<string, { label?: string }>} pageDefaults
 * @property {string} activePage
 * @property {(pageId: string) => void} setActivePage
 * @property {boolean} showAddPageModal
 * @property {(show: boolean) => void} setShowAddPageModal
 * @property {(key: string) => string} t
 */

/**
 * @typedef {Object} UsePageManagementResult
 * @property {string} newPageLabel
 * @property {(value: string) => void} setNewPageLabel
 * @property {string | null} newPageIcon
 * @property {(value: string | null) => void} setNewPageIcon
 * @property {string | null} editingPage
 * @property {(value: string | null) => void} setEditingPage
 * @property {() => void} createPage
 * @property {() => void} createMediaPage
 * @property {(pageId: string) => void} deletePage
 * @property {(cardId: string, listName?: string) => void} removeCard
 */

/**
 * @typedef {Object} UseAddCardDeps
 * @property {boolean} showAddCardModal
 * @property {string} activePage
 * @property {(pageId: string) => boolean} isMediaPage
 * @property {PagesConfig} pagesConfig
 * @property {(newConfig: PagesConfig) => void} persistConfig
 * @property {CardSettingsMap} cardSettings
 * @property {(newSettings: CardSettingsMap) => void} persistCardSettings
 * @property {(cardId: string) => string} getCardSettingsKey
 * @property {(id: string, setting: string, value: unknown) => void} saveCardSetting
 * @property {(show: boolean) => void} setShowAddCardModal
 * @property {(show: boolean) => void} setShowEditCardModal
 * @property {(key: string | null) => void} setEditCardSettingsKey
 * @property {(key: string) => string} t
 */

/**
 * @typedef {Object} UseAddCardResult
 * @property {string} addCardTargetPage
 * @property {(value: string) => void} setAddCardTargetPage
 * @property {string} addCardType
 * @property {(value: string) => void} setAddCardType
 * @property {string} searchTerm
 * @property {(value: string) => void} setSearchTerm
 * @property {string[]} selectedEntities
 * @property {(value: string[]) => void} setSelectedEntities
 * @property {string | null} selectedWeatherId
 * @property {(value: string | null) => void} setSelectedWeatherId
 * @property {string | null} selectedTempId
 * @property {(value: string | null) => void} setSelectedTempId
 * @property {string | null} selectedAndroidTVMediaId
 * @property {(value: string | null) => void} setSelectedAndroidTVMediaId
 * @property {string | null} selectedAndroidTVRemoteId
 * @property {(value: string | null) => void} setSelectedAndroidTVRemoteId
 * @property {string | null} selectedCostTodayId
 * @property {(value: string | null) => void} setSelectedCostTodayId
 * @property {string | null} selectedCostMonthId
 * @property {(value: string | null) => void} setSelectedCostMonthId
 * @property {string} costSelectionTarget
 * @property {(value: string) => void} setCostSelectionTarget
 * @property {string | null} selectedNordpoolId
 * @property {(value: string | null) => void} setSelectedNordpoolId
 * @property {number} nordpoolDecimals
 * @property {(value: number) => void} setNordpoolDecimals
 * @property {string} selectedSpacerVariant
 * @property {(value: string) => void} setSelectedSpacerVariant
 * @property {() => void} onAddSelected
 * @property {() => string} getAddCardAvailableLabel
 * @property {() => string} getAddCardNoneLeftLabel
 */

/**
 * @typedef {Object} ResponsiveGridResult
 * @property {number} gridColCount
 * @property {boolean} isCompactCards
 * @property {boolean} isMobile
 */

/**
 * @typedef {Object} ModalState
 * @property {string | null} showNordpoolModal
 * @property {string | null} showCostModal
 * @property {string | null} activeClimateEntityModal
 * @property {string | null} showLightModal
 * @property {string | null} activeCarModal
 * @property {string | null} showPersonModal
 * @property {string | null} showAndroidTVModal
 * @property {string | null} showVacuumModal
 * @property {string | null} showFanModal
 * @property {string | null} showSensorInfoModal
 * @property {string | null} showCalendarModal
 * @property {string | null} showTodoModal
 * @property {string | null} showRoomModal
 * @property {string | null} showCoverModal
 * @property {string | null} showCameraModal
 * @property {string | null} showWeatherModal
 * @property {string | null} showAlarmModal
 * @property {{ cardId: string, actionKey: string } | null} showAlarmActionModal
 * @property {string | null} activeMediaModal
 * @property {string | null} activeMediaGroupKey
 * @property {string[] | null} activeMediaGroupIds
 * @property {string[] | null} activeMediaSessionSensorIds
 * @property {string | null} activeMediaId
 * @property {boolean} showAddCardModal
 * @property {boolean} showConfigModal
 * @property {boolean} showAddPageModal
 * @property {boolean} showHeaderEditModal
 * @property {string | null} showEditCardModal
 * @property {boolean} showStatusPillsConfig
 */

/**
 * @typedef {Object} ModalSetters
 * @property {(value: string | null) => void} setShowNordpoolModal
 * @property {(value: string | null) => void} setShowCostModal
 * @property {(value: string | null) => void} setActiveClimateEntityModal
 * @property {(value: string | null) => void} setShowLightModal
 * @property {(value: string | null) => void} setActiveCarModal
 * @property {(value: string | null) => void} setShowPersonModal
 * @property {(value: string | null) => void} setShowAndroidTVModal
 * @property {(value: string | null) => void} setShowVacuumModal
 * @property {(value: string | null) => void} setShowFanModal
 * @property {(value: string | null) => void} setShowSensorInfoModal
 * @property {(value: string | null) => void} setShowCalendarModal
 * @property {(value: string | null) => void} setShowTodoModal
 * @property {(value: string | null) => void} setShowRoomModal
 * @property {(value: string | null) => void} setShowCoverModal
 * @property {(value: string | null) => void} setShowCameraModal
 * @property {(value: string | null) => void} setShowWeatherModal
 * @property {(value: string | null) => void} setShowAlarmModal
 * @property {(value: { cardId: string, actionKey: string } | null) => void} setShowAlarmActionModal
 * @property {(value: string | null) => void} setActiveMediaModal
 * @property {(value: string | null) => void} setActiveMediaGroupKey
 * @property {(value: string[] | null) => void} setActiveMediaGroupIds
 * @property {(value: string[] | null) => void} setActiveMediaSessionSensorIds
 * @property {(value: string | null) => void} setActiveMediaId
 * @property {(value: boolean) => void} setShowAddCardModal
 * @property {(value: boolean) => void} setShowConfigModal
 * @property {(value: boolean) => void} setShowAddPageModal
 * @property {(value: boolean) => void} setShowHeaderEditModal
 * @property {(value: string | null) => void} setShowEditCardModal
 * @property {(value: boolean) => void} setShowStatusPillsConfig
 */

/**
 * @typedef {ModalState & ModalSetters & {
 *   hasOpenModal: () => boolean,
 *   closeAllModals: () => void,
 * }} UseModalsResult
 */

/**
 * @typedef {Object} UseDashboardEffectsDeps
 * @property {string} resolvedHeaderTitle
 * @property {number} inactivityTimeout
 * @property {() => void} resetToHome
 * @property {string | null} activeMediaModal
 * @property {EntityMap} entities
 */

/**
 * @typedef {Object} UseDashboardEffectsResult
 * @property {Date} now
 * @property {number} mediaTick
 * @property {Record<string, number>} optimisticLightBrightness
 * @property {import('react').Dispatch<import('react').SetStateAction<Record<string, number>>>} setOptimisticLightBrightness
 */

/**
 * @typedef {Object} AppContentProps
 * @property {boolean} showOnboarding
 * @property {import('react').Dispatch<import('react').SetStateAction<boolean>>} setShowOnboarding
 */

export {};
