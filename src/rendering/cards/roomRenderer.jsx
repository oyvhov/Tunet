import { RoomCard } from '../../components';
import { getSettings } from '../helpers';

export function renderRoomCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const {
    entities,
    editMode,
    conn,
    cardSettings,
    customNames,
    customIcons,
    callService,
    setShowRoomModal,
    setShowEditCardModal,
    setEditCardSettingsKey,
    setActivePage,
    t,
  } = ctx;
  const roomSettings = getSettings(cardSettings, settingsKey, cardId);
  return (
    <RoomCard
      cardId={cardId}
      settings={roomSettings}
      entities={entities}
      conn={conn}
      callService={(domain, service, data) => callService(domain, service, data)}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      customNames={customNames}
      customIcons={customIcons}
      onOpen={() => {
        if (editMode) {
          setShowEditCardModal(cardId);
          setEditCardSettingsKey(settingsKey);
        } else if (
          roomSettings.navigateOnTap === true &&
          roomSettings.navigateToPageId &&
          setActivePage
        ) {
          setActivePage(roomSettings.navigateToPageId);
        } else {
          setShowRoomModal(cardId);
        }
      }}
      t={t}
    />
  );
}
