import { getIconComponent } from '../../icons';
import { Edit2, Trash2, User } from '../../icons';

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
  t: _t,
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
  const showName = headerSettings.showName !== false;
  const showState = headerSettings.showState !== false;
  const avatarOnly = !showName && !showState;
  const useIcon = personDisplay === 'icon';
  const personIconName = customIcons[id] || entity?.attributes?.icon;
  const PersonIcon = personIconName ? getIconComponent(personIconName) || User : User;

  return (
    <div
      key={id}
      onClick={(e) => {
        if (!editMode) {
          e.stopPropagation();
          onOpenPerson(id);
        }
      }}
      className={`group relative flex items-center rounded-full transition-all duration-500 hover:bg-[var(--glass-bg)] ${avatarOnly ? 'gap-1 py-1 pr-1.5 pl-1' : 'gap-2 py-1.5 pr-2 pl-1.5 sm:gap-3 sm:pr-5'}`}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        boxShadow: isHome ? '0 0 20px rgba(34, 197, 94, 0.05)' : 'none',
        cursor: editMode ? 'default' : 'pointer',
      }}
    >
      {editMode && (
        <div className="absolute -top-2 -right-2 z-50 flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditCard(id, headerSettingsKey);
            }}
            className="rounded-full bg-[var(--accent-color)] p-1 text-white shadow-sm"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveCard(id, 'header');
            }}
            className="rounded-full bg-red-500/60 p-1 text-white shadow-sm"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="relative">
        <div
          className="h-10 w-10 overflow-hidden rounded-full bg-gray-800 transition-all duration-500"
          style={{ filter: isHome ? 'grayscale(0%)' : 'grayscale(100%) opacity(0.7)' }}
        >
          {useIcon ? (
            <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
              <PersonIcon className="h-5 w-5" />
            </div>
          ) : picture ? (
            <img src={picture} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-gray-500">
              {name.substring(0, 1)}
            </div>
          )}
        </div>

        <div
          className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-[var(--card-bg)] transition-colors duration-500"
          style={{ backgroundColor: isHome ? '#22c55e' : '#52525b' }}
        />
      </div>

      {(showName || showState) && (
        <div className="hidden flex-col justify-center sm:flex">
          {showName && (
            <div className="flex items-center gap-2">
              <span className="text-sm leading-none font-bold tracking-wide text-[var(--text-primary)]">
                {name}
              </span>
            </div>
          )}
          {showState && (
            <span
              className={`text-xs leading-none font-bold tracking-widest uppercase transition-colors duration-300 ${showName ? 'mt-1' : ''}`}
              style={{ color: isHome ? '#4ade80' : 'rgba(156, 163, 175, 0.5)' }}
            >
              {String(statusText)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PersonStatus;
