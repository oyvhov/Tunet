import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AddPageModal from '../modals/AddPageModal';
import EditPageModal from '../modals/EditPageModal';

vi.mock('../contexts', () => ({
  usePages: () => ({ pagesConfig: { pages: ['home', 'kitchen'] } }),
}));

const t = (key: string) => key;

const editPage = (onDelete = vi.fn()) => (
  <EditPageModal
    isOpen
    onClose={vi.fn()}
    t={t}
    editingPage="kitchen"
    pageSettings={{ kitchen: { label: 'Kitchen' } }}
    savePageSetting={vi.fn()}
    pageDefaults={{}}
    onDelete={onDelete}
  />
);

describe('EditPageModal', () => {
  it('asks for confirmation before deleting the page', async () => {
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm');
    render(editPage(onDelete));

    fireEvent.click(screen.getByRole('button', { name: 'form.deletePage' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(await screen.findByText('confirm.deletePage')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'common.delete' }));
    });
    expect(onDelete).toHaveBeenCalledWith('kitchen');
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('keeps the page when the confirmation is cancelled', async () => {
    const onDelete = vi.fn();
    render(editPage(onDelete));

    fireEvent.click(screen.getByRole('button', { name: 'form.deletePage' }));
    await screen.findByText('confirm.deletePage');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    });
    expect(onDelete).not.toHaveBeenCalled();
  });
});

describe('AddPageModal', () => {
  it('labels the chips as page types and creates from the footer', () => {
    const onCreate = vi.fn();
    const onCreateMedia = vi.fn();
    render(
      <AddPageModal
        isOpen
        onClose={vi.fn()}
        t={t}
        newPageLabel=""
        setNewPageLabel={vi.fn()}
        newPageIcon={null}
        setNewPageIcon={vi.fn()}
        onCreate={onCreate}
        onCreateMedia={onCreateMedia}
        onCreateSonos={vi.fn()}
        onCreateLights={vi.fn()}
        onCreateBattery={vi.fn()}
        onCreateRoomExplorer={vi.fn()}
      />
    );

    expect(screen.getByText('page.type')).toBeInTheDocument();
    expect(screen.queryByText('addCard.cardType')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'page.create' }));
    expect(onCreate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'addCard.type.media' }));
    fireEvent.click(screen.getByRole('button', { name: 'page.create' }));
    expect(onCreateMedia).toHaveBeenCalledTimes(1);
  });
});
