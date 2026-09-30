import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import ModernDropdown from '../components/ui/ModernDropdown';

function Editor() {
  const [open, setOpen] = useState(true);
  return (
    <AccessibleModalShell open={open} onClose={() => setOpen(false)}>
      {(titleId) => (
        <>
          <h2 id={titleId}>Card settings</h2>
          <ModernDropdown
            label="Action"
            icon={null}
            options={['Scene', 'Toggle']}
            current="Scene"
            onChange={() => {}}
            menuPortal
            menuZIndex={130}
          />
        </>
      )}
    </AccessibleModalShell>
  );
}

describe('Modal dropdown interaction', () => {
  it('closes the action menu before closing its editor with Escape', () => {
    render(<Editor />);
    const trigger = screen.getByRole('button', { name: 'Action: Scene' });
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(trigger).toHaveFocus();
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('closes an open menu before the editor even when focus has left the dropdown', () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: 'Action: Scene' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
