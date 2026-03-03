import { CameraCard } from '../../components';
import { getSettings, renderMissingEntityWhenReady } from '../helpers';

/**
 * @param {string} cardId
 * @param {Record<string, any>} dragProps
 * @param {(id: string) => any} getControls
 * @param {Record<string, any>} cardStyle
 * @param {string} settingsKey
 * @param {Record<string, any>} ctx
 */
export function renderCameraCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    cardSettings,
    customNames,
    customIcons,
    getEntityImageUrl,
    setShowCameraModal,
    t,
  } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  const entityId = settings.cameraId;
  const entity = entityId ? entities[entityId] : null;
  const sizeSetting = settings.size;

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
    <CameraCard
      key={cardId}
      cardId={cardId}
      entityId={entityId}
      entity={entity}
      settings={settings}
      entities={entities}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      customNames={customNames}
      customIcons={customIcons}
      getEntityImageUrl={getEntityImageUrl}
      onOpen={() => setShowCameraModal(cardId)}
      size={sizeSetting}
      t={t}
    />
  );
}
