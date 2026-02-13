import { getIconComponent } from '../iconMap';
import { Edit2, Trash2, User } from '../icons';

const PersonStatus = ({
  id,
  entities,
  editMode,
  customNames,
  customIcons,
  cardSettings,
  getCardSettingsKey,
  getEntityImageUrl,
  getS,
  onOpenPerson,
  onEditCard,
  onRemoveCard,
  t: _t
}) => {
  const entity = entities[id];
  if (!entity && !editMode) return null;

  const isHome = entity?.state === 'home';
  const statusText = getS(id);
  const name = customNames[id] || entity?.attributes?.friendly_name || id;
  const picture = getEntityImageUrl(entity?.attributes?.entity_picture);
  const headerSettingsKey = getCardSettingsKey(id, 'header');
  const headerSettings = cardSettings[headerSettingsKey] || {};
  const personDisplay = headerSettings.personDisplay || 'photo';
  const useIcon = personDisplay === 'icon';
  const personIconName = customIcons[id] || entity?.attributes?.icon;
  const PersonIcon = personIconName ? (getIconComponent(personIconName) || User) : User;

  return (
    <div
      key={id}
      onClick={(e) => { if (!editMode) { e.stopPropagation(); onOpenPerson(id); } }}
      className="group relative flex items-center gap-2 sm:gap-3 pl-1.5 pr-2 sm:pr-5 py-1.5 rounded-full transition-all duration-500 hover:bg-[var(--glass-bg)]"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        boxShadow: isHome ? '0 0 20px rgba(34, 197, 94, 0.05)' : 'none',
        cursor: editMode ? 'pointer' : 'cursor-pointer'
      }}
    >
      {editMode && (
        <div className="absolute -top-2 -right-2 z-50 flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); onEditCard(id, headerSettingsKey); }} className="p-1 rounded-full bg-blue-500 text-white shadow-sm"><Edit2 className="w-3 h-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); onRemoveCard(id, 'header'); }} className="p-1 rounded-full bg-red-500/60 text-white shadow-sm"><Trash2 className="w-3 h-3" /></button>
        </div>
      )}

      <div className="relative">
        <div
          className="w-10 h-10 rounded-full overflow-hidden transition-all duration-500 bg-gray-800"
          style={{ filter: isHome ? 'grayscale(0%)' : 'grayscale(100%) opacity(0.7)' }}
        >
          {useIcon ? (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">
              <PersonIcon className="w-5 h-5" />
            </div>
          ) : picture ? (
            <img src={picture} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
              {name.substring(0, 1)}
            </div>
          )}
        </div>

        <div
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--card-bg)] transition-colors duration-500"
          style={{ backgroundColor: isHome ? '#22c55e' : '#52525b' }}
        />
      </div>

      <div className="hidden sm:flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--text-primary)] leading-none tracking-wide">{name}</span>
        </div>
        <span
          className="text-xs font-bold uppercase tracking-widest leading-none mt-1 transition-colors duration-300"
          style={{ color: isHome ? '#4ade80' : 'rgba(156, 163, 175, 0.5)' }}
        >
          {String(statusText)}
        </span>
      </div>
    </div>
  );
};

export default PersonStatus;
