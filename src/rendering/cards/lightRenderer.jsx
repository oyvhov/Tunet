import { LightCard } from '../../components';

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
    t,
  } = ctx;

  return (
    <LightCard
      key={cardId}
      cardId={cardId}
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
        if (!editMode) setShowLightModal(cardId);
      }}
      optimisticLightBrightness={optimisticLightBrightness}
      setOptimisticLightBrightness={setOptimisticLightBrightness}
      t={t}
    />
  );
}
