import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HeaderSidebar from '../components/sidebars/HeaderSidebar';

describe('HeaderSidebar', () => {
  it('updates the mobile header alignment', () => {
    const updateHeaderSettings = vi.fn();
    render(
      <HeaderSidebar
        open
        onClose={vi.fn()}
        headerTitle="My home"
        headerScale={1}
        headerSettings={{ mobileAlignment: 'center' }}
        updateHeaderTitle={vi.fn()}
        updateHeaderScale={vi.fn()}
        updateHeaderSettings={updateHeaderSettings}
        cardsOnlyMode={false}
        updateCardsOnlyMode={vi.fn()}
        onSwitchToTheme={vi.fn()}
        onSwitchToLayout={vi.fn()}
        t={(key) => key}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'header.headerLayout' }));
    fireEvent.click(screen.getByRole('button', { name: 'header.alignmentRight' }));

    expect(updateHeaderSettings).toHaveBeenCalledWith({ mobileAlignment: 'right' });
  });
});
