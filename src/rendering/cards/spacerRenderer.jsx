import { SpacerCard } from '../../components';

/**
 * @param {string} cardId
 * @param {Record<string, any>} dragProps
 * @param {(id: string) => any} getControls
 * @param {Record<string, any>} cardStyle
 * @param {string} settingsKey
 * @param {Record<string, any>} ctx
 */
export function renderSpacerCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { editMode, cardSettings } = ctx;
  return (
    <SpacerCard
      key={cardId}
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      cardSettings={cardSettings}
      settingsKey={settingsKey}
      editMode={editMode}
    />
  );
}
