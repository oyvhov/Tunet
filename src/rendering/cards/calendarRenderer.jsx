import { CalendarCard } from '../../components';
import { getLocaleForLanguage } from '../../i18n';
import { getSettings, stopPropagation } from '../helpers';

export function renderCalendarCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    editMode,
    conn,
    cardSettings,
    customNames,
    customIcons,
    language,
    setShowCalendarModal,
    setShowEditCardModal,
    setEditCardSettingsKey,
    t,
  } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  const sizeSetting = settings.size;
  const locale = getLocaleForLanguage(language);
  return (
    <CalendarCard
      key={cardId}
      cardId={cardId}
      settings={settings}
      conn={conn}
      t={t}
      locale={locale}
      dragProps={dragProps}
      getControls={getControls}
      isEditMode={editMode}
      className="h-full"
      style={cardStyle}
      size={sizeSetting}
      iconName={customIcons[cardId] || null}
      customName={customNames[cardId] || null}
      onClick={(e) => {
        stopPropagation(e);
        if (editMode) {
          setShowEditCardModal(cardId);
          setEditCardSettingsKey(settingsKey);
        } else {
          setShowCalendarModal(true);
        }
      }}
    />
  );
}
