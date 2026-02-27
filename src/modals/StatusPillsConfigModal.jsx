import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Check,
  ChevronDown,
  ChevronUp,
  Activity,
  Music,
  Clapperboard,
  Speaker,
  Shield,
  getAllIconKeys,
  getIconComponent,
  preloadMdiIcons,
} from '../icons';
import StatusPill from '../components/cards/StatusPill';

/**
 * Modal for configuring status pills in the header
 */
export default function StatusPillsConfigModal({
  show,
  onClose,
  statusPillsConfig = [],
  onSave,
  entities,
  t,
}) {
  const [pills, setPills] = useState([]);
  const [editingPill, setEditingPill] = useState(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [pillSearch, setPillSearch] = useState('');
  const [entitySearch, setEntitySearch] = useState('');
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [dataSourcePreviewSearch, setDataSourcePreviewSearch] = useState('');
  const [showMediaSourcePreviewList, setShowMediaSourcePreviewList] = useState(false);
  const [stateInputValue, setStateInputValue] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [mdiLoadedVersion, setMdiLoadedVersion] = useState(0);
  const [mobilePane, setMobilePane] = useState('list');
  const [isMobile, setIsMobile] = useState(() =>
    globalThis.window === undefined ? false : globalThis.window.innerWidth < 768
  );
  const addMenuRef = useRef(null);
  const iconPickerRef = useRef(null);
  const entityPickerRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(globalThis.window.innerWidth < 768);
    globalThis.window.addEventListener('resize', onResize);
    return () => globalThis.window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        setShowAddMenu(false);
      }
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target)) {
        setShowIconPicker(false);
      }
      if (entityPickerRef.current && !entityPickerRef.current.contains(event.target)) {
        setShowEntityPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (show) {
      setPills(statusPillsConfig.map((p, i) => ({ ...p, id: p.id || `pill_${i}` })));
      setEditingPill(null);
      setMobilePane('list');
      setPillSearch('');
      setEntitySearch('');
      setDataSourcePreviewSearch('');
      setShowMediaSourcePreviewList(false);
      setShowEntityPicker(false);
      setShowIconPicker(false);

      let cancelled = false;
      preloadMdiIcons()
        .then(() => {
          if (!cancelled) setMdiLoadedVersion((prev) => prev + 1);
        })
        .catch(() => {});

      return () => {
        cancelled = true;
      };
    }
  }, [show, statusPillsConfig]);

  if (!show) return null;

  const handleSave = () => {
    const cleaned = pills.map((pill) => ({
      ...pill,
      icon:
        pill.type === 'alarm' ? 'Shield' : typeof pill.icon === 'string' ? pill.icon : 'Activity',
      iconBgColor: pill.type === 'alarm' ? 'rgba(59, 130, 246, 0.2)' : pill.iconBgColor,
      iconColor: pill.type === 'alarm' ? 'text-blue-400' : pill.iconColor,
      conditionEnabled: pill.conditionEnabled === false ? false : pill.conditionEnabled,
      unitSource: pill.unitSource === 'custom' ? 'custom' : 'ha',
      customUnit: typeof pill.customUnit === 'string' ? pill.customUnit : '',
      mediaFilter: typeof pill.mediaFilter === 'string' ? pill.mediaFilter : '',
      mediaFilterMode:
        typeof pill.mediaFilterMode === 'string' ? pill.mediaFilterMode : 'startsWith',
      playerNameDisplayFilter:
        typeof pill.playerNameDisplayFilter === 'string' ? pill.playerNameDisplayFilter : '',
      mediaSelectionMode:
        typeof pill.mediaSelectionMode === 'string' ? pill.mediaSelectionMode : 'filter',
      mediaEntityIds: Array.isArray(pill.mediaEntityIds) ? pill.mediaEntityIds : [],
      sessionSensorIds: Array.isArray(pill.sessionSensorIds) ? pill.sessionSensorIds : [],
      sonosHeadingSource:
        typeof pill.sonosHeadingSource === 'string' ? pill.sonosHeadingSource : 'song',
      sonosSubheadingSource:
        typeof pill.sonosSubheadingSource === 'string'
          ? pill.sonosSubheadingSource
          : 'artist_player',
      labelColor:
        typeof pill.labelColor === 'string' ? pill.labelColor : 'text-[var(--text-primary)]',
      sublabelColor:
        typeof pill.sublabelColor === 'string' ? pill.sublabelColor : 'text-[var(--text-muted)]',
    }));
    onSave(cleaned);
    onClose();
  };

  const addPill = (pillType = 'conditional') => {
    const defaultCondition =
      pillType === 'media_player' || pillType === 'sonos' || pillType === 'emby'
        ? { type: 'state', states: ['playing'] }
        : { type: 'state', states: ['on'] };

    const newPill = {
      id: `pill_${Date.now()}`,
      type: pillType,
      entityId: '',
      label: '',
      sublabel: '',
      icon: pillType === 'emby' ? 'Clapperboard' : pillType === 'alarm' ? 'Shield' : 'Activity',
      bgColor: 'rgba(255, 255, 255, 0.03)',
      iconBgColor: 'rgba(59, 130, 246, 0.1)',
      iconColor: 'text-[var(--accent-color)]',
      labelColor: 'text-[var(--text-primary)]',
      sublabelColor: 'text-[var(--text-muted)]',
      condition: defaultCondition,
      conditionEnabled: false,
      unitSource: 'ha',
      customUnit: '',
      clickable: pillType === 'sonos' || pillType === 'alarm',
      animated: true,
      visible: true,
      showCover: true,
      showCount: pillType === 'sonos',
      mediaFilter: '',
      mediaFilterMode: 'startsWith',
      playerNameDisplayFilter: '',
      mediaSelectionMode: 'filter',
      mediaEntityIds: [],
      sessionSensorIds: [],
      sonosHeadingSource: 'song',
      sonosSubheadingSource: 'artist_player',
    };
    setPills([...pills, newPill]);
    setEditingPill(newPill.id);
    setMobilePane('editor');
  };

  const deletePill = (id) => {
    setPills(pills.filter((p) => p.id !== id));
    if (editingPill === id) {
      setEditingPill(null);
      setMobilePane('list');
    }
  };

  const updatePill = (id, updates) => {
    setPills(pills.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const toggleVisibility = (id) => {
    updatePill(id, { visible: !pills.find((p) => p.id === id)?.visible });
  };

  const getPillTypeLabel = (pillType) => {
    if (pillType === 'conditional') return t('statusPills.typeSensor');
    if (pillType === 'media_player') return t('statusPills.typeMedia');
    if (pillType === 'emby') return t('statusPills.typeEmby');
    if (pillType === 'alarm') {
      const translated = t('statusPills.typeAlarm');
      return translated === 'statusPills.typeAlarm' ? 'Alarm' : translated;
    }
    return t('statusPills.typeSonos');
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleBackdropKeyDown = (event) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  const movePill = (id, direction) => {
    const idx = pills.findIndex((p) => p.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === pills.length - 1) return;

    const newPills = [...pills];
    const [removed] = newPills.splice(idx, 1);
    newPills.splice(direction === 'up' ? idx - 1 : idx + 1, 0, removed);
    setPills(newPills);
  };

  const entityOptions = Object.keys(entities).sort((left, right) => left.localeCompare(right));
  const sessionSensorOptions = entityOptions.filter((id) =>
    Array.isArray(entities[id]?.attributes?.sessions)
  );

  const filteredIcons = getAllIconKeys().filter(
    (name) => mdiLoadedVersion >= 0 && name.toLowerCase().includes(iconSearch.toLowerCase())
  );

  const filteredPills = pills.filter((pill) => {
    if (!pillSearch.trim()) return true;
    const query = pillSearch.toLowerCase();
    const entityLabel = entities[pill.entityId]?.attributes?.friendly_name || '';
    const name = pill.name || pill.label || entityLabel || pill.entityId || '';
    const typeLabel = getPillTypeLabel(pill.type);

    return (
      name.toLowerCase().includes(query) ||
      entityLabel.toLowerCase().includes(query) ||
      String(pill.entityId || '')
        .toLowerCase()
        .includes(query) ||
      String(typeLabel || '')
        .toLowerCase()
        .includes(query)
    );
  });

  const normalizePattern = (pattern) => pattern.trim();

  const wildcardMatch = (value, pattern) => {
    const text = String(value || '').toLowerCase();
    const wildcard = String(pattern || '').toLowerCase();

    let textIndex = 0;
    let wildcardIndex = 0;
    let starIndex = -1;
    let backtrackTextIndex = 0;

    while (textIndex < text.length) {
      if (wildcardIndex < wildcard.length && wildcard[wildcardIndex] === text[textIndex]) {
        wildcardIndex += 1;
        textIndex += 1;
      } else if (wildcardIndex < wildcard.length && wildcard[wildcardIndex] === '*') {
        starIndex = wildcardIndex;
        wildcardIndex += 1;
        backtrackTextIndex = textIndex;
      } else if (starIndex !== -1) {
        wildcardIndex = starIndex + 1;
        backtrackTextIndex += 1;
        textIndex = backtrackTextIndex;
      } else {
        return false;
      }
    }

    while (wildcardIndex < wildcard.length && wildcard[wildcardIndex] === '*') {
      wildcardIndex += 1;
    }

    return wildcardIndex === wildcard.length;
  };

  const matchesMediaFilter = (id, filter, mode) => {
    if (!filter) return true;
    const patterns = filter.split(',').map(normalizePattern).filter(Boolean);
    if (patterns.length === 0) return true;

    return patterns.some((pattern) => {
      if (mode === 'regex') {
        return id.toLowerCase().includes(pattern.toLowerCase());
      }

      if (pattern.includes('*')) {
        return wildcardMatch(id, pattern);
      }

      if (mode === 'contains') return id.toLowerCase().includes(pattern.toLowerCase());
      return id.toLowerCase().startsWith(pattern.toLowerCase());
    });
  };

  const getSafeTranslationText = (key) => String(t(key) || '').replace(/<br\s*\/?\s*>/gi, '\n');

  const colorPresets = [
    {
      name: 'Blue',
      bg: 'rgba(59, 130, 246, 0.3)',
      icon: 'text-[var(--accent-color)]',
      label: t('statusPills.colorBlue'),
    },
    {
      name: 'Green',
      bg: 'rgba(34, 197, 94, 0.3)',
      icon: 'text-green-400',
      label: t('statusPills.colorGreen'),
    },
    {
      name: 'Red',
      bg: 'rgba(239, 68, 68, 0.3)',
      icon: 'text-red-400',
      label: t('statusPills.colorRed'),
    },
    {
      name: 'Orange',
      bg: 'rgba(249, 115, 22, 0.3)',
      icon: 'text-orange-400',
      label: t('statusPills.colorOrange'),
    },
    {
      name: 'Yellow',
      bg: 'rgba(234, 179, 8, 0.3)',
      icon: 'text-yellow-400',
      label: t('statusPills.colorYellow'),
    },
    {
      name: 'Purple',
      bg: 'rgba(168, 85, 247, 0.3)',
      icon: 'text-purple-400',
      label: t('statusPills.colorPurple'),
    },
    {
      name: 'Pink',
      bg: 'rgba(236, 72, 153, 0.3)',
      icon: 'text-pink-400',
      label: t('statusPills.colorPink'),
    },
    {
      name: 'Emerald',
      bg: 'rgba(16, 185, 129, 0.3)',
      icon: 'text-emerald-400',
      label: t('statusPills.colorEmerald'),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={handleBackdropClick}
      onKeyDown={handleBackdropKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Close dialog"
    >
      <div
        className="popup-anim relative flex h-full max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border font-sans shadow-2xl backdrop-blur-xl md:h-[800px] md:max-h-[90vh] md:rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
        }}
      >
        {/* Header */}
        <div className="relative border-b border-[var(--glass-border)] p-5 md:p-6">
          <h2 className="text-center text-2xl font-light tracking-widest text-[var(--text-primary)] uppercase italic">
            {t('statusPills.title')}
          </h2>
          <button
            onClick={onClose}
            className="modal-close absolute top-1/2 right-5 -translate-y-1/2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          {isMobile && (
            <div className="flex items-center gap-2 border-b border-[var(--glass-border)] px-4 pt-3 pb-2">
              <button
                onClick={() => setMobilePane('list')}
                className={`flex-1 rounded-xl py-2 text-xs font-bold tracking-wider uppercase transition-all ${mobilePane === 'list' ? '' : 'border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
                style={
                  mobilePane === 'list'
                    ? {
                        backgroundColor: 'color-mix(in srgb, var(--accent-color) 14%, transparent)',
                        color: 'var(--accent-color)',
                        border:
                          '1px solid color-mix(in srgb, var(--accent-color) 28%, transparent)',
                      }
                    : undefined
                }
              >
                {t('statusPills.yourPills')}
              </button>
              <button
                onClick={() => setMobilePane('editor')}
                className={`flex-1 rounded-xl py-2 text-xs font-bold tracking-wider uppercase transition-all ${mobilePane === 'editor' ? '' : 'border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
                style={
                  mobilePane === 'editor'
                    ? {
                        backgroundColor: 'color-mix(in srgb, var(--accent-color) 14%, transparent)',
                        color: 'var(--accent-color)',
                        border:
                          '1px solid color-mix(in srgb, var(--accent-color) 28%, transparent)',
                      }
                    : undefined
                }
              >
                {t('statusPills.editor') || 'Editor'}
              </button>
            </div>
          )}

          {/* Pills List */}
          <div
            className={`h-[300px] min-h-0 w-full shrink-0 overflow-y-auto border-r-0 border-b border-[var(--glass-border)] p-4 md:h-full md:w-[360px] md:border-r md:border-b-0 ${isMobile && mobilePane !== 'list' ? 'hidden' : ''}`}
          >
            <div className="relative mb-3 flex items-center justify-between" ref={addMenuRef}>
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
                  {t('statusPills.yourPills')}
                </h3>
                <span className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-secondary)]">
                  {pills.length}
                </span>
              </div>
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="rounded-lg p-2 transition-colors"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent-color) 85%, black 15%)',
                  color: '#fff',
                  boxShadow: 'none',
                }}
                title={t('statusPills.addNewPill')}
              >
                <Plus className="h-4 w-4" />
              </button>

              {showAddMenu && (
                <div className="absolute top-full right-0 z-50 mt-2 flex w-48 flex-col overflow-hidden rounded-xl border border-gray-700 bg-[#1e293b] p-1 shadow-xl">
                  <button
                    onClick={() => {
                      addPill('conditional');
                      setShowAddMenu(false);
                    }}
                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-200 transition-colors hover:bg-white/5"
                  >
                    <Activity className="h-4 w-4 text-[var(--accent-color)]" />{' '}
                    {t('statusPills.typeSensor')}
                  </button>
                  <button
                    onClick={() => {
                      addPill('media_player');
                      setShowAddMenu(false);
                    }}
                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-200 transition-colors hover:bg-white/5"
                  >
                    <Music className="h-4 w-4 text-green-400" /> {t('statusPills.typeMedia')}
                  </button>
                  <button
                    onClick={() => {
                      addPill('emby');
                      setShowAddMenu(false);
                    }}
                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-200 transition-colors hover:bg-white/5"
                  >
                    <Clapperboard className="h-4 w-4 text-purple-400" /> {t('statusPills.typeEmby')}
                  </button>
                  <button
                    onClick={() => {
                      addPill('sonos');
                      setShowAddMenu(false);
                    }}
                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-200 transition-colors hover:bg-white/5"
                  >
                    <Speaker className="h-4 w-4 text-orange-400" /> {t('statusPills.typeSonos')}
                  </button>
                  <button
                    onClick={() => {
                      addPill('alarm');
                      setShowAddMenu(false);
                    }}
                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-200 transition-colors hover:bg-white/5"
                  >
                    <Shield className="h-4 w-4 text-red-400" />{' '}
                    {t('statusPills.typeAlarm') === 'statusPills.typeAlarm'
                      ? 'Alarm'
                      : t('statusPills.typeAlarm')}
                  </button>
                </div>
              )}
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={pillSearch}
                onChange={(e) => setPillSearch(e.target.value)}
                placeholder={t('form.search') || 'Search'}
                className="popup-surface w-full rounded-xl border border-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
              />
            </div>

            <div className="space-y-2.5">
              {filteredPills.map((pill) => {
                const Icon = getIconComponent(pill.icon) || getIconComponent('Activity');
                const entity = entities[pill.entityId];
                const isEditing = editingPill === pill.id;
                const itemIndex = pills.findIndex((p) => p.id === pill.id);
                const typeLabel = getPillTypeLabel(pill.type);
                const displayName =
                  pill.name ||
                  pill.label ||
                  entity?.attributes?.friendly_name ||
                  pill.entityId ||
                  t('statusPills.newPill');

                return (
                  <div
                    key={pill.id}
                    className={`rounded-2xl border transition-all ${isEditing ? 'popup-surface border-[var(--accent-color)] shadow-lg ' : 'popup-surface border-transparent hover:border-[var(--glass-border)]'}`}
                  >
                    <button
                      onClick={() => {
                        setEditingPill(isEditing ? null : pill.id);
                        if (!isEditing) setMobilePane('editor');
                      }}
                      className="flex w-full items-start gap-3 p-3 text-left"
                    >
                      <div
                        className={`rounded-xl p-2 ${pill.iconColor} shrink-0`}
                        style={{ backgroundColor: pill.iconBgColor }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                          {displayName}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg)] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[var(--text-secondary)] uppercase">
                            {typeLabel}
                          </span>
                          <span
                            className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${pill.visible === false ? 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)]' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'}`}
                          >
                            {pill.visible === false ? t('statusPills.hide') : t('statusPills.show')}
                          </span>
                          {pill.conditionEnabled !== false && (
                            <span className="rounded-md border border-[var(--accent-color)] bg-[var(--accent-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-color)]">
                              {t('statusPills.conditional')}
                            </span>
                          )}
                        </div>
                        {pill.entityId && (
                          <p className="truncate text-[10px] text-[var(--text-muted)]">
                            {pill.entityId}
                          </p>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-2 px-3 pb-3">
                      <button
                        onClick={() => movePill(pill.id, 'up')}
                        disabled={itemIndex === 0}
                        className="flex flex-1 items-center justify-center rounded-xl bg-[var(--glass-bg)] p-2.5 text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] disabled:cursor-not-allowed disabled:opacity-20"
                        title={t('statusPills.moveUp')}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => movePill(pill.id, 'down')}
                        disabled={itemIndex === pills.length - 1}
                        className="flex flex-1 items-center justify-center rounded-xl bg-[var(--glass-bg)] p-2.5 text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] disabled:cursor-not-allowed disabled:opacity-20"
                        title={t('statusPills.moveDown')}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleVisibility(pill.id)}
                        className="flex items-center justify-center rounded-xl bg-[var(--glass-bg)] p-2.5 transition-all hover:bg-[var(--glass-bg-hover)]"
                        title={pill.visible ? t('statusPills.hide') : t('statusPills.show')}
                      >
                        {pill.visible ? (
                          <Eye className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                      <button
                        onClick={() => deletePill(pill.id)}
                        className="flex items-center justify-center rounded-xl bg-[var(--glass-bg)] p-2.5 text-red-400 transition-all hover:bg-red-500/20"
                        title={t('statusPills.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {pills.length > 0 && filteredPills.length === 0 && (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                  {t('form.noResults') || 'No results'}
                </p>
              )}

              {pills.length === 0 && (
                <p className="py-8 text-center text-sm whitespace-pre-line text-gray-500">
                  {getSafeTranslationText('statusPills.noPillsYet')}
                </p>
              )}
            </div>
          </div>

          {/* Editor */}
          <div
            className={`min-h-0 w-full flex-1 overflow-x-visible overflow-y-auto p-4 md:p-6 ${isMobile && mobilePane !== 'editor' ? 'hidden' : ''}`}
          >
            {editingPill ? (
              (() => {
                const pill = pills.find((p) => p.id === editingPill);
                if (!pill) return null;

                const Icon = getIconComponent(pill.icon) || getIconComponent('Activity');
                const sectionShellClass =
                  'popup-surface rounded-2xl p-4 border border-[var(--glass-border)]/60';
                const previewPill = { ...pill, conditionEnabled: false, visible: true };
                const previewEntity = pill.entityId ? entities[pill.entityId] : null;
                const getPreviewAttribute = (entityId, attributeName) =>
                  entities?.[entityId]?.attributes?.[attributeName];
                const getPreviewImageUrl = (rawUrl) => {
                  if (!rawUrl) return null;
                  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
                  return rawUrl;
                };
                const mediaPlayerIds = entityOptions.filter((id) => id.startsWith('media_player.'));
                const sonosMatchedIds = mediaPlayerIds.filter((id) =>
                  matchesMediaFilter(id, pill.mediaFilter, pill.mediaFilterMode)
                );
                const sonosFilteredIds = mediaPlayerIds.filter(
                  (id) => !matchesMediaFilter(id, pill.mediaFilter, pill.mediaFilterMode)
                );
                const previewQuery = dataSourcePreviewSearch.trim().toLowerCase();
                const sonosPreviewRows = mediaPlayerIds
                  .filter((id) => {
                    if (!previewQuery) return true;
                    const name = (entities[id]?.attributes?.friendly_name || '').toLowerCase();
                    return id.toLowerCase().includes(previewQuery) || name.includes(previewQuery);
                  })
                  .slice(0, 80);
                const sonosMatchedIdSet = new Set(sonosMatchedIds);
                const sonosIncludedPreviewRows = sonosPreviewRows.filter((id) =>
                  sonosMatchedIdSet.has(id)
                );
                const sonosExcludedPreviewRows = sonosPreviewRows.filter(
                  (id) => !sonosMatchedIdSet.has(id)
                );
                const previewMediaIds = (() => {
                  if (pill.type === 'conditional' || pill.type === 'alarm') return [];
                  if (pill.type === 'media_player') {
                    return pill.entityId ? [pill.entityId] : sonosMatchedIds;
                  }
                  if (pill.type === 'sonos') {
                    if (
                      (pill.mediaSelectionMode || 'filter') === 'select' &&
                      Array.isArray(pill.mediaEntityIds) &&
                      pill.mediaEntityIds.length > 0
                    ) {
                      return pill.mediaEntityIds;
                    }
                    return sonosMatchedIds;
                  }
                  if (pill.type === 'emby') {
                    if (
                      (pill.mediaSelectionMode || 'filter') === 'select' &&
                      Array.isArray(pill.mediaEntityIds) &&
                      pill.mediaEntityIds.length > 0
                    ) {
                      return pill.mediaEntityIds;
                    }
                    return sonosMatchedIds;
                  }
                  return [];
                })();
                const previewMediaEntities = previewMediaIds
                  .map((id) => entities[id])
                  .filter(Boolean);
                const previewStatusEntity =
                  pill.type === 'conditional' || pill.type === 'alarm'
                    ? previewEntity
                    : previewMediaEntities;
                const previewIsMediaActive = (mediaEntity) => {
                  if (!mediaEntity?.state) return false;
                  if (mediaEntity.state === 'playing' || mediaEntity.state === 'paused')
                    return true;
                  if (pill.type !== 'sonos') return false;
                  const attrs = mediaEntity.attributes || {};
                  return Boolean(
                    attrs.media_title ||
                    attrs.media_artist ||
                    attrs.media_channel ||
                    attrs.media_album_name ||
                    attrs.entity_picture ||
                    attrs.media_image_url
                  );
                };

                return (
                  <div className="space-y-4 md:space-y-5">
                    {/* Header Section */}
                    <div className={`${sectionShellClass} flex items-start justify-between gap-4`}>
                      <div className="flex-1">
                        <div className="mb-2.5 flex items-center gap-2">
                          <span className="text-xs font-bold tracking-widest text-[var(--accent-color)] uppercase">
                            {getPillTypeLabel(pill.type)}
                          </span>
                          {(pill.type === 'conditional' || pill.type === 'alarm') && (
                            <div className="h-1 w-1 rounded-full bg-gray-500"></div>
                          )}
                          {(pill.type === 'conditional' || pill.type === 'alarm') && (
                            <span className="text-xs text-gray-500">
                              {t('statusPills.standardPill')}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={pill.name || ''}
                          onChange={(e) => updatePill(pill.id, { name: e.target.value })}
                          placeholder={t('statusPills.pillNamePlaceholder')}
                          className="w-full bg-transparent text-xl font-bold text-[var(--text-primary)] outline-none placeholder:text-gray-600"
                        />
                      </div>
                      {/* Live preview */}
                      {(pill.type === 'conditional' ||
                        pill.type === 'media_player' ||
                        pill.type === 'emby' ||
                        pill.type === 'sonos' ||
                        pill.type === 'alarm') && (
                        <div className="shrink-0">
                          <StatusPill
                            pill={previewPill}
                            entity={previewStatusEntity}
                            t={t}
                            getA={getPreviewAttribute}
                            getEntityImageUrl={getPreviewImageUrl}
                            isMediaActive={previewIsMediaActive}
                          />
                        </div>
                      )}
                    </div>

                    {/* Main Configuration Grid */}
                    <div className="grid grid-cols-1 gap-4 md:gap-5">
                      {/* Visuals Group (Only for Conditional) */}
                      {pill.type === 'conditional' && (
                        <section className={`${sectionShellClass} space-y-3`}>
                          <h4 className="text-[11px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                            {t('statusPills.appearance')}
                          </h4>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-600 uppercase">
                                {t('statusPills.heading')}
                              </label>
                              <input
                                type="text"
                                value={pill.label || ''}
                                onChange={(e) => updatePill(pill.id, { label: e.target.value })}
                                placeholder={t('statusPills.automatic')}
                                className="w-full rounded-xl border-0 bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-600 uppercase">
                                {t('statusPills.subtitle')}
                              </label>
                              <input
                                type="text"
                                value={pill.sublabel || ''}
                                onChange={(e) => updatePill(pill.id, { sublabel: e.target.value })}
                                placeholder={t('statusPills.automatic')}
                                className="w-full rounded-xl border-0 bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-600 uppercase">
                                {t('statusPills.unitSource')}
                              </label>
                              <select
                                value={pill.unitSource === 'custom' ? 'custom' : 'ha'}
                                onChange={(e) =>
                                  updatePill(pill.id, { unitSource: e.target.value })
                                }
                                className="w-full rounded-xl border-0 bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                                style={{
                                  backgroundColor: 'var(--glass-bg)',
                                  color: 'var(--text-primary)',
                                }}
                              >
                                <option
                                  value="ha"
                                  style={{
                                    backgroundColor: 'var(--modal-bg)',
                                    color: 'var(--text-primary)',
                                  }}
                                >
                                  {t('statusPills.unitHomeAssistant')}
                                </option>
                                <option
                                  value="custom"
                                  style={{
                                    backgroundColor: 'var(--modal-bg)',
                                    color: 'var(--text-primary)',
                                  }}
                                >
                                  {t('statusPills.unitCustom')}
                                </option>
                              </select>
                            </div>
                          </div>

                          {pill.unitSource === 'custom' && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-600 uppercase">
                                {t('statusPills.unitOverrideLabel')}
                              </label>
                              <input
                                type="text"
                                value={pill.customUnit || ''}
                                onChange={(e) =>
                                  updatePill(pill.id, { customUnit: e.target.value })
                                }
                                placeholder={t('statusPills.unitOverridePlaceholder')}
                                className="w-full rounded-xl border-0 bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                              />
                            </div>
                          )}

                          <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="flex-1 space-y-1">
                              <label className="text-[10px] font-bold text-gray-600 uppercase">
                                {t('statusPills.icon')}
                              </label>
                              <div className="relative" ref={iconPickerRef}>
                                <button
                                  onClick={() => setShowIconPicker(!showIconPicker)}
                                  className="flex w-full items-center justify-between rounded-xl border-0 bg-[var(--glass-bg)] px-3 py-2 text-[var(--text-primary)]"
                                >
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <span className="text-sm">{pill.icon}</span>
                                  </div>
                                  <ChevronDown className="h-4 w-4" />
                                </button>

                                {showIconPicker && (
                                  <div className="mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-[var(--glass-border)] bg-[var(--modal-bg)] p-2 shadow-2xl sm:w-64">
                                    <input
                                      type="text"
                                      placeholder={t('statusPills.searchIcon')}
                                      value={iconSearch}
                                      onChange={(e) => setIconSearch(e.target.value)}
                                      className="mb-2 w-full rounded-lg border-0 bg-[var(--glass-bg)] px-3 py-2 text-[var(--text-primary)] outline-none"
                                    />
                                    <div className="grid grid-cols-5 gap-1">
                                      {filteredIcons.slice(0, 50).map((iconName) => {
                                        const IconComp = getIconComponent(iconName);
                                        return (
                                          <button
                                            key={iconName}
                                            onClick={() => {
                                              updatePill(pill.id, { icon: iconName });
                                              setShowIconPicker(false);
                                              setIconSearch('');
                                            }}
                                            className="flex aspect-square items-center justify-center rounded-lg p-2 hover:bg-[var(--glass-bg-hover)]"
                                            title={iconName}
                                          >
                                            <IconComp className="h-4 w-4" />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <label className="text-[10px] font-bold text-gray-600 uppercase">
                                {t('statusPills.colorLabel')}
                              </label>
                              <div className="no-scrollbar flex h-[38px] items-center gap-1 overflow-x-auto pb-1">
                                {colorPresets.map((preset) => (
                                  <button
                                    key={preset.name}
                                    onClick={() =>
                                      updatePill(pill.id, {
                                        iconBgColor: preset.bg,
                                        iconColor: preset.icon,
                                      })
                                    }
                                    className={`h-8 w-8 flex-shrink-0 rounded-full transition-all hover:scale-110 ${pill.iconBgColor === preset.bg ? 'scale-105 ring-2 ring-white/20' : ''}`}
                                    style={{ backgroundColor: preset.bg }}
                                    title={preset.label}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </section>
                      )}

                      {/* Source Logic */}
                      <section className={`${sectionShellClass} space-y-3`}>
                        <h4 className="text-[11px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                          {pill.type === 'conditional' || pill.type === 'alarm'
                            ? t('statusPills.dataSource')
                            : t('statusPills.mediaPlayerSource')}
                        </h4>

                        {/* Emby/Sonos Source Type Logic */}
                        {(pill.type === 'emby' || pill.type === 'sonos') && (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() =>
                                  updatePill(pill.id, {
                                    mediaSelectionMode: 'select',
                                    mediaFilter: '',
                                    entityId: '',
                                  })
                                }
                                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                                  (pill.mediaSelectionMode || 'filter') === 'select'
                                    ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
                                    : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                                }`}
                              >
                                {t('statusPills.selectSpecificPlayers')}
                              </button>
                              <button
                                onClick={() =>
                                  updatePill(pill.id, {
                                    mediaSelectionMode: 'filter',
                                    mediaEntityIds: [],
                                    entityId: '',
                                  })
                                }
                                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                                  (pill.mediaSelectionMode || 'filter') === 'filter'
                                    ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
                                    : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                                }`}
                              >
                                {t('statusPills.useFilter')}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Emby / Media Player / Sonos Filter Logic */}
                        {((pill.type === 'emby' &&
                          (pill.mediaSelectionMode || 'filter') === 'filter') ||
                          pill.type === 'media_player' ||
                          (pill.type === 'sonos' &&
                            (pill.mediaSelectionMode || 'filter') === 'filter')) && (
                          <div className="space-y-2 rounded-xl bg-[var(--glass-bg)] p-3">
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                              <input
                                type="text"
                                value={pill.mediaFilter || ''}
                                onChange={(e) =>
                                  updatePill(pill.id, {
                                    mediaFilter: e.target.value,
                                    mediaEntityIds: [],
                                    entityId: '',
                                  })
                                }
                                placeholder="media_player_stue*, *"
                                className="w-full rounded-lg border-0 bg-[var(--modal-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none md:col-span-2"
                              />
                              <select
                                value={pill.mediaFilterMode || 'startsWith'}
                                onChange={(e) =>
                                  updatePill(pill.id, { mediaFilterMode: e.target.value })
                                }
                                className="w-full rounded-lg border-0 bg-[var(--modal-bg)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] outline-none"
                              >
                                <option value="startsWith">
                                  {t('statusPills.filterStartsWith')}
                                </option>
                                <option value="contains">{t('statusPills.filterContains')}</option>
                                <option value="regex">{t('statusPills.filterRegex')}</option>
                              </select>
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)]">
                              {t('statusPills.filterHint')}
                            </p>

                            {(pill.type === 'sonos' || pill.type === 'media_player') && (
                              <div className="mt-2 space-y-2 rounded-xl border border-[var(--glass-border)]/60 bg-[var(--modal-bg)] p-2.5">
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                  <span className="rounded-full bg-green-500/15 px-2 py-0.5 font-bold text-green-300">
                                    Included {sonosMatchedIds.length}
                                  </span>
                                  <span className="rounded-full bg-[var(--glass-bg)] px-2 py-0.5 font-bold text-[var(--text-muted)]">
                                    Filtered out {sonosFilteredIds.length}
                                  </span>
                                  <span className="ml-auto font-semibold text-[var(--text-muted)]">
                                    Total {mediaPlayerIds.length}
                                  </span>
                                </div>

                                <input
                                  type="text"
                                  value={dataSourcePreviewSearch}
                                  onChange={(e) => setDataSourcePreviewSearch(e.target.value)}
                                  placeholder="Find player in preview"
                                  className="w-full rounded-lg border-0 bg-[var(--glass-bg)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                                />

                                <button
                                  type="button"
                                  onClick={() => setShowMediaSourcePreviewList((prev) => !prev)}
                                  className="flex w-full items-center justify-between rounded-lg bg-[var(--glass-bg)] px-2.5 py-1.5 text-xs font-bold text-[var(--text-secondary)]"
                                >
                                  <span>
                                    {showMediaSourcePreviewList ? 'Hide list' : 'Show list'}
                                  </span>
                                  {showMediaSourcePreviewList ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </button>

                                {showMediaSourcePreviewList && (
                                  <div className="custom-scrollbar max-h-48 space-y-1 overflow-y-auto rounded-lg bg-[var(--glass-bg)] p-1">
                                    {sonosIncludedPreviewRows.length > 0 && (
                                      <div className="px-2 py-1">
                                        <div className="mb-1 text-[10px] font-bold tracking-wider text-green-300 uppercase">
                                          Included
                                        </div>
                                        <div className="space-y-1">
                                          {sonosIncludedPreviewRows.map((id) => {
                                            const friendlyName =
                                              entities[id]?.attributes?.friendly_name || id;
                                            return (
                                              <div
                                                key={id}
                                                className="flex items-center justify-between gap-2 rounded-md bg-green-500/5 px-2 py-1.5 text-xs text-[var(--text-primary)]"
                                              >
                                                <div className="min-w-0">
                                                  <div className="truncate font-semibold">
                                                    {friendlyName}
                                                  </div>
                                                  <div className="truncate text-[10px] opacity-80">
                                                    {id}
                                                  </div>
                                                </div>
                                                <span className="shrink-0 rounded-full bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-300">
                                                  In
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {sonosExcludedPreviewRows.length > 0 && (
                                      <div className="px-2 py-1">
                                        <div className="mb-1 text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
                                          Filtered out
                                        </div>
                                        <div className="space-y-1">
                                          {sonosExcludedPreviewRows.map((id) => {
                                            const friendlyName =
                                              entities[id]?.attributes?.friendly_name || id;
                                            return (
                                              <div
                                                key={id}
                                                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--text-muted)]"
                                              >
                                                <div className="min-w-0">
                                                  <div className="truncate font-semibold">
                                                    {friendlyName}
                                                  </div>
                                                  <div className="truncate text-[10px] opacity-80">
                                                    {id}
                                                  </div>
                                                </div>
                                                <span className="shrink-0 rounded-full bg-[var(--modal-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                                                  Out
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {sonosPreviewRows.length === 0 && (
                                      <p className="px-2 py-2 text-[10px] text-[var(--text-muted)] italic">
                                        No players match this search.
                                      </p>
                                    )}
                                  </div>
                                )}

                                {mediaPlayerIds.length > sonosPreviewRows.length && (
                                  <p className="px-1 text-[10px] text-[var(--text-muted)]">
                                    Showing first {sonosPreviewRows.length} of{' '}
                                    {mediaPlayerIds.length} players.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Emby/Sonos Multi-Select */}
                        {(pill.type === 'emby' || pill.type === 'sonos') &&
                          (pill.mediaSelectionMode || 'filter') === 'select' && (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={entitySearch}
                                onChange={(e) => setEntitySearch(e.target.value)}
                                placeholder={t('statusPills.searchPlayer')}
                                className="w-full rounded-xl border-0 bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                              />
                              <div className="custom-scrollbar max-h-40 space-y-1 overflow-y-auto rounded-xl bg-[var(--glass-bg)] p-2">
                                {entityOptions
                                  .filter((id) => id.startsWith('media_player.'))
                                  .filter((id) => {
                                    if (!entitySearch) return true;
                                    const search = entitySearch.toLowerCase();
                                    const name = (
                                      entities[id]?.attributes?.friendly_name || ''
                                    ).toLowerCase();
                                    return (
                                      id.toLowerCase().includes(search) || name.includes(search)
                                    );
                                  })
                                  .map((id) => {
                                    const selected =
                                      Array.isArray(pill.mediaEntityIds) &&
                                      pill.mediaEntityIds.includes(id);
                                    return (
                                      <button
                                        key={id}
                                        onClick={() => {
                                          const current = Array.isArray(pill.mediaEntityIds)
                                            ? pill.mediaEntityIds
                                            : [];
                                          const next = current.includes(id)
                                            ? current.filter((x) => x !== id)
                                            : [...current, id];
                                          updatePill(pill.id, {
                                            mediaEntityIds: next,
                                            mediaFilter: '',
                                            entityId: '',
                                            mediaSelectionMode: 'select',
                                          });
                                        }}
                                        className={`w-full rounded-lg px-3 py-1.5 text-left transition-colors ${selected ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
                                      >
                                        <div className="truncate text-xs font-bold">
                                          {entities[id]?.attributes?.friendly_name || id}
                                        </div>
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                        {/* Standard Entity Select (Conditional) */}
                        {(pill.type === 'conditional' || pill.type === 'alarm') && (
                          <div className="relative" ref={entityPickerRef}>
                            <input
                              type="text"
                              value={entitySearch}
                              onChange={(e) => {
                                setEntitySearch(e.target.value);
                                setShowEntityPicker(true);
                              }}
                              onFocus={() => {
                                setEntitySearch('');
                                setShowEntityPicker(true);
                              }}
                              placeholder={
                                pill.entityId
                                  ? entities[pill.entityId]?.attributes?.friendly_name ||
                                    pill.entityId
                                  : t('statusPills.searchEntity')
                              }
                              className="w-full rounded-xl border-0 bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                            />
                            {showEntityPicker && (
                              <div className="custom-scrollbar mt-1 max-h-48 overflow-y-auto rounded-xl border border-[var(--glass-border)] bg-[var(--modal-bg)] p-1 shadow-2xl">
                                {entityOptions
                                  .filter((id) => {
                                    if (
                                      pill.type === 'alarm' &&
                                      !id.startsWith('alarm_control_panel.')
                                    )
                                      return false;
                                    if (!entitySearch) return true;
                                    const search = entitySearch.toLowerCase();
                                    const name = (
                                      entities[id]?.attributes?.friendly_name || ''
                                    ).toLowerCase();
                                    return (
                                      id.toLowerCase().includes(search) || name.includes(search)
                                    );
                                  })
                                  .slice(0, 50)
                                  .map((id) => (
                                    <button
                                      key={id}
                                      onClick={() => {
                                        updatePill(pill.id, { entityId: id });
                                        setShowEntityPicker(false);
                                        setEntitySearch('');
                                      }}
                                      className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--glass-bg)]"
                                    >
                                      <div className="text-sm font-bold text-[var(--text-primary)]">
                                        {entities[id]?.attributes?.friendly_name || id}
                                      </div>
                                      <div className="truncate text-xs text-[var(--text-muted)]">
                                        {id}
                                      </div>
                                    </button>
                                  ))}
                              </div>
                            )}
                            {pill.entityId && (
                              <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-[var(--text-muted)]">
                                <span>{pill.entityId}</span>
                                <span className="rounded bg-[var(--glass-bg)] px-1.5 py-0.5 font-mono text-[var(--text-primary)]">
                                  {entities[pill.entityId]?.state || 'N/A'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Sessions Sensors (Emby only) */}
                        {pill.type === 'emby' && (
                          <div className="rounded-xl bg-[var(--glass-bg)] p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">
                                {t('statusPills.sessionSensors')}
                              </label>
                            </div>
                            <div className="custom-scrollbar max-h-32 space-y-1 overflow-y-auto">
                              {sessionSensorOptions.map((id) => {
                                const selected =
                                  Array.isArray(pill.sessionSensorIds) &&
                                  pill.sessionSensorIds.includes(id);
                                return (
                                  <button
                                    key={id}
                                    onClick={() => {
                                      const current = Array.isArray(pill.sessionSensorIds)
                                        ? pill.sessionSensorIds
                                        : [];
                                      const next = current.includes(id)
                                        ? current.filter((x) => x !== id)
                                        : [...current, id];
                                      updatePill(pill.id, { sessionSensorIds: next });
                                    }}
                                    className={`w-full rounded-lg px-3 py-1.5 text-left text-xs font-bold transition-colors ${selected ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'text-[var(--text-secondary)] hover:bg-[var(--modal-bg)]'}`}
                                  >
                                    {entities[id]?.attributes?.friendly_name || id}
                                  </button>
                                );
                              })}
                              {sessionSensorOptions.length === 0 && (
                                <p className="text-center text-xs text-[var(--text-muted)] italic">
                                  {t('statusPills.noSessionSensors')}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </section>

                      {/* Condition Group */}
                      <section className={`${sectionShellClass} space-y-3`}>
                        <h4 className="text-[11px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                          {t('statusPills.visibility')}{' '}
                          {pill.type !== 'conditional' && t('statusPills.visibilityOptional')}
                        </h4>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              updatePill(pill.id, {
                                conditionEnabled: pill.conditionEnabled === false,
                              })
                            }
                            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                              pill.conditionEnabled === false
                                ? 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                                : 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
                            }`}
                          >
                            {pill.conditionEnabled === false
                              ? t('statusPills.conditional')
                              : `✓ ${t('statusPills.conditional')}`}
                          </button>
                        </div>

                        {pill.conditionEnabled !== false && (
                          <div className="flex flex-col gap-3 rounded-xl border border-[var(--glass-border)]/50 bg-[var(--glass-bg)] p-3">
                            {/* Sentence Builder */}
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="text-[var(--text-secondary)]">
                                {t('statusPills.showWhen')}
                              </span>
                              <span className="rounded bg-[var(--accent-bg)] px-2 py-0.5 font-bold text-[var(--accent-color)]">
                                {t('statusPills.thisEntity')}
                              </span>
                              <select
                                value={pill.condition?.type || 'state'}
                                onChange={(e) =>
                                  updatePill(pill.id, {
                                    condition: { ...pill.condition, type: e.target.value },
                                  })
                                }
                                className="rounded border border-[var(--glass-border)] bg-[var(--modal-bg)] px-2 py-1 text-xs font-bold text-[var(--text-primary)] outline-none"
                              >
                                <option value="state">{t('statusPills.condIs')}</option>
                                <option value="not_state">{t('statusPills.condIsNot')}</option>
                                <option value="numeric">{t('statusPills.condHasValue')}</option>
                                <option value="attribute">{t('statusPills.condHasAttr')}</option>
                              </select>
                            </div>

                            {/* Values */}
                            <div className="border-l-2 border-[var(--accent-color)] pl-2">
                              {(pill.condition?.type === 'state' ||
                                pill.condition?.type === 'not_state') && (
                                <div className="space-y-2">
                                  <div className="flex min-h-[26px] flex-wrap gap-1.5">
                                    {(pill.condition?.states || []).map((state, idx) => (
                                      <span
                                        key={`${state}-${idx}`}
                                        className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-bg)] px-2 py-0.5 text-xs font-bold text-[var(--accent-color)]"
                                      >
                                        {state}
                                        <button
                                          onClick={() => {
                                            const newStates = [...(pill.condition?.states || [])];
                                            newStates.splice(idx, 1);
                                            updatePill(pill.id, {
                                              condition: { ...pill.condition, states: newStates },
                                            });
                                          }}
                                          className="hover:text-white"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </span>
                                    ))}
                                    {(pill.condition?.states || []).length === 0 && (
                                      <span className="text-xs text-[var(--text-muted)] italic">
                                        {t('statusPills.noValuesSelected')}
                                      </span>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={stateInputValue}
                                    onChange={(e) => setStateInputValue(e.target.value)}
                                    placeholder={t('statusPills.addValuePlaceholder')}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && stateInputValue.trim()) {
                                        e.preventDefault();
                                        const newState = stateInputValue.trim();
                                        const currentStates = pill.condition?.states || [];
                                        if (!currentStates.includes(newState)) {
                                          updatePill(pill.id, {
                                            condition: {
                                              ...pill.condition,
                                              states: [...currentStates, newState],
                                            },
                                          });
                                        }
                                        setStateInputValue('');
                                      }
                                    }}
                                    className="w-full rounded-lg border-0 bg-[var(--modal-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none"
                                  />
                                </div>
                              )}

                              {pill.condition?.type === 'numeric' && (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={pill.condition?.operator || '>'}
                                    onChange={(e) =>
                                      updatePill(pill.id, {
                                        condition: { ...pill.condition, operator: e.target.value },
                                      })
                                    }
                                    className="rounded bg-[var(--modal-bg)] px-2 py-1.5 text-xs font-bold text-[var(--text-primary)] outline-none"
                                  >
                                    <option value=">">{t('statusPills.greaterThan')}</option>
                                    <option value=">=">{t('statusPills.greaterOrEqual')}</option>
                                    <option value="<">{t('statusPills.lessThan')}</option>
                                    <option value="<=">{t('statusPills.lessOrEqual')}</option>
                                    <option value="==">{t('statusPills.equal')}</option>
                                  </select>
                                  <input
                                    type="number"
                                    placeholder={t('statusPills.valuePlaceholder')}
                                    value={pill.condition?.value || ''}
                                    onChange={(e) =>
                                      updatePill(pill.id, {
                                        condition: {
                                          ...pill.condition,
                                          value: Number.parseFloat(e.target.value),
                                        },
                                      })
                                    }
                                    className="w-24 rounded-lg border-0 bg-[var(--modal-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none"
                                  />
                                </div>
                              )}

                              {pill.condition?.type === 'attribute' && (
                                <div className="flex flex-col gap-2">
                                  <input
                                    type="text"
                                    placeholder={t('statusPills.attrPlaceholder')}
                                    value={pill.condition?.attribute || ''}
                                    onChange={(e) =>
                                      updatePill(pill.id, {
                                        condition: { ...pill.condition, attribute: e.target.value },
                                      })
                                    }
                                    className="w-full rounded-lg border-0 bg-[var(--modal-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none"
                                  />
                                  <input
                                    type="text"
                                    placeholder={t('statusPills.attrValuePlaceholder')}
                                    value={pill.condition?.value || ''}
                                    onChange={(e) =>
                                      updatePill(pill.id, {
                                        condition: { ...pill.condition, value: e.target.value },
                                      })
                                    }
                                    className="w-full rounded-lg border-0 bg-[var(--modal-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </section>

                      {/* Visual Options Group */}
                      <section className={`${sectionShellClass} space-y-3`}>
                        <h4 className="text-[11px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                          {t('statusPills.options')}
                        </h4>
                        {(pill.type === 'media_player' ||
                          pill.type === 'emby' ||
                          pill.type === 'sonos') && (
                          <div className="space-y-1 rounded-xl bg-[var(--glass-bg)] p-3">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">
                              {t('statusPills.playerNameDisplayFilter')}
                            </label>
                            <input
                              type="text"
                              value={pill.playerNameDisplayFilter || ''}
                              onChange={(e) =>
                                updatePill(pill.id, { playerNameDisplayFilter: e.target.value })
                              }
                              placeholder={t('statusPills.playerNameDisplayFilterPlaceholder')}
                              className="w-full rounded-lg border-0 bg-[var(--modal-bg)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                            />
                          </div>
                        )}
                        {pill.type === 'sonos' && (
                          <div className="grid grid-cols-1 gap-2 rounded-xl bg-[var(--glass-bg)] p-3 md:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">
                                {t('statusPills.headingSource') || 'Heading content'}
                              </label>
                              <select
                                value={pill.sonosHeadingSource || 'song'}
                                onChange={(e) =>
                                  updatePill(pill.id, { sonosHeadingSource: e.target.value })
                                }
                                className="w-full rounded-lg border-0 bg-[var(--modal-bg)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] outline-none"
                              >
                                <option value="none">{t('statusPills.valueNone') || 'None'}</option>
                                <option value="song">{t('statusPills.valueSong') || 'Song'}</option>
                                <option value="artist">
                                  {t('statusPills.valueArtist') || 'Artist'}
                                </option>
                                <option value="player">
                                  {t('statusPills.valuePlayer') || 'Player'}
                                </option>
                                <option value="artist_song">
                                  {t('statusPills.valueArtistSong') || 'Artist - Song'}
                                </option>
                                <option value="song_artist">
                                  {t('statusPills.valueSongArtist') || 'Song - Artist'}
                                </option>
                                <option value="artist_player">
                                  {t('statusPills.valueArtistPlayer') || 'Artist - Player'}
                                </option>
                                <option value="player_artist">
                                  {t('statusPills.valuePlayerArtist') || 'Player - Artist'}
                                </option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">
                                {t('statusPills.subheadingSource') || 'Subheading content'}
                              </label>
                              <select
                                value={pill.sonosSubheadingSource || 'artist_player'}
                                onChange={(e) =>
                                  updatePill(pill.id, { sonosSubheadingSource: e.target.value })
                                }
                                className="w-full rounded-lg border-0 bg-[var(--modal-bg)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] outline-none"
                              >
                                <option value="artist_player">
                                  {t('statusPills.valueArtistPlayer') || 'Artist - Player'}
                                </option>
                                <option value="player_artist">
                                  {t('statusPills.valuePlayerArtist') || 'Player - Artist'}
                                </option>
                                <option value="artist_song">
                                  {t('statusPills.valueArtistSong') || 'Artist - Song'}
                                </option>
                                <option value="song_artist">
                                  {t('statusPills.valueSongArtist') || 'Song - Artist'}
                                </option>
                                <option value="artist">
                                  {t('statusPills.valueArtist') || 'Artist'}
                                </option>
                                <option value="song">{t('statusPills.valueSong') || 'Song'}</option>
                                <option value="player">
                                  {t('statusPills.valuePlayer') || 'Player'}
                                </option>
                                <option value="none">{t('statusPills.valueNone') || 'None'}</option>
                              </select>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              updatePill(pill.id, { animated: pill.animated === false })
                            }
                            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                              pill.animated === false
                                ? 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                                : 'bg-purple-500/20 text-purple-400'
                            }`}
                          >
                            {pill.animated === false ? '' : '✓ '}
                            {t('statusPills.animated')}
                          </button>
                          <button
                            onClick={() => updatePill(pill.id, { clickable: !pill.clickable })}
                            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                              pill.clickable
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                            }`}
                          >
                            {pill.clickable ? '✓ ' : ''}
                            {t('statusPills.clickable')}
                          </button>
                          {(pill.type === 'media_player' ||
                            pill.type === 'emby' ||
                            pill.type === 'sonos') && (
                            <>
                              <button
                                onClick={() =>
                                  updatePill(pill.id, { showCover: pill.showCover === false })
                                }
                                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                                  pill.showCover === false
                                    ? 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                                    : 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
                                }`}
                              >
                                {pill.showCover === false ? '' : '✓ '}
                                {t('statusPills.showCover')}
                              </button>
                              <button
                                onClick={() => updatePill(pill.id, { showCount: !pill.showCount })}
                                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                                  pill.showCount
                                    ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
                                    : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                                }`}
                              >
                                {pill.showCount ? '✓ ' : ''}
                                {t('statusPills.showCount')}
                              </button>
                            </>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">
                <div className="space-y-3 text-center">
                  <p className="whitespace-pre-line">
                    {getSafeTranslationText('statusPills.selectPillHint')}
                  </p>
                  {isMobile && (
                    <button
                      onClick={() => setMobilePane('list')}
                      className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-xs font-bold tracking-wider text-[var(--text-secondary)] uppercase"
                    >
                      {t('statusPills.yourPills')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-[var(--glass-border)] p-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--glass-border)] py-3 font-bold tracking-widest text-[var(--text-secondary)] uppercase transition-colors hover:bg-[var(--glass-bg-hover)]"
          >
            {t('statusPills.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-green-500 py-3 font-bold tracking-widest text-white uppercase shadow-lg shadow-green-500/20 transition-colors hover:bg-green-600"
          >
            <Check className="mr-2 inline h-5 w-5" />
            {t('statusPills.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

const statusEntityShape = PropTypes.shape({
  attributes: PropTypes.shape({
    friendly_name: PropTypes.string,
    sessions: PropTypes.array,
  }),
});

StatusPillsConfigModal.propTypes = {
  show: PropTypes.bool,
  onClose: PropTypes.func,
  statusPillsConfig: PropTypes.arrayOf(PropTypes.object),
  onSave: PropTypes.func,
  entities: PropTypes.objectOf(statusEntityShape),
  t: PropTypes.func,
};
