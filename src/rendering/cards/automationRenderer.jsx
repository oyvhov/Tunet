import { Workflow } from '../../icons';
import { getIconComponent } from '../../icons';

export function renderAutomationCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, customNames, customIcons, getA, callService, t } = ctx;
  const isOn = entities[cardId]?.state === 'on';
  const friendlyName = customNames[cardId] || getA(cardId, 'friendly_name') || cardId;
  const automationIconName = customIcons[cardId] || entities[cardId]?.attributes?.icon;
  const Icon = automationIconName ? getIconComponent(automationIconName) || Workflow : Workflow;

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      className={`touch-feedback group relative mb-3 flex w-full break-inside-avoid items-center justify-between overflow-hidden rounded-2xl border p-4 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`}
      style={{
        ...cardStyle,
        backgroundColor: isOn
          ? 'color-mix(in srgb, var(--accent-color) 8%, transparent)'
          : 'rgba(15, 23, 42, 0.6)',
        borderColor: isOn
          ? 'color-mix(in srgb, var(--accent-color) 24%, transparent)'
          : editMode
            ? 'color-mix(in srgb, var(--accent-color) 26%, transparent)'
            : 'rgba(255, 255, 255, 0.04)',
      }}
      onClick={(_e) => {
        if (!editMode) callService('automation', 'toggle', { entity_id: cardId });
      }}
    >
      {getControls(cardId)}
      <div className="flex items-center gap-4">
        <div
          className={`rounded-2xl p-3 transition-all ${isOn ? '' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
          style={
            isOn
              ? {
                  backgroundColor: 'color-mix(in srgb, var(--accent-color) 14%, transparent)',
                  color: 'var(--accent-color)',
                }
              : undefined
          }
        >
          <Icon className="h-5 w-5 stroke-[1.5px]" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm leading-tight font-bold text-[var(--text-primary)]">
              {friendlyName}
            </span>
          </div>
          <span className="mt-0.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
            {isOn ? t('status.active') : t('status.off')}
          </span>
        </div>
      </div>
      <div
        className={`relative h-6 w-10 rounded-full transition-all ${isOn ? '' : 'bg-[var(--glass-bg-hover)]'}`}
        style={
          isOn
            ? { backgroundColor: 'color-mix(in srgb, var(--accent-color) 68%, transparent)' }
            : undefined
        }
      >
        <div
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all ${isOn ? 'left-[calc(100%-20px)]' : 'left-1'}`}
        />
      </div>
    </div>
  );
}
