import { MissingEntityCard } from '../components';
import { getSettings } from './helpers';
import { renderSensorCard } from './cards/sensorRenderer';
import { renderLightCard } from './cards/lightRenderer';
import { renderCameraCard } from './cards/cameraRenderer';
import { renderSpacerCard } from './cards/spacerRenderer';
import { renderAutomationCard } from './cards/automationRenderer';
import { renderCarCard } from './cards/carRenderer';
import { renderVacuumCard } from './cards/vacuumRenderer';
import { renderFanCard } from './cards/fanRenderer';
import { renderMediaPlayerCard } from './cards/mediaPlayerRenderer';
import { renderMediaGroupCard } from './cards/mediaGroupRenderer';
import { renderAlarmCard } from './cards/alarmRenderer';
import { renderRoomCard } from './cards/roomRenderer';
import {
  renderWeatherTempCard,
  renderGenericClimateCard,
  renderGenericCostCard,
  renderGenericAndroidTVCard,
  renderCalendarCard,
  renderTodoCard,
  renderNordpoolCard,
  renderCoverCard,
} from './cardRenderers';

/**
 * Unified card renderer signature used by registry entries:
 * (cardId, dragProps, getControls, cardStyle, settingsKey, ctx) => JSX|null
 */
export const CARD_REGISTRY = [
  { prefix: 'light_', renderer: renderLightCard },
  { prefix: 'light.', renderer: renderLightCard },
  { prefix: 'vacuum.', renderer: renderVacuumCard },
  { prefix: 'fan.', renderer: renderFanCard },
  { prefix: 'media_player.', renderer: renderMediaPlayerCard },
  { prefix: 'media_group_', renderer: renderMediaGroupCard },
  { prefix: 'sonos_group_', renderer: renderMediaGroupCard },
  { prefix: 'calendar_card_', renderer: renderCalendarCard },
  { prefix: 'climate_card_', renderer: renderGenericClimateCard },
  { prefix: 'todo_card_', renderer: renderTodoCard },
  { prefix: 'cost_card_', renderer: renderGenericCostCard },
  { prefix: 'weather_temp_', renderer: renderWeatherTempCard },
  { prefix: 'androidtv_card_', renderer: renderGenericAndroidTVCard },
  { prefix: 'car_card_', renderer: renderCarCard },
  { prefix: 'nordpool_card_', renderer: renderNordpoolCard },
  { prefix: 'cover_card_', renderer: renderCoverCard },
  { prefix: 'room_card_', renderer: renderRoomCard },
  { prefix: 'camera_card_', renderer: renderCameraCard },
  { prefix: 'alarm_card_', renderer: renderAlarmCard },
  { prefix: 'spacer_card_', renderer: renderSpacerCard },
];

export function dispatchCardRender(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { editMode, cardSettings, activePage } = ctx;

  if (cardId.startsWith('automation.')) {
    const settings = getSettings(cardSettings, settingsKey, cardId);
    if (['entity', 'toggle', 'sensor'].includes(settings.type)) {
      return renderSensorCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx);
    }
    return renderAutomationCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx);
  }

  for (const { prefix, renderer } of CARD_REGISTRY) {
    if (cardId.startsWith(prefix)) {
      return renderer(cardId, dragProps, getControls, cardStyle, settingsKey, ctx);
    }
  }

  const genericSettings = getSettings(cardSettings, settingsKey, cardId);
  if (['sensor', 'entity', 'toggle'].includes(genericSettings.type)) {
    return renderSensorCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx);
  }

  if (
    activePage === 'settings' &&
    !['car'].includes(cardId) &&
    !cardId.startsWith('light_') &&
    !cardId.startsWith('media_player')
  ) {
    return renderSensorCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx);
  }

  if (editMode && cardId === 'media_player') {
    return (
      <MissingEntityCard
        cardId={cardId}
        dragProps={dragProps}
        controls={getControls(cardId)}
        cardStyle={cardStyle}
        label="Legacy"
        t={ctx.t}
      />
    );
  }

  if (editMode && (cardId.startsWith('media_group_') || cardId.startsWith('sonos_group_'))) {
    return (
      <MissingEntityCard
        cardId={cardId}
        dragProps={dragProps}
        controls={getControls(cardId)}
        cardStyle={cardStyle}
        t={ctx.t}
      />
    );
  }

  if (cardId === 'car') {
    return renderCarCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx);
  }

  return null;
}
