import { LightCard } from '../../components';
import { getSettings } from '../helpers';

/**
 * @param {string} cardId
 * @param {Record<string, any>} dragProps
 * @param {(id: string) => any} getControls
 * @param {Record<string, any>} cardStyle
 * @param {string} settingsKey
 * @param {Record<string, any>} ctx
 */
export function renderLightCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    cardSettings,
    customNames,
    customIcons,
    getA,
    callService,
    optimisticLightBrightness,
    setOptimisticLightBrightness,
    setShowLightModal,
    isMobile,
    t,
  } = ctx;

  const settings = getSettings(cardSettings, settingsKey, cardId);
  const entityId = settings.entityId || cardId;

  return (
    <LightCard
      key={cardId}
      cardId={cardId}
      entityId={entityId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      entities={entities}
      editMode={editMode}
      cardSettings={cardSettings}
      settingsKey={settingsKey}
      customNames={customNames}
      customIcons={customIcons}
      getA={getA}
      callService={callService}
      onOpen={() => {
        if (!editMode) setShowLightModal(entityId);
      }}
      isMobile={isMobile}
      optimisticLightBrightness={optimisticLightBrightness}
      setOptimisticLightBrightness={setOptimisticLightBrightness}
      t={t}
    />
  );
}
