import { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Trash2, Eye, EyeOff, Check,
  ChevronDown, ChevronUp, Activity, Music, Clapperboard, Speaker
} from '../icons';
import { getAllIconKeys, getIconComponent } from '../iconMap';

/**
 * Modal for configuring status pills in the header
 */
export default function StatusPillsConfigModal({
  show,
  onClose,
  statusPillsConfig = [],
  onSave,
  entities,
  t
}) {
  const [pills, setPills] = useState([]);
  const [editingPill, setEditingPill] = useState(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [entitySearch, setEntitySearch] = useState('');
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [stateInputValue, setStateInputValue] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (show) {
      setPills(statusPillsConfig.map((p, i) => ({ ...p, id: p.id || `pill_${i}` })));
      setEditingPill(null);
      setEntitySearch('');
      setShowEntityPicker(false);
    }
  }, [show, statusPillsConfig]);

  if (!show) return null;

  const handleSave = () => {
    const cleaned = pills.map((pill) => ({
      ...pill,
      icon: typeof pill.icon === 'string' ? pill.icon : 'Activity',
      mediaFilter: typeof pill.mediaFilter === 'string' ? pill.mediaFilter : '',
      mediaFilterMode: typeof pill.mediaFilterMode === 'string' ? pill.mediaFilterMode : 'startsWith',
      mediaSelectionMode: typeof pill.mediaSelectionMode === 'string' ? pill.mediaSelectionMode : 'filter',
      mediaEntityIds: Array.isArray(pill.mediaEntityIds) ? pill.mediaEntityIds : [],
      sessionSensorIds: Array.isArray(pill.sessionSensorIds) ? pill.sessionSensorIds : []
    }));
    onSave(cleaned);
    onClose();
  };

  const addPill = (pillType = 'conditional') => {
    const defaultCondition = (pillType === 'media_player' || pillType === 'sonos' || pillType === 'emby')
      ? { type: 'state', states: ['playing'] }
      : { type: 'state', states: ['on'] };
    
    const newPill = {
      id: `pill_${Date.now()}`,
      type: pillType,
      entityId: '',
      label: '',
      sublabel: '',
      icon: pillType === 'emby' ? 'Clapperboard' : 'Activity',
      bgColor: 'rgba(255, 255, 255, 0.03)',
      iconBgColor: 'rgba(59, 130, 246, 0.1)',
      iconColor: 'text-blue-400',
      labelColor: 'text-[var(--text-secondary)]',
      sublabelColor: 'text-[var(--text-muted)]',
      condition: defaultCondition,
      clickable: false,
      animated: true,
      visible: true,
      showCover: true,
      showCount: false,
      mediaFilter: '',
      mediaFilterMode: 'startsWith',
      mediaSelectionMode: 'filter',
      mediaEntityIds: [],
      sessionSensorIds: []
    };
    setPills([...pills, newPill]);
    setEditingPill(newPill.id);
  };

  const deletePill = (id) => {
    setPills(pills.filter(p => p.id !== id));
    if (editingPill === id) setEditingPill(null);
  };

  const updatePill = (id, updates) => {
    setPills(pills.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const toggleVisibility = (id) => {
    updatePill(id, { visible: !pills.find(p => p.id === id)?.visible });
  };

  const movePill = (id, direction) => {
    const idx = pills.findIndex(p => p.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === pills.length - 1) return;
    
    const newPills = [...pills];
    const [removed] = newPills.splice(idx, 1);
    newPills.splice(direction === 'up' ? idx - 1 : idx + 1, 0, removed);
    setPills(newPills);
  };

  const entityOptions = Object.keys(entities).sort();
  const sessionSensorOptions = entityOptions.filter((id) => Array.isArray(entities[id]?.attributes?.sessions));
  
  const filteredIcons = getAllIconKeys().filter(name =>
    name.toLowerCase().includes(iconSearch.toLowerCase())
  );

  const colorPresets = [
    { name: 'Blue', bg: 'rgba(59, 130, 246, 0.3)', icon: 'text-blue-400', label: t('statusPills.colorBlue') },
    { name: 'Green', bg: 'rgba(34, 197, 94, 0.3)', icon: 'text-green-400', label: t('statusPills.colorGreen') },
    { name: 'Red', bg: 'rgba(239, 68, 68, 0.3)', icon: 'text-red-400', label: t('statusPills.colorRed') },
    { name: 'Orange', bg: 'rgba(249, 115, 22, 0.3)', icon: 'text-orange-400', label: t('statusPills.colorOrange') },
    { name: 'Yellow', bg: 'rgba(234, 179, 8, 0.3)', icon: 'text-yellow-400', label: t('statusPills.colorYellow') },
    { name: 'Purple', bg: 'rgba(168, 85, 247, 0.3)', icon: 'text-purple-400', label: t('statusPills.colorPurple') },
    { name: 'Pink', bg: 'rgba(236, 72, 153, 0.3)', icon: 'text-pink-400', label: t('statusPills.colorPink') },
    { name: 'Emerald', bg: 'rgba(16, 185, 129, 0.3)', icon: 'text-emerald-400', label: t('statusPills.colorEmerald') }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4" 
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div 
        className="border w-full max-w-5xl h-full md:h-[800px] max-h-[95vh] md:max-h-[90vh] rounded-2xl md:rounded-3xl shadow-2xl relative font-sans flex flex-col backdrop-blur-xl popup-anim overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--glass-border)] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)] uppercase tracking-widest">
            {t('statusPills.title')}
          </h2>
          <button onClick={onClose} className="modal-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Pills List */}
          <div className="w-full md:w-1/3 h-[250px] md:h-full border-r-0 border-b md:border-b-0 md:border-r border-[var(--glass-border)] p-4 overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-4 relative" ref={addMenuRef}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('statusPills.yourPills')}</h3>
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                title={t('statusPills.addNewPill')}
              >
                <Plus className="w-4 h-4" />
              </button>
              
              {showAddMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-[#1e293b] border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col p-1">
                  <button onClick={() => { addPill('conditional'); setShowAddMenu(false); }} className="text-left px-4 py-3 hover:bg-white/5 rounded-lg text-sm text-gray-200 font-medium transition-colors flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" /> {t('statusPills.typeSensor')}
                  </button>
                  <button onClick={() => { addPill('media_player'); setShowAddMenu(false); }} className="text-left px-4 py-3 hover:bg-white/5 rounded-lg text-sm text-gray-200 font-medium transition-colors flex items-center gap-2">
                    <Music className="w-4 h-4 text-green-400" /> {t('statusPills.typeMedia')}
                  </button>
                  <button onClick={() => { addPill('emby'); setShowAddMenu(false); }} className="text-left px-4 py-3 hover:bg-white/5 rounded-lg text-sm text-gray-200 font-medium transition-colors flex items-center gap-2">
                    <Clapperboard className="w-4 h-4 text-purple-400" /> {t('statusPills.typeEmby')}
                  </button>
                  <button onClick={() => { addPill('sonos'); setShowAddMenu(false); }} className="text-left px-4 py-3 hover:bg-white/5 rounded-lg text-sm text-gray-200 font-medium transition-colors flex items-center gap-2">
                    <Speaker className="w-4 h-4 text-orange-400" /> {t('statusPills.typeSonos')}
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              {pills.map((pill, idx) => {
                const Icon = getIconComponent(pill.icon) || getIconComponent('Activity');
                const entity = entities[pill.entityId];
                const isEditing = editingPill === pill.id;
                
                return (
                  <div
                    key={pill.id}
                    className={`p-4 rounded-2xl transition-all mb-3 ${isEditing ? 'bg-blue-500/10 border-2 border-blue-500/30' : 'bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border-2 border-transparent'}`}
                  >
                    <button
                      onClick={() => setEditingPill(isEditing ? null : pill.id)}
                      className="w-full flex items-center gap-3 text-left mb-4"
                    >
                      <div className={`p-2 rounded-xl ${pill.iconColor}`} style={{ backgroundColor: pill.iconBgColor }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {pill.name || pill.label || entity?.attributes?.friendly_name || pill.entityId || t('statusPills.newPill')}
                        </p>
                      </div>
                    </button>
                    
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => movePill(pill.id, 'up')}
                        disabled={idx === 0}
                        className="p-3 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                        title={t('statusPills.moveUp')}
                      >
                        <ChevronUp className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => movePill(pill.id, 'down')}
                        disabled={idx === pills.length - 1}
                        className="p-3 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                        title={t('statusPills.moveDown')}
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => toggleVisibility(pill.id)}
                        className="p-3 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] transition-all flex items-center justify-center"
                        title={pill.visible ? t('statusPills.hide') : t('statusPills.show')}
                      >
                        {pill.visible ? <Eye className="w-5 h-5 text-emerald-400" /> : <EyeOff className="w-5 h-5 text-gray-500" />}
                      </button>
                      <button
                        onClick={() => deletePill(pill.id)}
                        className="p-3 rounded-xl bg-[var(--glass-bg)] hover:bg-red-500/20 text-red-400 transition-all flex items-center justify-center"
                        title={t('statusPills.delete')}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {pills.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-8" dangerouslySetInnerHTML={{ __html: t('statusPills.noPillsYet') }} />
              )}
            </div>
          </div>


          {/* Editor */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto w-full">
            {editingPill ? (() => {
              const pill = pills.find(p => p.id === editingPill);
              if (!pill) return null;
              
              const Icon = getIconComponent(pill.icon) || getIconComponent('Activity');
              
              return (
                <div className="space-y-6">
                  {/* Header Section */}
                  <div className="flex items-start justify-between gap-4 border-b border-[var(--glass-border)] pb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-blue-400">{pill.type === 'conditional' ? t('statusPills.typeSensor') : pill.type === 'media_player' ? t('statusPills.typeMedia') : pill.type === 'emby' ? t('statusPills.typeEmby') : t('statusPills.typeSonos')}</span>
                        {pill.type === 'conditional' && <div className="w-1 h-1 bg-gray-500 rounded-full"></div>}
                        {pill.type === 'conditional' && <span className="text-xs text-gray-500">{t('statusPills.standardPill')}</span>}
                      </div>
                      <input
                        type="text"
                        value={pill.name || ''}
                        onChange={(e) => updatePill(pill.id, { name: e.target.value })}
                        placeholder={t('statusPills.pillNamePlaceholder')}
                        className="w-full bg-transparent text-xl font-bold text-[var(--text-primary)] outline-none placeholder:text-gray-600"
                      />
                    </div>
                    {/* Preview if conditional */}
                    {pill.type === 'conditional' && (
                      <div className="shrink-0">
                        <div 
                          className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl"
                          style={{ backgroundColor: pill.bgColor }}
                        >
                          <div className={`p-1.5 rounded-xl ${pill.iconColor}`} style={{ backgroundColor: pill.iconBgColor }}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className={`text-xs uppercase font-bold leading-tight ${pill.labelColor}`}>
                              {pill.label || t('statusPills.labelFallback')}
                            </span>
                            <span className={`text-xs font-medium uppercase tracking-widest italic ${pill.sublabelColor}`}>
                              {pill.sublabel || t('statusPills.sublabelFallback')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Main Configuration Grid */}
                  <div className="grid grid-cols-1 gap-6">
                    
                    {/* Visuals Group (Only for Conditional) */}
                    {pill.type === 'conditional' && (
                      <section className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">{t('statusPills.appearance')}</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-gray-600">{t('statusPills.heading')}</label>
                            <input
                              type="text"
                              value={pill.label || ''}
                              onChange={(e) => updatePill(pill.id, { label: e.target.value })}
                              placeholder={t('statusPills.automatic')}
                              className="w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] outline-none border-0 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-gray-600">{t('statusPills.subtitle')}</label>
                            <input
                              type="text"
                              value={pill.sublabel || ''}
                              onChange={(e) => updatePill(pill.id, { sublabel: e.target.value })}
                              placeholder={t('statusPills.automatic')}
                              className="w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] outline-none border-0 text-sm"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] uppercase font-bold text-gray-600">{t('statusPills.icon')}</label>
                            <div className="relative">
                              <button
                                onClick={() => setShowIconPicker(!showIconPicker)}
                                className="w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] flex items-center justify-between border-0"
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  <span className="text-sm">{pill.icon}</span>
                                </div>
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              
                              {showIconPicker && (
                                <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-xl bg-[var(--modal-bg)] shadow-2xl z-50 max-h-64 overflow-y-auto w-64">
                                  <input
                                    type="text"
                                    placeholder={t('statusPills.searchIcon')}
                                    value={iconSearch}
                                    onChange={(e) => setIconSearch(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-[var(--glass-bg)] text-[var(--text-primary)] outline-none mb-2 border-0"
                                  />
                                  <div className="grid grid-cols-5 gap-1">
                                    {filteredIcons.slice(0, 50).map(iconName => {
                                      const IconComp = getIconComponent(iconName);
                                      return (
                                        <button
                                          key={iconName}
                                          onClick={() => {
                                            updatePill(pill.id, { icon: iconName });
                                            setShowIconPicker(false);
                                            setIconSearch('');
                                          }}
                                          className="p-2 rounded-lg hover:bg-[var(--glass-bg-hover)] flex items-center justify-center aspect-square"
                                          title={iconName}
                                        >
                                          <IconComp className="w-4 h-4" />
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1 space-y-1 min-w-0">
                            <label className="text-[10px] uppercase font-bold text-gray-600">{t('statusPills.colorLabel')}</label>
                            <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar items-center h-[38px]">
                              {colorPresets.map(preset => (
                                <button
                                  key={preset.name}
                                  onClick={() => updatePill(pill.id, { 
                                    iconBgColor: preset.bg, 
                                    iconColor: preset.icon 
                                  })}
                                  className={`w-8 h-8 flex-shrink-0 rounded-full hover:scale-110 transition-all ${pill.iconBgColor === preset.bg ? 'ring-2 ring-white/20 scale-105' : ''}`}
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
                    <section className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">{t('statusPills.dataSource')}</h4>
                      
                      {/* Emby Source Type Logic */}
                      {pill.type === 'emby' && (
                        <div className="space-y-3">
                           <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => updatePill(pill.id, { mediaSelectionMode: 'select', mediaFilter: '', entityId: '' })}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                (pill.mediaSelectionMode || 'filter') === 'select'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                              }`}
                            >
                              {t('statusPills.selectSpecificPlayers')}
                            </button>
                            <button
                              onClick={() => updatePill(pill.id, { mediaSelectionMode: 'filter', mediaEntityIds: [], entityId: '' })}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                (pill.mediaSelectionMode || 'filter') === 'filter'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                              }`}
                            >
                              {t('statusPills.useFilter')}
                            </button>
                           </div>
                        </div>
                      )}

                      {/* Emby Filter or Media Player Filter Logic */}
                      {((pill.type === 'emby' && (pill.mediaSelectionMode || 'filter') === 'filter') || pill.type === 'media_player') && (
                         <div className="space-y-2 bg-[var(--glass-bg)] p-3 rounded-xl">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  value={pill.mediaFilter || ''}
                                  onChange={(e) => updatePill(pill.id, { mediaFilter: e.target.value, mediaEntityIds: [], entityId: '' })}
                                  placeholder="media_player_stue*, *"
                                  className="md:col-span-2 w-full px-3 py-1.5 rounded-lg bg-[var(--modal-bg)] text-[var(--text-primary)] outline-none border-0 text-sm"
                                />
                                <select
                                  value={pill.mediaFilterMode || 'startsWith'}
                                  onChange={(e) => updatePill(pill.id, { mediaFilterMode: e.target.value })}
                                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--modal-bg)] text-[var(--text-primary)] outline-none border-0 text-xs font-bold"
                                >
                                  <option value="startsWith">{t('statusPills.filterStartsWith')}</option>
                                  <option value="contains">{t('statusPills.filterContains')}</option>
                                  <option value="regex">{t('statusPills.filterRegex')}</option>
                                </select>
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)]">{t('statusPills.filterHint')}</p>
                         </div>
                      )}

                      {/* Emby/Media Player Multi-Select */}
                      {pill.type === 'emby' && (pill.mediaSelectionMode || 'filter') === 'select' && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={entitySearch}
                            onChange={(e) => setEntitySearch(e.target.value)}
                            placeholder={t('statusPills.searchPlayer')}
                            className="w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] outline-none border-0 text-sm"
                          />
                          <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl bg-[var(--glass-bg)] p-2 custom-scrollbar">
                            {entityOptions
                              .filter(id => id.startsWith('media_player.'))
                              .filter(id => {
                                if (!entitySearch) return true;
                                const search = entitySearch.toLowerCase();
                                const name = (entities[id]?.attributes?.friendly_name || '').toLowerCase();
                                return id.toLowerCase().includes(search) || name.includes(search);
                              })
                              .map(id => {
                                const selected = Array.isArray(pill.mediaEntityIds) && pill.mediaEntityIds.includes(id);
                                return (
                                  <button
                                    key={id}
                                    onClick={() => {
                                      const current = Array.isArray(pill.mediaEntityIds) ? pill.mediaEntityIds : [];
                                      const next = current.includes(id)
                                        ? current.filter(x => x !== id)
                                        : [...current, id];
                                      updatePill(pill.id, { mediaEntityIds: next, mediaFilter: '', entityId: '', mediaSelectionMode: 'select' });
                                    }}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${selected ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]'}`}
                                  >
                                    <div className="text-xs font-bold truncate">
                                      {entities[id]?.attributes?.friendly_name || id}
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Standard Entity Select (Conditional) */}
                      {pill.type === 'conditional' && (
                        <div className="relative">
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
                            placeholder={pill.entityId ? (entities[pill.entityId]?.attributes?.friendly_name || pill.entityId) : t('statusPills.searchEntity')}
                            className="w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] outline-none border-0 text-sm"
                          />
                          {showEntityPicker && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => { setShowEntityPicker(false); setEntitySearch(''); }} />
                              <div className="absolute top-full left-0 right-0 mt-1 p-1 rounded-xl bg-[var(--modal-bg)] shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                {entityOptions
                                  .filter(id => {
                                    if (!entitySearch) return true;
                                    const search = entitySearch.toLowerCase();
                                    const name = (entities[id]?.attributes?.friendly_name || '').toLowerCase();
                                    return id.toLowerCase().includes(search) || name.includes(search);
                                  })
                                  .slice(0, 50)
                                  .map(id => (
                                    <button
                                      key={id}
                                      onClick={() => {
                                        updatePill(pill.id, { entityId: id });
                                        setShowEntityPicker(false);
                                        setEntitySearch('');
                                      }}
                                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--glass-bg)] transition-colors"
                                    >
                                      <div className="text-sm font-bold text-[var(--text-primary)]">
                                        {entities[id]?.attributes?.friendly_name || id}
                                      </div>
                                      <div className="text-xs text-[var(--text-muted)] truncate">{id}</div>
                                    </button>
                                  ))}
                              </div>
                            </>
                          )}
                          {pill.entityId && (
                            <div className="mt-2 px-1 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                                <span>{pill.entityId}</span>
                                <span className="font-mono bg-[var(--glass-bg)] px-1.5 py-0.5 rounded text-[var(--text-primary)]">{entities[pill.entityId]?.state || 'N/A'}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sessions Sensors (Emby only) */}
                      {pill.type === 'emby' && (
                         <div className="bg-[var(--glass-bg)] rounded-xl p-3">
                             <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] uppercase font-bold text-gray-500">{t('statusPills.sessionSensors')}</label>
                             </div>
                             <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                                {sessionSensorOptions.map((id) => {
                                  const selected = Array.isArray(pill.sessionSensorIds) && pill.sessionSensorIds.includes(id);
                                  return (
                                    <button
                                      key={id}
                                      onClick={() => {
                                        const current = Array.isArray(pill.sessionSensorIds) ? pill.sessionSensorIds : [];
                                        const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
                                        updatePill(pill.id, { sessionSensorIds: next });
                                      }}
                                      className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors text-xs font-bold ${selected ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-[var(--modal-bg)] text-[var(--text-secondary)]'}`}
                                    >
                                      {entities[id]?.attributes?.friendly_name || id}
                                    </button>
                                  );
                                })}
                                {sessionSensorOptions.length === 0 && <p className="text-xs text-center text-[var(--text-muted)] italic">{t('statusPills.noSessionSensors')}</p>}
                             </div>
                         </div>
                      )}

                    </section>

                    {/* Condition Group */}
                    <section className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                        {t('statusPills.visibility')} {pill.type !== 'conditional' && t('statusPills.visibilityOptional')}
                      </h4>
                      
                      <div className="bg-[var(--glass-bg)] p-3 rounded-xl flex flex-col gap-3">
                        {/* Sentence Builder */}
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-[var(--text-secondary)]">{t('statusPills.showWhen')}</span>
                            <span className="font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{t('statusPills.thisEntity')}</span>
                            <select
                              value={pill.condition?.type || 'state'}
                              onChange={(e) => updatePill(pill.id, { condition: { ...pill.condition, type: e.target.value }})}
                              className="bg-[var(--modal-bg)] text-[var(--text-primary)] font-bold text-xs px-2 py-1 rounded outline-none border border-[var(--glass-border)]"
                            >
                              <option value="state">{t('statusPills.condIs')}</option>
                              <option value="not_state">{t('statusPills.condIsNot')}</option>
                              <option value="numeric">{t('statusPills.condHasValue')}</option>
                              <option value="attribute">{t('statusPills.condHasAttr')}</option>
                            </select>
                        </div>

                        {/* Values */}
                        <div className="pl-2 border-l-2 border-blue-500/20">
                           {(pill.condition?.type === 'state' || pill.condition?.type === 'not_state') && (
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                                    {(pill.condition?.states || []).map((state, idx) => (
                                      <span key={`${state}-${idx}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">
                                        {state}
                                        <button onClick={() => {
                                            const newStates = [...(pill.condition?.states || [])];
                                            newStates.splice(idx, 1);
                                            updatePill(pill.id, { condition: { ...pill.condition, states: newStates }});
                                        }} className="hover:text-white"><X className="w-3 h-3" /></button>
                                      </span>
                                    ))}
                                    {(pill.condition?.states || []).length === 0 && <span className="text-xs text-[var(--text-muted)] italic">{t('statusPills.noValuesSelected')}</span>}
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
                                        updatePill(pill.id, { condition: { ...pill.condition, states: [...currentStates, newState] }});
                                      }
                                      setStateInputValue('');
                                    }
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--modal-bg)] text-[var(--text-primary)] text-sm outline-none border-0"
                                />
                              </div>
                           )}

                           {pill.condition?.type === 'numeric' && (
                              <div className="flex items-center gap-2">
                                <select
                                  value={pill.condition?.operator || '>'}
                                  onChange={(e) => updatePill(pill.id, { condition: { ...pill.condition, operator: e.target.value }})}
                                  className="bg-[var(--modal-bg)] text-[var(--text-primary)] font-bold text-xs px-2 py-1.5 rounded outline-none"
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
                                  onChange={(e) => updatePill(pill.id, { condition: { ...pill.condition, value: parseFloat(e.target.value) }})}
                                  className="w-24 px-3 py-1.5 rounded-lg bg-[var(--modal-bg)] text-[var(--text-primary)] text-sm outline-none border-0"
                                />
                              </div>
                           )}

                           {pill.condition?.type === 'attribute' && (
                             <div className="flex flex-col gap-2">
                                <input
                                  type="text"
                                  placeholder={t('statusPills.attrPlaceholder')}
                                  value={pill.condition?.attribute || ''}
                                  onChange={(e) => updatePill(pill.id, { condition: { ...pill.condition, attribute: e.target.value }})}
                                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--modal-bg)] text-[var(--text-primary)] text-sm outline-none border-0"
                                />
                                <input
                                  type="text"
                                  placeholder={t('statusPills.attrValuePlaceholder')}
                                  value={pill.condition?.value || ''}
                                  onChange={(e) => updatePill(pill.id, { condition: { ...pill.condition, value: e.target.value }})}
                                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--modal-bg)] text-[var(--text-primary)] text-sm outline-none border-0"
                                />
                             </div>
                           )}
                        </div>
                      </div>
                    </section>
                    
                    {/* Visual Options Group */}
                    <section className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">{t('statusPills.options')}</h4>
                          <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => updatePill(pill.id, { animated: !pill.animated })}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                  pill.animated !== false ? 'bg-purple-500/20 text-purple-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                                }`}
                              >
                                {pill.animated !== false ? '✓ ' : ''}{t('statusPills.animated')}
                            </button>
                            <button
                                onClick={() => updatePill(pill.id, { clickable: !pill.clickable })}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                  pill.clickable ? 'bg-green-500/20 text-green-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                                }`}
                              >
                                {pill.clickable ? '✓ ' : ''}{t('statusPills.clickable')}
                            </button>
                            {(pill.type === 'media_player' || pill.type === 'emby') && (
                              <>
                                <button
                                  onClick={() => updatePill(pill.id, { showCover: !(pill.showCover !== false) })}
                                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    pill.showCover !== false ? 'bg-blue-500/20 text-blue-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                                  }`}
                                >
                                  {pill.showCover !== false ? '✓ ' : ''}{t('statusPills.showCover')}
                                </button>
                                <button
                                  onClick={() => updatePill(pill.id, { showCount: !pill.showCount })}
                                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    pill.showCount ? 'bg-blue-500/20 text-blue-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                                  }`}
                                >
                                  {pill.showCount ? '✓ ' : ''}{t('statusPills.showCount')}
                                </button>
                              </>
                            )}
                          </div>
                    </section>

                  </div>
                </div>
              );
            })() : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p className="text-center" dangerouslySetInnerHTML={{ __html: t('statusPills.selectPillHint') }} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--glass-border)] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] font-bold uppercase tracking-widest transition-colors"
          >
            {t('statusPills.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest transition-colors shadow-lg shadow-green-500/20"
          >
            <Check className="w-5 h-5 inline mr-2" />
            {t('statusPills.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
