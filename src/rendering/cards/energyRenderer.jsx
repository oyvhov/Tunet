import { EnergyCard } from '../../components';
import { getSettings, renderMissingEntityWhenReady, withEditModeGuard } from '../helpers';

const ENERGY_ENTITY_KEYS = [
  'energyEntityId',
  'homeConsumptionInstantId',
  'solarProductionInstantId',
  'gridConsumptionInstantId',
  'gridInjectionInstantId',
  'batteryConsumptionInstantId',
  'batteryInjectionInstantId',
  'batteryLevelId',
  'homeConsumptionLifetimeId',
  'solarProductionLifetimeId',
  'gridConsumptionLifetimeId',
  'gridInjectionLifetimeId',
  'batteryConsumptionLifetimeId',
  'batteryInjectionLifetimeId',
];

export function renderEnergyCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    cardSettings,
    customNames,
    isMobile,
    setShowEnergyModal,
    t,
  } = ctx;

  const settings = getSettings(cardSettings, settingsKey, cardId);
  const primaryEntityKey = ENERGY_ENTITY_KEYS.find((key) => settings[key]);
  const entityId = primaryEntityKey ? settings[primaryEntityKey] : null;
  const entity = entityId ? entities[entityId] : null;

  if (!entity || !entityId) {
    return renderMissingEntityWhenReady(ctx, {
      cardId,
      dragProps,
      controls: getControls(cardId),
      cardStyle,
      missingEntityId: entityId || cardId,
      t,
    });
  }

  return (
    <EnergyCard
      cardId={cardId}
      entities={entities}
      settings={settings}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      customNames={customNames}
      isMobile={isMobile}
      t={t}
      onOpen={withEditModeGuard(editMode, () => setShowEnergyModal(cardId))}
    />
  );
}
