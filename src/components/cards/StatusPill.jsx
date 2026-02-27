import { getIconComponent } from '../../icons';
import { Activity, AlertTriangle, Clapperboard, Lock, RefreshCw } from '../../icons';
import MdiIcon from '@mdi/react';
import { mdiShieldHome, mdiShieldLock, mdiShieldOff } from '@mdi/js';
import { evaluateEntityCondition } from '../../utils/conditionUtils';
import { useConfig, useHomeAssistantMeta } from '../../contexts';
import {
  convertValueByKind,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
  inferUnitKind,
} from '../../utils';

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
  isMobile,
}) {
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();
  if (!pill) return null;
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const isConditionEnabled = pill.conditionEnabled !== false;
  const textMaxWidthClass = isMobile ? 'max-w-[16ch]' : 'max-w-[26ch]';

  const capitalizeFirst = (value) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const resolveHeadingColorClass = (value) => {
    if (typeof value !== 'string' || !value.trim()) return 'text-[var(--text-primary)]';
    return value === 'text-[var(--text-secondary)]' ? 'text-[var(--text-primary)]' : value;
  };

  const applyPlayerNameDisplayFilter = (value) => {
    const name = String(value || '');
    const rawFilter =
      typeof pill?.playerNameDisplayFilter === 'string' ? pill.playerNameDisplayFilter : '';
    const patterns = rawFilter
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (!name || patterns.length === 0) return name;

    let cleaned = name;
    let didApply = false;
    patterns.forEach((pattern) => {
      const wildcardIndex = pattern.indexOf('*');
      const prefixCandidate = wildcardIndex >= 0 ? pattern.slice(0, wildcardIndex) : pattern;
      const prefix = prefixCandidate.trim();
      if (!prefix) return;

      const escapedPrefix = prefix.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^${escapedPrefix}`, 'i');
      if (regex.test(cleaned)) {
        cleaned = cleaned.replace(regex, '').trim();
        didApply = true;
      }
    });

    return didApply ? cleaned : name;
  };

  const getDefaultSublabelWithUnit = () => {
    const stateValue = entity?.state;
    const normalizedState =
      stateValue === undefined || stateValue === null ? '' : String(stateValue);
    if (!normalizedState) return '';

    const unitSource = pill?.unitSource === 'custom' ? 'custom' : 'ha';
    const customUnit = typeof pill?.customUnit === 'string' ? pill.customUnit.trim() : '';
    const haUnit =
      typeof entity?.attributes?.unit_of_measurement === 'string'
        ? entity.attributes.unit_of_measurement.trim()
        : '';

    const selectedUnit = unitSource === 'custom' ? customUnit : capitalizeFirst(haUnit);
    const inferredUnitKind = inferUnitKind(entity?.attributes?.device_class, haUnit);
    const parsedNumericState = parseFloat(normalizedState.replace(',', '.'));

    if (unitSource === 'ha' && inferredUnitKind && Number.isFinite(parsedNumericState)) {
      const converted = convertValueByKind(parsedNumericState, {
        kind: inferredUnitKind,
        fromUnit: haUnit,
        unitMode: effectiveUnitMode,
      });
      const convertedUnit = getDisplayUnitForKind(inferredUnitKind, effectiveUnitMode);
      if (Number.isFinite(converted) && convertedUnit) {
        return `${formatUnitValue(converted, { fallback: normalizedState })} ${convertedUnit}`;
      }
    }

    if (!selectedUnit) return normalizedState;

    const lowerState = normalizedState.toLowerCase();
    const lowerUnit = selectedUnit.toLowerCase();
    const alreadyContainsUnit = lowerState.endsWith(` ${lowerUnit}`) || lowerState === lowerUnit;
    return alreadyContainsUnit ? normalizedState : `${normalizedState} ${selectedUnit}`;
  };

  const getAlarmStateLabel = (state) => {
    const stateText = String(state || 'unknown');
    const key = `alarm.state.${stateText}`;
    const translated = t ? t(key) : key;
    if (translated && translated !== key) return translated;
    return stateText;
  };

  const getAlarmVisual = (state) => {
    if (state === 'disarmed') {
      return {
        mdiPath: mdiShieldOff,
        iconColor: '#3b82f6',
        iconBgStyle: { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
      };
    }
    if (state === 'armed_home' || state === 'armed_away') {
      return {
        mdiPath: state === 'armed_home' ? mdiShieldHome : mdiShieldLock,
        iconColor: '#22c55e',
        iconBgStyle: { backgroundColor: 'rgba(34, 197, 94, 0.2)' },
      };
    }
    if (state === 'triggered') {
      return {
        Icon: AlertTriangle,
        iconColor: 'var(--text-primary)',
        iconBgStyle: { backgroundColor: 'var(--glass-bg)' },
      };
    }
    if (state === 'arming' || state === 'pending' || state === 'disarming') {
      return {
        Icon: RefreshCw,
        iconColor: 'var(--text-primary)',
        iconBgStyle: { backgroundColor: 'var(--glass-bg)' },
      };
    }
    return {
      Icon: Lock,
      iconColor: 'var(--text-primary)',
      iconBgStyle: { backgroundColor: 'var(--glass-bg)' },
    };
  };

  if (pill.type === 'alarm') {
    if (!entity) return null;
    if (
      isConditionEnabled &&
      !evaluateEntityCondition({ condition: pill.condition, entity, getAttribute: getA })
    )
      return null;

    const state = entity?.state || 'unknown';
    const statusText = getAlarmStateLabel(state);
    const sublabelText =
      pill.sublabel || pill.label || entity?.attributes?.friendly_name || entity?.entity_id || '';
    const alarmVisual = getAlarmVisual(state);
    const AlarmIcon = alarmVisual.Icon || Lock;
    const bgColor = pill.bgColor || 'rgba(255, 255, 255, 0.03)';
    const labelColor = pill.labelColor || 'text-[var(--text-primary)]';
    const sublabelColor = pill.sublabelColor || 'text-[var(--text-secondary)]';

    const animated =
      pill.animated !== false &&
      (state === 'arming' || state === 'pending' || state === 'disarming');
    const paddingClass = isMobile ? 'px-1.5 py-0.5 gap-1.5' : 'px-2.5 py-1 gap-2';
    const iconPadding = isMobile ? 'p-1' : 'p-1.5';
    const textSize = isMobile ? 'text-[10px]' : 'text-xs';

    const Wrapper = onClick ? 'button' : 'div';
    const wrapperProps = onClick
      ? {
          onClick,
          className: `flex items-center ${paddingClass} rounded-2xl transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95 ${animated ? 'animate-pulse' : ''}`,
          style: { backgroundColor: bgColor },
        }
      : {
          className: `flex items-center ${paddingClass} rounded-2xl ${animated ? 'animate-pulse' : ''}`,
          style: { backgroundColor: bgColor },
        };

    return (
      <Wrapper {...wrapperProps}>
        <div className={`${iconPadding} rounded-xl`} style={alarmVisual.iconBgStyle}>
          {alarmVisual.mdiPath ? (
            <MdiIcon
              path={alarmVisual.mdiPath}
              size={isMobile ? 0.75 : 0.9}
              color={alarmVisual.iconColor}
              className={animated ? 'animate-spin' : ''}
            />
          ) : (
            <AlarmIcon
              className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${animated ? 'animate-spin' : ''}`}
              color={alarmVisual.iconColor}
              style={{ color: alarmVisual.iconColor }}
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col items-start">
          <span
            className={`${textSize} text-left leading-tight font-bold ${labelColor} ${textMaxWidthClass} block w-full truncate`}
            title={statusText}
          >
            {statusText}
          </span>
          {sublabelText && (
            <span
              className={`${textSize} text-left font-medium ${sublabelColor} ${textMaxWidthClass} block w-full truncate`}
              title={sublabelText}
            >
              {sublabelText}
            </span>
          )}
        </div>
      </Wrapper>
    );
  }

  // Handle media_player / emby / sonos type differently
  if (pill.type === 'media_player' || pill.type === 'emby' || pill.type === 'sonos') {
    // entity should be an array of media player entities
    const mediaEntities = Array.isArray(entity) ? entity : entity ? [entity] : [];
    const activeEntities = mediaEntities.filter((e) => isMediaActive && isMediaActive(e));

    // Check condition if specified
    if (isConditionEnabled && pill.condition && pill.condition.type) {
      // For media_player, check if ANY entity meets condition
      const meetsCondition = activeEntities.some((e) => {
        const tempEntity = e;
        if (
          !evaluateEntityCondition({
            condition: pill.condition,
            entity: tempEntity,
            getAttribute: getA,
          })
        )
          return false;
        return true;
      });
      if (!meetsCondition) return null;
    } else if (isConditionEnabled) {
      // No condition specified, only show if there are active entities
      if (activeEntities.length === 0) return null;
    }

    const displayEntities = isConditionEnabled ? activeEntities : mediaEntities;
    const count = displayEntities.length;
    const hasCandidateMediaMetadata = (candidate) => {
      if (!candidate) return false;
      const attrs = candidate.attributes || {};
      return Boolean(
        attrs.media_title ||
        attrs.media_channel ||
        attrs.media_artist ||
        attrs.media_album_name ||
        attrs.entity_picture ||
        attrs.media_image_url
      );
    };
    const pickBestDisplayEntity = (candidates) => {
      if (!Array.isArray(candidates) || candidates.length === 0) return null;
      const scored = candidates
        .filter(Boolean)
        .map((candidate) => {
          const attrs = candidate.attributes || {};
          const hasTitle = Boolean(
            attrs.media_title || attrs.media_channel || attrs.media_album_name
          );
          const hasImage = Boolean(attrs.entity_picture || attrs.media_image_url);
          const hasArtist = Boolean(attrs.media_artist || attrs.media_album_name);
          const hasMetadata = hasCandidateMediaMetadata(candidate);
          const isPlayingState = candidate.state === 'playing';
          const score =
            (isPlayingState ? 100 : 0) +
            (hasMetadata ? 25 : 0) +
            (hasTitle ? 10 : 0) +
            (hasImage ? 5 : 0) +
            (hasArtist ? 2 : 0);
          return { candidate, score };
        })
        .sort((a, b) => b.score - a.score);
      return scored[0]?.candidate || null;
    };
    const firstActive =
      pickBestDisplayEntity(displayEntities) || pickBestDisplayEntity(mediaEntities);
    const friendlyNameRaw = firstActive?.attributes?.friendly_name || null;
    const friendlyName = applyPlayerNameDisplayFilter(friendlyNameRaw);

    // Get display info from first active player
    const title = firstActive
      ? getA(firstActive.entity_id, 'media_title') ||
        getA(firstActive.entity_id, 'media_channel') ||
        getA(firstActive.entity_id, 'media_album_name')
      : null;
    const artist = firstActive
      ? getA(firstActive.entity_id, 'media_artist') ||
        getA(firstActive.entity_id, 'media_album_name')
      : null;
    const rawPicture = firstActive
      ? firstActive.attributes?.entity_picture || firstActive.attributes?.media_image_url
      : null;
    const isPlaying = firstActive?.state === 'playing';
    const hasMediaMetadata = hasCandidateMediaMetadata(firstActive);
    const picture =
      pill.showCover !== false && rawPicture && (isPlaying || hasMediaMetadata)
        ? getEntityImageUrl(rawPicture)
        : null;

    // Use pill.label if set, otherwise auto-generated
    const autoLabel =
      pill.type === 'emby'
        ? `${count} ${t('statusBar.nowPlaying') || t('media.playing') || 'Playing'}`
        : pill.type === 'sonos'
          ? title || 'Media'
          : pill.type === 'media_player'
            ? title || 'Media'
            : pill.showCount && count > 1
              ? `${count} ${t('addCard.players')}`
              : title || 'Media';

    const autoSublabel =
      pill.type === 'emby'
        ? title || artist
        : pill.type === 'sonos'
          ? [artist, friendlyName].filter(Boolean).join(' - ') || artist || friendlyName
          : pill.type === 'media_player'
            ? artist
            : pill.showCount && count > 1
              ? title
              : artist;

    const noMediaLabel = t('media.noMedia') || 'No media';
    const sonosHeadingSource = pill.sonosHeadingSource || 'song';
    const sonosSubheadingSource = pill.sonosSubheadingSource || 'artist_player';

    const composeDual = (first, second) => [first, second].filter(Boolean).join(' - ');
    const resolveSonosText = (source) => {
      switch (source) {
        case 'song':
          return title || null;
        case 'artist':
          return artist || null;
        case 'player':
          return friendlyName || null;
        case 'artist_song':
          return composeDual(artist, title) || artist || title || null;
        case 'song_artist':
          return composeDual(title, artist) || title || artist || null;
        case 'artist_player':
          return composeDual(artist, friendlyName) || artist || friendlyName || null;
        case 'player_artist':
          return composeDual(friendlyName, artist) || friendlyName || artist || null;
        case 'none':
          return null;
        default:
          return null;
      }
    };

    const resolvedSonosHeading = resolveSonosText(sonosHeadingSource);
    const resolvedSonosSubheading = resolveSonosText(sonosSubheadingSource);
    const sonosAutoLabel =
      sonosHeadingSource === 'none'
        ? null
        : resolvedSonosHeading ||
          title ||
          friendlyName ||
          (!hasMediaMetadata ? noMediaLabel : 'Media');

    const label = pill.label || autoLabel;
    const sublabel =
      pill.type === 'sonos' && !hasMediaMetadata
        ? null
        : pill.type === 'sonos' && !pill.sublabel
          ? resolvedSonosSubheading || null
          : pill.sublabel || autoSublabel;
    const displayLabel = pill.type === 'sonos' && !pill.label ? sonosAutoLabel : label;

    const IconComponent = pill.icon ? getIconComponent(pill.icon) || Clapperboard : Clapperboard;
    const bgColor = pill.bgColor || 'rgba(255, 255, 255, 0.03)';
    const iconColor = pill.iconColor || 'text-green-400';
    const iconBgColor = pill.iconBgColor || 'rgba(74, 222, 128, 0.1)';
    const labelColor = resolveHeadingColorClass(pill.labelColor);
    const sublabelColor = pill.sublabelColor || 'text-[var(--text-muted)]';

    const animated = pill.animated !== false && isPlaying;

    // Mobile adjustments
    const paddingClass = isMobile ? 'px-1.5 py-0.5 gap-1.5' : 'px-2.5 py-1 gap-2';
    const iconPadding = isMobile ? 'p-1' : 'p-1.5';
    const textSize = isMobile ? 'text-[10px]' : 'text-xs';

    const Wrapper = pill.clickable && onClick ? 'button' : 'div';
    const wrapperProps =
      pill.clickable && onClick
        ? {
            onClick,
            className: `relative flex items-center ${paddingClass} rounded-2xl transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95`,
            style: { backgroundColor: bgColor },
          }
        : {
            className: `relative flex items-center ${paddingClass} rounded-2xl`,
            style: { backgroundColor: bgColor },
          };

    return (
      <Wrapper {...wrapperProps}>
        {picture && pill.showCover !== false ? (
          <div
            className={`${isMobile ? 'h-6 w-6 rounded-lg' : 'h-8 w-8 rounded-xl'} relative flex-shrink-0 overflow-hidden bg-[var(--glass-bg)]`}
          >
            <img
              src={picture}
              alt=""
              className={`h-full w-full object-cover ${animated ? 'animate-spin' : ''}`}
              style={{ animationDuration: '10s' }}
            />
          </div>
        ) : (
          <div
            className={`${iconPadding} rounded-xl ${iconColor} ${animated ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: iconBgColor }}
          >
            <IconComponent className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
          </div>
        )}
        <div className="flex min-w-0 flex-col items-start">
          {displayLabel && (
            <span
              className={`${textSize} text-left leading-tight font-bold ${labelColor} ${textMaxWidthClass} block w-full truncate`}
              title={displayLabel}
            >
              {displayLabel}
            </span>
          )}
          {sublabel && (
            <span
              className={`${textSize} text-left font-medium italic ${sublabelColor} ${textMaxWidthClass} block w-full truncate`}
              title={sublabel}
            >
              {sublabel}
            </span>
          )}
        </div>
        {badge > 0 && (
          <div
            className={`absolute -top-2 -right-2 ${isMobile ? 'h-[18px] min-w-[18px] text-[10px]' : 'h-[22px] min-w-[22px] text-xs'} z-10 flex items-center justify-center rounded-full border border-transparent bg-gray-600 px-1.5 font-bold text-white shadow-sm`}
          >
            {badge}
          </div>
        )}
      </Wrapper>
    );
  }

  // Original conditional pill logic
  if (!entity) return null;

  if (
    isConditionEnabled &&
    !evaluateEntityCondition({ condition: pill.condition, entity, getAttribute: getA })
  )
    return null;

  // Get display values
  const label = pill.label || entity.attributes?.friendly_name || entity.entity_id;
  const hasCustomSublabel = typeof pill.sublabel === 'string' && pill.sublabel.trim().length > 0;
  const sublabel = hasCustomSublabel ? pill.sublabel : getDefaultSublabelWithUnit();

  // Get icon
  const IconComponent = pill.icon ? getIconComponent(pill.icon) || Activity : Activity;

  // Get colors
  const bgColor = pill.bgColor || 'rgba(255, 255, 255, 0.03)';
  const iconBgColor = pill.iconBgColor || 'rgba(59, 130, 246, 0.1)';
  const iconColor = pill.iconColor || 'text-[var(--accent-color)]';
  const labelColor = resolveHeadingColorClass(pill.labelColor);
  const sublabelColor = pill.sublabelColor || 'text-[var(--text-muted)]';

  const animated =
    pill.animated !== false &&
    (entity.state === 'on' || entity.state === 'playing' || pill.animateAlways);

  // Mobile adjustments
  const paddingClass = isMobile ? 'px-1.5 py-0.5 gap-1.5' : 'px-2.5 py-1 gap-2';
  const iconPadding = isMobile ? 'p-1' : 'p-1.5';
  const textSize = isMobile ? 'text-[10px]' : 'text-xs';

  const Wrapper = onClick ? 'button' : 'div';
  const wrapperProps = onClick
    ? {
        onClick,
        className: `flex items-center ${paddingClass} rounded-2xl transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95 ${animated ? 'animate-pulse' : ''}`,
        style: { backgroundColor: bgColor },
      }
    : {
        className: `flex items-center ${paddingClass} rounded-2xl ${animated ? 'animate-pulse' : ''}`,
        style: { backgroundColor: bgColor },
      };

  return (
    <Wrapper {...wrapperProps}>
      <div
        className={`${iconPadding} rounded-xl ${iconColor}`}
        style={{ backgroundColor: iconBgColor }}
      >
        <IconComponent className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
      </div>
      <div className="flex min-w-0 flex-col items-start">
        <span
          className={`${textSize} text-left leading-tight font-bold ${labelColor} ${textMaxWidthClass} block w-full truncate`}
          title={label}
        >
          {label}
        </span>
        <span
          className={`${textSize} text-left font-medium italic ${sublabelColor} ${textMaxWidthClass} block w-full truncate`}
          title={sublabel}
        >
          {sublabel}
        </span>
      </div>
    </Wrapper>
  );
}
