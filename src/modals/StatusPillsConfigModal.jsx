import { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Trash2, Edit2, Eye, EyeOff, GripVertical, Check,
  ChevronDown, ChevronUp, Activity, Music, Clapperboard, Speaker
} from '../icons';
import { getAllIconKeys, getIconComponent } from '../iconMap';
import ModernDropdown from '../components/ModernDropdown';

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
    { name: 'Blue', bg: 'rgba(59, 130, 246, 0.3)', icon: 'text-blue-400', label: 'Blå' },
    { name: 'Green', bg: 'rgba(34, 197, 94, 0.3)', icon: 'text-green-400', label: 'Grøn' },
    { name: 'Red', bg: 'rgba(239, 68, 68, 0.3)', icon: 'text-red-400', label: 'Raud' },
    { name: 'Orange', bg: 'rgba(249, 115, 22, 0.3)', icon: 'text-orange-400', label: 'Oransje' },
    { name: 'Yellow', bg: 'rgba(234, 179, 8, 0.3)', icon: 'text-yellow-400', label: 'Gul' },
    { name: 'Purple', bg: 'rgba(168, 85, 247, 0.3)', icon: 'text-purple-400', label: 'Lilla' },
    { name: 'Pink', bg: 'rgba(236, 72, 153, 0.3)', icon: 'text-pink-400', label: 'Rosa' },
    { name: 'Emerald', bg: 'rgba(16, 185, 129, 0.3)', icon: 'text-emerald-400', label: 'Smaragd' }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4" 
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div 
        className="border w-full max-w-5xl max-h-[85vh] rounded-3xl shadow-2xl relative font-sans flex flex-col backdrop-blur-xl popup-anim overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--glass-border)] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)] uppercase tracking-widest">
            Status Pills Konfigurasjon
          </h2>
          <button onClick={onClose} className="modal-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Pills List */}
          <div className="w-1/3 border-r border-[var(--glass-border)] p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4 relative" ref={addMenuRef}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Dine Pills</h3>
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                title="Legg til ny pille"
              >
                <Plus className="w-4 h-4" />
              </button>
              
              {showAddMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-[#1e293b] border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col p-1">
                  <button onClick={() => { addPill('conditional'); setShowAddMenu(false); }} className="text-left px-4 py-3 hover:bg-white/5 rounded-lg text-sm text-gray-200 font-medium transition-colors flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" /> Sensor
                  </button>
                  <button onClick={() => { addPill('media_player'); setShowAddMenu(false); }} className="text-left px-4 py-3 hover:bg-white/5 rounded-lg text-sm text-gray-200 font-medium transition-colors flex items-center gap-2">
                    <Music className="w-4 h-4 text-green-400" /> Media
                  </button>
                  <button onClick={() => { addPill('emby'); setShowAddMenu(false); }} className="text-left px-4 py-3 hover:bg-white/5 rounded-lg text-sm text-gray-200 font-medium transition-colors flex items-center gap-2">
                    <Clapperboard className="w-4 h-4 text-purple-400" /> Emby
                  </button>
                  <button onClick={() => { addPill('sonos'); setShowAddMenu(false); }} className="text-left px-4 py-3 hover:bg-white/5 rounded-lg text-sm text-gray-200 font-medium transition-colors flex items-center gap-2">
                    <Speaker className="w-4 h-4 text-orange-400" /> Sonos
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
                          {pill.name || pill.label || entity?.attributes?.friendly_name || pill.entityId || 'Ny pille'}
                        </p>
                      </div>
                    </button>
                    
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => movePill(pill.id, 'up')}
                        disabled={idx === 0}
                        className="p-3 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                        title="Flytt opp"
                      >
                        <ChevronUp className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => movePill(pill.id, 'down')}
                        disabled={idx === pills.length - 1}
                        className="p-3 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                        title="Flytt ned"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => toggleVisibility(pill.id)}
                        className="p-3 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] transition-all flex items-center justify-center"
                        title={pill.visible ? 'Skjul' : 'Vis'}
                      >
                        {pill.visible ? <Eye className="w-5 h-5 text-emerald-400" /> : <EyeOff className="w-5 h-5 text-gray-500" />}
                      </button>
                      <button
                        onClick={() => deletePill(pill.id)}
                        className="p-3 rounded-xl bg-[var(--glass-bg)] hover:bg-red-500/20 text-red-400 transition-all flex items-center justify-center"
                        title="Slett"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {pills.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-8">
                  Ingen piller lagt til enno.<br/>Trykk + for å legge til.
                </p>
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 p-6 overflow-y-auto">
            {editingPill ? (() => {
              const pill = pills.find(p => p.id === editingPill);
              if (!pill) return null;
              
              const Icon = getIconComponent(pill.icon) || getIconComponent('Activity');
              
              return (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">
                      Rediger Pille
                    </h3>

                    {/* Internal Name */}
                    <div className="mb-4">
                      <label className="text-[10px] uppercase font-bold text-gray-600 tracking-wider mb-1 block">Navn (i editor)</label>
                      <input
                        type="text"
                        value={pill.name || ''}
                        onChange={(e) => updatePill(pill.id, { name: e.target.value })}
                        placeholder="t.d. Stue Media"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] outline-none border-0"
                      />
                    </div>
                    
                    {/* Pill Type Display (Correction: Type cannot be changed after creation) */}
                    <div className="mb-4">
                      <label className="text-[10px] uppercase font-bold text-gray-600 tracking-wider mb-2 block">Type Pille</label>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                         {pill.type === 'conditional' && <Activity className="w-4 h-4" />}
                         {pill.type === 'media_player' && <Music className="w-4 h-4" />}
                         {pill.type === 'emby' && <Clapperboard className="w-4 h-4" />}
                         {pill.type === 'sonos' && <Speaker className="w-4 h-4" />}
                         <span className="text-xs font-bold uppercase tracking-widest">
                           {pill.type === 'conditional' ? 'Sensor' : pill.type === 'media_player' ? 'Media' : pill.type === 'emby' ? 'Emby' : 'Sonos'}
                         </span>
                      </div>
                    </div>
                    
                    {/* Preview (only for conditional pills) */}
                    {pill.type === 'conditional' && (
                      <div className="mb-4">
                        <div 
                          className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl"
                          style={{ backgroundColor: pill.bgColor }}
                        >
                          <div className={`p-1.5 rounded-xl ${pill.iconColor}`} style={{ backgroundColor: pill.iconBgColor }}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className={`text-xs uppercase font-bold leading-tight ${pill.labelColor}`}>
                              {pill.label || 'Label'}
                            </span>
                            <span className={`text-xs font-medium uppercase tracking-widest italic ${pill.sublabelColor}`}>
                              {pill.sublabel || 'Sublabel'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Emby selection vs filter */}
                  {pill.type === 'emby' && (
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">Emby val</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => updatePill(pill.id, { mediaSelectionMode: 'select', mediaFilter: '', entityId: '' })}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            (pill.mediaSelectionMode || 'filter') === 'select'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                          }`}
                        >
                          Vel spelarar
                        </button>
                        <button
                          onClick={() => updatePill(pill.id, { mediaSelectionMode: 'filter', mediaEntityIds: [], entityId: '' })}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            (pill.mediaSelectionMode || 'filter') === 'filter'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                          }`}
                        >
                          Filter
                        </button>
                      </div>
                      {(pill.mediaSelectionMode || 'filter') === 'filter' ? (
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Filter (valfri)</label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={pill.mediaFilter || ''}
                              onChange={(e) => updatePill(pill.id, { mediaFilter: e.target.value, mediaEntityIds: [], entityId: '' })}
                              placeholder="media_player_midttunet*, media_player_bibliotek*"
                              className="md:col-span-2 w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] outline-none border-0 text-sm"
                            />
                            <select
                              value={pill.mediaFilterMode || 'startsWith'}
                              onChange={(e) => updatePill(pill.id, { mediaFilterMode: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] outline-none border-0 text-sm font-bold"
                            >
                              <option value="startsWith">Startar med</option>
                              <option value="contains">Inneheld</option>
                              <option value="regex">Regex</option>
                            </select>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)]">Bruk komma for fleire mønster. * fungerer som joker.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Vel media-spelarar</label>
                          <input
                            type="text"
                            value={entitySearch}
                            onChange={(e) => setEntitySearch(e.target.value)}
                            placeholder="Søk media_player..."
                            className="w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] outline-none border-0 text-sm"
                          />
                          <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl bg-[var(--glass-bg)] p-2">
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
                                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selected ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]'}`}
                                  >
                                    <div className="text-sm font-bold truncate">
                                      {entities[id]?.attributes?.friendly_name || id}
                                    </div>
                                    <div className="text-xs opacity-60">{id}</div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-[var(--text-muted)]">Vel anten spelarar eller filter.</p>
                      <div className="space-y-2 pt-2 border-t border-[var(--glass-border)]">
                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Sessions‑sensorar (valfri)</label>
                        <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl bg-[var(--glass-bg)] p-2">
                          {sessionSensorOptions
                            .filter((id) => {
                              if (!entitySearch) return true;
                              const search = entitySearch.toLowerCase();
                              const name = (entities[id]?.attributes?.friendly_name || '').toLowerCase();
                              return id.toLowerCase().includes(search) || name.includes(search);
                            })
                            .map((id) => {
                              const selected = Array.isArray(pill.sessionSensorIds) && pill.sessionSensorIds.includes(id);
                              return (
                                <button
                                  key={id}
                                  onClick={() => {
                                    const current = Array.isArray(pill.sessionSensorIds) ? pill.sessionSensorIds : [];
                                    const next = current.includes(id)
                                      ? current.filter((x) => x !== id)
                                      : [...current, id];
                                    updatePill(pill.id, { sessionSensorIds: next });
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selected ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]'}`}
                                >
                                  <div className="text-sm font-bold truncate">
                                    {entities[id]?.attributes?.friendly_name || id}
                                  </div>
                                  <div className="text-xs opacity-60">{id}</div>
                                </button>
                              );
                            })}
                          {sessionSensorOptions.length === 0 && (
                            <p className="text-xs text-[var(--text-muted)] text-center py-3">Ingen sessions‑sensorar funne</p>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)]">Bruk sensorar med attributt <strong>sessions</strong>.</p>
                      </div>
                    </div>
                  )}

                  {/* Entity Selection (hidden only for sonos/emby) */}
                  {pill.type !== 'sonos' && pill.type !== 'emby' && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">
                      {pill.type === 'media_player' || pill.type === 'emby' ? 'Media Spelar' : 'Entitet'}
                    </label>
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
                        onBlur={() => {
                          // Keep search value when closing picker
                          if (!showEntityPicker) {
                            setEntitySearch('');
                          }
                        }}
                        placeholder={pill.entityId ? (entities[pill.entityId]?.attributes?.friendly_name || pill.entityId) : 'Søk etter entitet...'}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] outline-none border-0"
                      />
                      {showEntityPicker && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => {
                              setShowEntityPicker(false);
                              setEntitySearch('');
                            }}
                          />
                          <div className="absolute top-full left-0 right-0 mt-1 p-1 rounded-xl bg-[var(--modal-bg)] shadow-2xl z-50 max-h-64 overflow-y-auto">
                            {entityOptions
                              .filter(id => {
                                // Filter by entity type
                                if ((pill.type === 'media_player' || pill.type === 'emby') && !id.startsWith('media_player.')) return false;
                                // Filter by search term
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
                                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--glass-bg)] transition-colors group"
                                >
                                  <div className="text-sm font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                                    {entities[id]?.attributes?.friendly_name || id}
                                  </div>
                                  <div className="text-xs text-[var(--text-muted)]">{id}</div>
                                </button>
                              ))}
                            {entityOptions.filter(id => {
                              if (!entitySearch) return true;
                              const search = entitySearch.toLowerCase();
                              const name = (entities[id]?.attributes?.friendly_name || '').toLowerCase();
                              return id.toLowerCase().includes(search) || name.includes(search);
                            }).length === 0 && (
                              <p className="text-gray-500 text-sm text-center py-4">Ingen entitetar funne</p>
                            )}
                          </div>
                        </>
                      )}
                      {pill.entityId && (
                        <div className="mt-2 px-2 space-y-1">
                          <p className="text-[10px] text-[var(--text-muted)] opacity-60 truncate">{pill.entityId}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Status:</span>
                            <span className="text-xs font-bold text-[var(--text-primary)]">
                              {entities[pill.entityId]?.state || 'ukjend'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  )}

                  {/* Labels (available for all types) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">Label</label>
                      <input
                        type="text"
                        value={pill.label || ''}
                        onChange={(e) => updatePill(pill.id, { label: e.target.value })}
                        placeholder="Automatisk"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] outline-none border-0"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">Sublabel</label>
                      <input
                        type="text"
                        value={pill.sublabel || ''}
                        onChange={(e) => updatePill(pill.id, { sublabel: e.target.value })}
                        placeholder="Automatisk"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] outline-none border-0"
                      />
                    </div>
                  </div>

                  {/* Icon (only for conditional pills) */}
                  {pill.type === 'conditional' && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">Ikon</label>
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
                        <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-xl bg-[var(--modal-bg)] shadow-2xl z-50 max-h-64 overflow-y-auto">
                          <input
                            type="text"
                            placeholder="Søk ikon..."
                            value={iconSearch}
                            onChange={(e) => setIconSearch(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[var(--glass-bg)] text-[var(--text-primary)] outline-none mb-2 border-0"
                          />
                          <div className="grid grid-cols-6 gap-2">
                            {filteredIcons.slice(0, 60).map(iconName => {
                              const IconComp = getIconComponent(iconName);
                              return (
                                <button
                                  key={iconName}
                                  onClick={() => {
                                    updatePill(pill.id, { icon: iconName });
                                    setShowIconPicker(false);
                                    setIconSearch('');
                                  }}
                                  className="p-2 rounded-lg hover:bg-[var(--glass-bg-hover)] flex items-center justify-center"
                                  title={iconName}
                                >
                                  <IconComp className="w-5 h-5" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  )}

                  {/* Color Presets (only for conditional pills) */}
                  {pill.type === 'conditional' && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">Farge</label>
                    <div className="flex flex-wrap gap-2">
                      {colorPresets.map(preset => (
                        <button
                          key={preset.name}
                          onClick={() => updatePill(pill.id, { 
                            iconBgColor: preset.bg, 
                            iconColor: preset.icon 
                          })}
                          className="w-9 h-9 rounded-full hover:scale-110 transition-all shadow-lg"
                          style={{ backgroundColor: preset.bg }}
                          title={preset.label}
                        />
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Condition - Mushroom Inspired Natural Language */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">
                      Synlegheitsvilkår {pill.type !== 'conditional' && '(valfritt)'}
                    </label>
                    
                    {/* Natural Language Flow */}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-primary)]">
                      <span className="text-gray-500">Vis når</span>
                      <span className="font-bold text-blue-400">denne entiteten</span>
                      
                      {/* Condition Type */}
                      <select
                        value={pill.condition?.type || 'state'}
                        onChange={(e) => updatePill(pill.id, { 
                          condition: { ...pill.condition, type: e.target.value }
                        })}
                        className="px-2 py-1 rounded-lg bg-[var(--modal-bg)] text-[var(--text-primary)] text-xs outline-none font-bold"
                        style={{ backgroundColor: 'var(--modal-bg)', color: 'var(--text-primary)' }}
                      >
                        <option value="state">er</option>
                        <option value="not_state">ikkje er</option>
                        <option value="numeric">har verdi</option>
                        <option value="attribute">har attributt</option>
                      </select>

                      {/* State Values */}
                      {(pill.condition?.type === 'state' || pill.condition?.type === 'not_state') && (
                        <div className="flex flex-wrap gap-1.5">
                          {(pill.condition?.states || []).map((state, idx) => (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold"
                            >
                              <span>{state}</span>
                              <button
                                onClick={() => {
                                  const newStates = [...(pill.condition?.states || [])];
                                  newStates.splice(idx, 1);
                                  updatePill(pill.id, { 
                                    condition: { ...pill.condition, states: newStates }
                                  });
                                }}
                                className="hover:bg-blue-500/30 rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Input Row */}
                    {(pill.condition?.type === 'state' || pill.condition?.type === 'not_state') && (
                      <input
                        type="text"
                        value={stateInputValue}
                        onChange={(e) => setStateInputValue(e.target.value)}
                        placeholder="Skriv state og trykk Enter (t.d. on, home, playing)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && stateInputValue.trim()) {
                            e.preventDefault();
                            const newState = stateInputValue.trim();
                            const currentStates = pill.condition?.states || [];
                            if (!currentStates.includes(newState)) {
                              updatePill(pill.id, { 
                                condition: { 
                                  ...pill.condition, 
                                  states: [...currentStates, newState]
                                }
                              });
                            }
                            setStateInputValue('');
                          }
                        }}
                        className="w-full px-3 py-1.5 rounded-full bg-[var(--glass-bg)] text-[var(--text-primary)] text-sm outline-none border-0 placeholder:text-xs"
                      />
                    )}
                    
                    
                    {/* Numeric */}
                    {pill.condition?.type === 'numeric' && (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={pill.condition?.operator || '>'}
                          onChange={(e) => updatePill(pill.id, { 
                            condition: { ...pill.condition, operator: e.target.value }
                          })}
                          className="px-2 py-1 rounded-lg bg-[var(--modal-bg)] text-[var(--text-primary)] text-xs outline-none font-bold"
                          style={{ backgroundColor: 'var(--modal-bg)', color: 'var(--text-primary)' }}
                        >
                          <option value=">">større enn</option>
                          <option value=">=">større/lik</option>
                          <option value="<">mindre enn</option>
                          <option value="<=">mindre/lik</option>
                          <option value="==">lik</option>
                          <option value="!=">ikkje lik</option>
                        </select>
                        <input
                          type="number"
                          placeholder="verdi"
                          value={pill.condition?.value || ''}
                          onChange={(e) => updatePill(pill.id, { 
                            condition: { ...pill.condition, value: parseFloat(e.target.value) }
                          })}
                          className="w-20 px-3 py-1 rounded-lg bg-[var(--glass-bg)] text-[var(--text-primary)] text-sm outline-none border-0"
                        />
                      </div>
                    )}
                    
                    
                    {/* Attribute */}
                    {pill.condition?.type === 'attribute' && (
                      <>
                        <input
                          type="text"
                          placeholder="namn (t.d. battery_level)"
                          value={pill.condition?.attribute || ''}
                          onChange={(e) => updatePill(pill.id, { 
                            condition: { ...pill.condition, attribute: e.target.value }
                          })}
                          className="w-32 px-3 py-1 rounded-lg bg-[var(--glass-bg)] text-[var(--text-primary)] text-sm outline-none border-0"
                        />
                        <span className="text-gray-500 text-sm">med verdi</span>
                        <input
                          type="text"
                          placeholder="verdi (valfritt)"
                          value={pill.condition?.value || ''}
                          onChange={(e) => updatePill(pill.id, { 
                            condition: { ...pill.condition, value: e.target.value }
                          })}
                          className="w-24 px-3 py-1 rounded-lg bg-[var(--glass-bg)] text-[var(--text-primary)] text-sm outline-none border-0"
                        />
                      </>
                    )}
                  </div>

                  {/* Media Player Options */}
                  {(pill.type === 'media_player' || pill.type === 'emby') && (
                    <div className="space-y-2 pt-2 border-t border-[var(--glass-border)]">
                      <label className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">{pill.type === 'emby' ? 'Emby Val' : 'Media Val'}</label>
                      {pill.type === 'media_player' && (
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Filter (valfri)</label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={pill.mediaFilter || ''}
                              onChange={(e) => updatePill(pill.id, { mediaFilter: e.target.value })}
                              placeholder="media_player_midttunet*, media_player_bibliotek*"
                              className="md:col-span-2 w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] outline-none border-0 text-sm"
                            />
                            <select
                              value={pill.mediaFilterMode || 'startsWith'}
                              onChange={(e) => updatePill(pill.id, { mediaFilterMode: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] outline-none border-0 text-sm font-bold"
                            >
                              <option value="startsWith">Startar med</option>
                              <option value="contains">Inneheld</option>
                              <option value="regex">Regex</option>
                            </select>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)]">Bruk komma for fleire mønster. * fungerer som joker.</p>
                          {pill.entityId && (
                            <p className="text-[11px] text-[var(--text-muted)]">Filter blir ignorert når ein spesifikk entitet er vald.</p>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => updatePill(pill.id, { showCover: !(pill.showCover !== false) })}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            pill.showCover !== false
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {pill.showCover !== false ? '✓ ' : ''}Vis cover
                        </button>
                        <button
                          onClick={() => updatePill(pill.id, { showCount: !pill.showCount })}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            pill.showCount
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {pill.showCount ? '✓ ' : ''}Vis antal
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Options - Chip Style */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updatePill(pill.id, { animated: !pill.animated })}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        pill.animated !== false
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {pill.animated !== false ? '✓ ' : ''}Animert
                    </button>
                    <button
                      onClick={() => updatePill(pill.id, { clickable: !pill.clickable })}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        pill.clickable
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {pill.clickable ? '✓ ' : ''}Klikkbar
                    </button>
                  </div>
                </div>
              );
            })() : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p className="text-center">
                  Vel ein pill til venstre for å redigere,<br/>
                  eller trykk + for å legge til ny.
                </p>
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
            Avbryt
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest transition-colors shadow-lg shadow-green-500/20"
          >
            <Check className="w-5 h-5 inline mr-2" />
            Lagre
          </button>
        </div>
      </div>
    </div>
  );
}
