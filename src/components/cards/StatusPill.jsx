import { getIconComponent } from '../../icons';
import { Activity, Clapperboard } from '../../icons';
import { evaluateEntityCondition } from '../../utils/conditionUtils';

/**
 * Generic configurable status pill
 * @param {Object} props
 * @param {Object} props.pill - Pill configuration
 * @param {Object} props.entity - HA entity (or array for media_player type)
 * @param {Function} props.onClick - Click handler (optional)
 * @param {Function} props.t - Translation function
 * @param {Function} props.getA - Get attribute helper
 * @param {Function} props.getEntityImageUrl - Get entity image URL
 * @param {Function} props.isMediaActive - Check if media is active
 */
export default function StatusPill({ 
  pill, 
  entity, 
  onClick, 
  t,
  getA,
  getEntityImageUrl,
  isMediaActive,
  badge,
  isMobile
}) {
  if (!pill) return null;
  const isConditionEnabled = pill.conditionEnabled !== false;

  const capitalizeFirst = (value) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const getDefaultSublabelWithUnit = () => {
    const stateValue = entity?.state;
    const normalizedState = stateValue === undefined || stateValue === null ? '' : String(stateValue);
    if (!normalizedState) return '';

    const unitSource = pill?.unitSource === 'custom' ? 'custom' : 'ha';
    const customUnit = typeof pill?.customUnit === 'string' ? pill.customUnit.trim() : '';
    const haUnit = typeof entity?.attributes?.unit_of_measurement === 'string'
      ? entity.attributes.unit_of_measurement.trim()
      : '';

    const selectedUnit = unitSource === 'custom' ? customUnit : capitalizeFirst(haUnit);
    if (!selectedUnit) return normalizedState;

    const lowerState = normalizedState.toLowerCase();
    const lowerUnit = selectedUnit.toLowerCase();
    const alreadyContainsUnit = lowerState.endsWith(` ${lowerUnit}`) || lowerState === lowerUnit;
    return alreadyContainsUnit ? normalizedState : `${normalizedState} ${selectedUnit}`;
  };

  // Handle media_player / emby / sonos type differently
  if (pill.type === 'media_player' || pill.type === 'emby' || pill.type === 'sonos') {
    // entity should be an array of media player entities
    const mediaEntities = Array.isArray(entity) ? entity : (entity ? [entity] : []);
    const activeEntities = mediaEntities.filter(e => isMediaActive && isMediaActive(e));
    
    // Check condition if specified
    if (isConditionEnabled && pill.condition && pill.condition.type) {
      // For media_player, check if ANY entity meets condition
      const meetsCondition = activeEntities.some(e => {
        const tempEntity = e;
        if (!evaluateEntityCondition({ condition: pill.condition, entity: tempEntity, getAttribute: getA })) return false;
        return true;
      });
      if (!meetsCondition && activeEntities.length === 0) return null;
    } else if (isConditionEnabled) {
      // No condition specified, only show if there are active entities
      if (activeEntities.length === 0) return null;
    }

    const displayEntities = isConditionEnabled ? activeEntities : mediaEntities;
    const count = displayEntities.length;
    const firstActive = displayEntities[0] || mediaEntities[0];
    
    // Get display info from first active player
    const title = firstActive ? getA(firstActive.entity_id, 'media_title') : null;
    const artist = firstActive ? (getA(firstActive.entity_id, 'media_artist') || getA(firstActive.entity_id, 'media_album_name')) : null;
    const picture = pill.showCover !== false && firstActive ? getEntityImageUrl(firstActive.attributes?.entity_picture) : null;
    const isPlaying = firstActive?.state === 'playing';
    
    // Use pill.label if set, otherwise auto-generated
    const autoLabel = pill.type === 'emby'
      ? `${count} Spelar`
      : (pill.showCount && count > 1 ? `${count} ${t('addCard.players')}` : (title || 'Media'));
    
    const autoSublabel = pill.type === 'emby'
      ? (title || artist)
      : (pill.showCount && count > 1 ? title : artist);

    const label = pill.label || autoLabel;
    const sublabel = pill.sublabel || autoSublabel;
    
    const IconComponent = pill.icon ? (getIconComponent(pill.icon) || Clapperboard) : Clapperboard;
    const bgColor = pill.bgColor || 'rgba(255, 255, 255, 0.03)';
    const iconColor = pill.iconColor || 'text-green-400';
    const iconBgColor = pill.iconBgColor || 'rgba(74, 222, 128, 0.1)';
    const labelColor = pill.labelColor || 'text-[var(--text-secondary)]';
    const sublabelColor = pill.sublabelColor || 'text-[var(--text-muted)]';
    
    const animated = pill.animated !== false && isPlaying;
    
    // Mobile adjustments
    const paddingClass = isMobile ? 'px-2 py-1 gap-1.5' : 'px-3 py-1.5 gap-2.5';
    const iconPadding = isMobile ? 'p-1' : 'p-1.5';
    const textSize = isMobile ? 'text-[10px]' : 'text-xs';

    const Wrapper = pill.clickable && onClick ? 'button' : 'div';
    const wrapperProps = pill.clickable && onClick ? {
      onClick,
      className: `relative flex items-center ${paddingClass} rounded-2xl transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95`,
      style: { backgroundColor: bgColor }
    } : {
      className: `relative flex items-center ${paddingClass} rounded-2xl`,
      style: { backgroundColor: bgColor }
    };

    return (
      <Wrapper {...wrapperProps}>
        {picture && pill.showCover !== false ? (
          <div className={`${isMobile ? 'w-6 h-6 rounded-lg' : 'w-8 h-8 rounded-xl'} overflow-hidden bg-[var(--glass-bg)] relative flex-shrink-0`}>
            <img 
              src={picture} 
              alt="" 
              className={`w-full h-full object-cover ${animated ? 'animate-spin' : ''}`} 
              style={{ animationDuration: '10s' }} 
            />
          </div>
        ) : (
          <div className={`${iconPadding} rounded-xl ${iconColor} ${animated ? 'animate-pulse' : ''}`} style={{ backgroundColor: iconBgColor }}>
            <IconComponent className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
          </div>
        )}
        <div className="flex flex-col items-start">
          <span className={`${textSize} uppercase font-bold leading-tight ${labelColor}`}>
            {label}
          </span>
          {sublabel && (
            <span className={`${textSize} font-medium italic ${sublabelColor}`}>
              {sublabel}
            </span>
          )}
        </div>
        {badge > 0 && (
          <div className={`absolute -top-2 -right-2 ${isMobile ? 'min-w-[18px] h-[18px] text-[10px]' : 'min-w-[22px] h-[22px] text-xs'} px-1.5 bg-gray-600 text-white font-bold rounded-full flex items-center justify-center border border-transparent shadow-sm z-10`}>
            {badge}
          </div>
        )}
      </Wrapper>
    );
  }
  
  // Original conditional pill logic
  if (!entity) return null;

  if (isConditionEnabled && !evaluateEntityCondition({ condition: pill.condition, entity, getAttribute: getA })) return null;

  // Get display values
  const label = pill.label || entity.attributes?.friendly_name || entity.entity_id;
  const hasCustomSublabel = typeof pill.sublabel === 'string' && pill.sublabel.trim().length > 0;
  const sublabel = hasCustomSublabel ? pill.sublabel : getDefaultSublabelWithUnit();
  
  // Get icon
  const IconComponent = pill.icon ? (getIconComponent(pill.icon) || Activity) : Activity;
  
  // Get colors
  const bgColor = pill.bgColor || 'rgba(255, 255, 255, 0.03)';
  const iconBgColor = pill.iconBgColor || 'rgba(59, 130, 246, 0.1)';
  const iconColor = pill.iconColor || 'text-blue-400';
  const labelColor = pill.labelColor || 'text-[var(--text-secondary)]';
  const sublabelColor = pill.sublabelColor || 'text-[var(--text-muted)]';
  
  const animated = pill.animated !== false && (
    entity.state === 'on' || 
    entity.state === 'playing' ||
    pill.animateAlways
  );

  // Mobile adjustments
  const paddingClass = isMobile ? 'px-2 py-1 gap-1.5' : 'px-3 py-1.5 gap-2.5';
  const iconPadding = isMobile ? 'p-1' : 'p-1.5';
  const textSize = isMobile ? 'text-[10px]' : 'text-xs';

  const Wrapper = onClick ? 'button' : 'div';
  const wrapperProps = onClick ? {
    onClick,
    className: `flex items-center ${paddingClass} rounded-2xl transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95 ${animated ? 'animate-pulse' : ''}`,
    style: { backgroundColor: bgColor }
  } : {
    className: `flex items-center ${paddingClass} rounded-2xl ${animated ? 'animate-pulse' : ''}`,
    style: { backgroundColor: bgColor }
  };

  return (
    <Wrapper {...wrapperProps}>
      <div className={`${iconPadding} rounded-xl ${iconColor}`} style={{ backgroundColor: iconBgColor }}>
        <IconComponent className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
      </div>
      <div className="flex flex-col items-start">
        <span className={`${textSize} uppercase font-bold leading-tight ${labelColor}`}>
          {label}
        </span>
        <span className={`${textSize} font-medium italic ${sublabelColor}`}>
          {sublabel}
        </span>
      </div>
    </Wrapper>
  );
}
