import { GenericEnergyCostCard } from '../../components';
import { getSettings } from '../helpers';

export function renderGenericCostCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, customIcons, setShowCostModal, t } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  return (
    <GenericEnergyCostCard
      cardId={cardId}
      todayEntityId={settings.todayId}
      monthEntityId={settings.monthId}
      entities={entities}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      customNames={customNames}
      customIcons={customIcons}
      decimals={settings.decimals ?? 0}
      settings={settings}
      onOpen={() => setShowCostModal(cardId)}
      t={t}
    />
  );
}
