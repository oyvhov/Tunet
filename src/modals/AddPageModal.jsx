import React, { useState } from 'react';
import { Plus, LayoutGrid, Music, Speaker, Lightbulb, Battery, Home } from 'lucide-react';
import IconPicker from '../components/ui/IconPicker';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalFooter, ModalHeader } from '../components/ui/ModalParts';
import Button from '../components/ui/Button';

const SELECTED_CONTAINER = 'bg-[var(--accent-bg)] border-[var(--accent-color)]';
const SELECTED_TEXT = 'text-[var(--accent-color)]';

const PageTypeButton = ({ type, icon: Icon, label, isActive, onSelect }) => (
  <button
    type="button"
    aria-pressed={isActive}
    onClick={() => onSelect(type)}
    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150 ease-out ${isActive ? `${SELECTED_CONTAINER} ${SELECTED_TEXT}` : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
  >
    <Icon className="h-4 w-4" /> {label}
  </button>
);

const PageTypeInfo = ({ title, description }) => (
  <div className="popup-surface rounded-2xl p-4 text-sm text-[var(--text-secondary)]">
    <p className="modal-section-label mb-2">{title}</p>
    <p className="leading-relaxed">{description}</p>
  </div>
);

export default function AddPageModal({
  isOpen,
  onClose,
  t,
  newPageLabel,
  setNewPageLabel,
  newPageIcon,
  setNewPageIcon,
  onCreate,
  onCreateMedia,
  onCreateSonos,
  onCreateLights,
  onCreateBattery,
  onCreateRoomExplorer,
}) {
  const [activeTab, setActiveTab] = useState('standard');
  const modalTitleId = 'add-page-modal-title';

  if (!isOpen) return null;

  const createActions = {
    standard: onCreate,
    media: onCreateMedia,
    sonos: onCreateSonos,
    lights: onCreateLights,
    battery: onCreateBattery,
    roomExplorer: onCreateRoomExplorer,
  };
  const createLabel = activeTab === 'sonos' ? t('sonos.createPage') : t('page.create');

  return (
    <AccessibleModalShell open={isOpen} onClose={onClose} titleId={modalTitleId} size="s">
      {() => (
        <>
          <ModalHeader
            title={t('modal.addPage.title')}
            closeLabel={t('common.close')}
            onClose={onClose}
          />

          <ModalBody className="space-y-6">
            <div>
              <p className="modal-section-label mb-2">{t('page.type')}</p>
              <div className="flex flex-wrap gap-2">
                <PageTypeButton
                  type="standard"
                  icon={LayoutGrid}
                  label={t('page.typeStandard')}
                  isActive={activeTab === 'standard'}
                  onSelect={setActiveTab}
                />
                <PageTypeButton
                  type="media"
                  icon={Music}
                  label={t('addCard.type.media')}
                  isActive={activeTab === 'media'}
                  onSelect={setActiveTab}
                />
                <PageTypeButton
                  type="sonos"
                  icon={Speaker}
                  label={t('addCard.type.sonos')}
                  isActive={activeTab === 'sonos'}
                  onSelect={setActiveTab}
                />
                <PageTypeButton
                  type="lights"
                  icon={Lightbulb}
                  label={t('addCard.type.light')}
                  isActive={activeTab === 'lights'}
                  onSelect={setActiveTab}
                />
                <PageTypeButton
                  type="battery"
                  icon={Battery}
                  label={t('addCard.type.battery')}
                  isActive={activeTab === 'battery'}
                  onSelect={setActiveTab}
                />
                <PageTypeButton
                  type="roomExplorer"
                  icon={Home}
                  label={t('addCard.type.roomExplorer')}
                  isActive={activeTab === 'roomExplorer'}
                  onSelect={setActiveTab}
                />
              </div>
            </div>

            {activeTab === 'standard' ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="add-page-name" className="modal-section-label block">
                    {t('form.name')}
                  </label>
                  <input
                    id="add-page-name"
                    type="text"
                    className="popup-surface w-full rounded-2xl px-4 py-3 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
                    value={newPageLabel}
                    onChange={(e) => setNewPageLabel(e.target.value)}
                    placeholder={t('form.exampleName')}
                  />
                </div>

                <div className="space-y-2">
                  <p className="modal-section-label">{t('form.chooseIcon')}</p>
                  <IconPicker
                    value={newPageIcon}
                    onSelect={setNewPageIcon}
                    onClear={() => setNewPageIcon(null)}
                    t={t}
                    maxHeightClass="max-h-60"
                  />
                </div>
              </>
            ) : activeTab === 'media' ? (
              <PageTypeInfo title={t('addCard.type.media')} description={t('media.chooseMedia')} />
            ) : activeTab === 'sonos' ? (
              <PageTypeInfo
                title={t('sonos.createTitle')}
                description={t('sonos.createDescription')}
              />
            ) : activeTab === 'lights' ? (
              <PageTypeInfo
                title={t('addCard.type.light')}
                description={
                  t('lights.createDescription') ||
                  'Control all your lights from one place with brightness and color controls.'
                }
              />
            ) : activeTab === 'battery' ? (
              <PageTypeInfo
                title={t('addCard.type.battery')}
                description={
                  t('battery.createDescription') ||
                  'Monitor all battery-powered device levels, get low battery warnings and track offline devices.'
                }
              />
            ) : activeTab === 'roomExplorer' ? (
              <PageTypeInfo
                title={t('addCard.type.roomExplorer')}
                description={
                  t('roomExplorer.createDescription') ||
                  'Browse all rooms and control every entity from one place.'
                }
              />
            ) : null}
          </ModalBody>

          <ModalFooter>
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" icon={<Plus />} onClick={createActions[activeTab]}>
              {createLabel}
            </Button>
          </ModalFooter>
        </>
      )}
    </AccessibleModalShell>
  );
}
