import React from 'react';
import { Trash2 } from 'lucide-react';
import IconPicker from '../components/ui/IconPicker';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalFooter, ModalHeader } from '../components/ui/ModalParts';
import Button from '../components/ui/Button';
import Segmented from '../components/ui/Segmented';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { usePages } from '../contexts';

const SwitchRow = ({ label, checked, onToggle }) => (
  <div className="popup-surface flex items-center justify-between gap-4 rounded-2xl px-4 py-3">
    <span className="text-sm text-[var(--text-primary)]">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-6 w-12 flex-none rounded-full transition-colors before:absolute before:-inset-2.5 before:content-[''] ${checked ? 'bg-[var(--accent-color)]' : 'bg-[var(--glass-bg-hover)]'}`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-7' : 'left-1'}`}
      />
    </button>
  </div>
);

const EditPageModal = ({
  isOpen,
  onClose,
  t,
  editingPage,
  pageSettings,
  savePageSetting,
  pageDefaults,
  onDelete,
}) => {
  const modalTitleId = 'edit-page-modal-title';
  const { pagesConfig } = usePages();
  const { confirm, dialog } = useConfirmDialog({
    cancel: t('common.cancel'),
    close: t('common.close'),
  });
  const isSinglePage = (pagesConfig?.pages || []).length === 1;
  const [nameDraft, setNameDraft] = React.useState(null);
  if (!isOpen) return null;

  const pageGridColumns = pageSettings[editingPage]?.gridColumns;

  const handleDelete = async () => {
    const ok = await confirm({
      title: t('form.deletePage'),
      message: t('confirm.deletePage'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (ok) onDelete(editingPage);
  };

  return (
    <>
      <AccessibleModalShell open={isOpen} onClose={onClose} titleId={modalTitleId} size="s">
        {() => (
          <>
            <ModalHeader
              title={t('modal.editPage.title')}
              closeLabel={t('common.close')}
              onClose={onClose}
            />

            <ModalBody className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="edit-page-name" className="modal-section-label block">
                  {t('form.name')}
                </label>
                <input
                  id="edit-page-name"
                  type="text"
                  className="popup-surface w-full rounded-2xl px-4 py-3 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
                  value={
                    nameDraft ??
                    (pageSettings[editingPage]?.label ||
                      pageDefaults[editingPage]?.label ||
                      editingPage)
                  }
                  onChange={(e) => {
                    setNameDraft(e.target.value);
                    savePageSetting(editingPage, 'label', e.target.value);
                  }}
                  onBlur={() => setNameDraft(null)}
                />
              </div>

              <div className="space-y-2">
                <p className="modal-section-label">{t('form.chooseIcon')}</p>
                <IconPicker
                  value={pageSettings[editingPage]?.icon || null}
                  onSelect={(iconName) => {
                    savePageSetting(editingPage, 'icon', iconName);
                  }}
                  onClear={() => {
                    savePageSetting(editingPage, 'icon', null);
                  }}
                  t={t}
                  maxHeightClass="max-h-72"
                />
              </div>

              <SwitchRow
                label={t('form.hidePage')}
                checked={pageSettings[editingPage]?.hidden}
                onToggle={() => {
                  savePageSetting(editingPage, 'hidden', !pageSettings[editingPage]?.hidden);
                }}
              />

              {isSinglePage && (
                <SwitchRow
                  label={t('form.hideSinglePagePill')}
                  checked={pageSettings[editingPage]?.hideSinglePagePill}
                  onToggle={() => {
                    savePageSetting(
                      editingPage,
                      'hideSinglePagePill',
                      !pageSettings[editingPage]?.hideSinglePagePill
                    );
                  }}
                />
              )}

              <div className="space-y-2">
                <p id="edit-page-columns-label" className="modal-section-label">
                  {t('form.gridColumnsPage')}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{t('form.gridColumnsPageHint')}</p>
                <Segmented
                  block
                  ariaLabelledBy="edit-page-columns-label"
                  value={pageGridColumns ?? null}
                  onChange={(cols) => savePageSetting(editingPage, 'gridColumns', cols)}
                  options={[1, 2, 3, 4, 5].map((cols) => ({ value: cols, label: String(cols) }))}
                />
                {pageGridColumns != null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    block
                    onClick={() => savePageSetting(editingPage, 'gridColumns', null)}
                  >
                    {t('settings.useGlobal')}
                  </Button>
                )}
              </div>
            </ModalBody>

            <ModalFooter>
              {editingPage !== 'home' && (
                <Button
                  variant="destructive"
                  icon={<Trash2 />}
                  onClick={handleDelete}
                  className="sm:mr-auto"
                >
                  {t('form.deletePage')}
                </Button>
              )}
              <Button variant="primary" onClick={onClose}>
                {t('nav.done')}
              </Button>
            </ModalFooter>
          </>
        )}
      </AccessibleModalShell>
      {dialog}
    </>
  );
};
export default EditPageModal;
