import { WeatherTempCard } from '../../components';
import { getSettings, renderMissingEntityWhenReady } from '../helpers';

export function renderWeatherTempCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    cardSettings,
    tempHistoryById,
    forecastsById,
    setShowWeatherModal,
    t,
  } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  const weatherId = settings.weatherId;
  const weatherEntity = weatherId ? entities[weatherId] : null;

  if (!weatherEntity) {
    return renderMissingEntityWhenReady(ctx, {
      cardId,
      dragProps,
      controls: getControls(cardId),
      cardStyle,
      missingEntityId: weatherId || cardId,
      t,
    });
  }

  return (
    <WeatherTempCard
      cardId={cardId}
      dragProps={dragProps}
      getControls={getControls}
      cardStyle={cardStyle}
      settingsKey={settingsKey}
      cardSettings={cardSettings}
      entities={entities}
      tempHistory={[]}
      tempHistoryById={tempHistoryById}
      forecastsById={forecastsById}
      outsideTempId={null}
      weatherEntityId={null}
      editMode={editMode}
      onOpen={() => {
        if (!editMode) setShowWeatherModal(cardId);
      }}
      t={t}
    />
  );
}
