import { X, RefreshCw, ArrowRight } from '../icons';
import { parseMarkdown } from '../utils';

/**
 * UpdateModal - Modal for displaying and installing system updates
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {Function} props.onClose - Function to close modal
 * @param {Object} props.entities - All Home Assistant entities
 * @param {Function} props.callService - Function to call HA services
 * @param {Function} props.getEntityImageUrl - Function to get entity image URL
 * @param {string} props.expandedUpdate - Currently expanded update entity ID
 * @param {Function} props.setExpandedUpdate - Function to set expanded update
 * @param {Object} props.releaseNotes - Release notes cache
 * @param {Function} props.fetchReleaseNotes - Function to fetch release notes
 * @param {Function} props.t - Translation function
 */
export default function UpdateModal({
  show,
  onClose,
  entities,
  callService,
  getEntityImageUrl,
  expandedUpdate,
  setExpandedUpdate,
  releaseNotes,
  fetchReleaseNotes,
  t
}) {
  if (!show) return null;

  const updates = Object.keys(entities)
    .filter(id => id.startsWith('update.') && entities[id].state === 'on');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-6" 
      style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} 
      onClick={() => { 
        onClose(); 
        setExpandedUpdate(null); 
      }}
    >
      <div 
        className="border w-full max-w-2xl rounded-3xl md:rounded-[3rem] p-6 md:p-12 shadow-2xl relative font-sans max-h-[85vh] overflow-y-auto backdrop-blur-xl popup-anim" 
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', 
          borderColor: 'var(--glass-border)', 
          color: 'var(--text-primary)'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={() => { 
            onClose(); 
            setExpandedUpdate(null); 
          }} 
          className="absolute top-6 right-6 md:top-10 md:right-10 modal-close"
        >
          <X className="w-4 h-4" />
        </button>
        
        <h3 className="text-3xl font-light mb-8 text-[var(--text-primary)] text-center uppercase tracking-widest italic">
          {t('updates.title')}
        </h3>
        
        <div className="space-y-4">
          {updates.map(id => {
            const entity = entities[id];
            const attr = entity.attributes;
            const picture = getEntityImageUrl(attr.entity_picture);
            const inProgress = attr.in_progress;
            const isExpanded = expandedUpdate === id;
            
            const installedVersion = attr.installed_version || attr.current_version;
            const latestVersion = attr.latest_version;
            
            return (
              <div 
                key={id} 
                className="rounded-3xl overflow-hidden transition-all duration-300 popup-surface"
              >
                <div 
                  className="p-4 flex flex-col md:flex-row items-center gap-4 cursor-pointer group"
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedUpdate(null);
                    } else {
                      setExpandedUpdate(id);
                      fetchReleaseNotes(id);
                    }
                  }}
                >
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/5 flex-shrink-0 flex items-center justify-center p-2 border border-white/5">
                    {picture ? (
                      <img src={picture} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <RefreshCw className="w-6 h-6 text-[var(--text-secondary)] opacity-50" />
                    )}
                  </div>
                  <div className="flex-grow text-center md:text-left min-w-0">
                    <h4 className="text-base font-bold text-[var(--text-primary)] truncate pr-2">
                      {attr.title || attr.friendly_name}
                    </h4>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1.5 text-xs">
                      {installedVersion && (
                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                          <span className="opacity-50 text-[10px] uppercase tracking-wider font-bold">Fra</span>
                          <span className="font-mono bg-[var(--glass-bg)] px-1.5 py-0.5 rounded border border-[var(--glass-border)] opacity-80">{installedVersion}</span>
                        </div>
                      )}
                      
                      {installedVersion && <ArrowRight className="w-3 h-3 text-[var(--text-muted)] opacity-30" />}
                      
                      <div className="flex items-center gap-1.5 text-green-400">
                         {installedVersion && <span className="opacity-50 text-[10px] uppercase tracking-wider font-bold">Til</span>}
                         <span className="font-mono bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 font-bold">{latestVersion}</span>
                      </div>
                    </div>
                    {!isExpanded && attr.release_summary && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-1.5 line-clamp-1 opacity-60">
                        {attr.release_summary}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        callService("update", "install", { entity_id: id }); 
                      }}
                      disabled={inProgress}
                      className={`px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all ${
                        inProgress 
                          ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' 
                          : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20'
                      }`}
                    >
                      {inProgress ? t('updates.updating') : t('updates.update')}
                    </button>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-[var(--glass-border)]">
                    <div 
                      className="pt-3 text-xs text-[var(--text-secondary)] leading-relaxed" 
                      dangerouslySetInnerHTML={{ 
                        __html: parseMarkdown(
                          releaseNotes[id] || attr.release_summary || t('updates.noDetails')
                        ) 
                      }} 
                    />
                    {attr.release_url && (
                      <a 
                        href={attr.release_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-2 mt-3 text-blue-400 hover:text-blue-300 text-[10px] font-bold uppercase tracking-widest" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        Les meir <ArrowRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {updates.length === 0 && (
            <p className="text-center text-[var(--text-secondary)] py-10">
              {t('updates.none')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
