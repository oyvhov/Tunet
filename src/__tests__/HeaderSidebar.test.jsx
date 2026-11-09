import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HeaderSidebar from '../components/sidebars/HeaderSidebar';

const t = (key) => key;

function renderSidebar(headerSettings = { showTitle: true, showClock: true, showDate: true }) {
  return render(
    <HeaderSidebar
      open
      onClose={vi.fn()}
      headerTitle="Home"
      headerScale={1}
      headerSettings={headerSettings}
      updateHeaderTitle={vi.fn()}
      updateHeaderScale={vi.fn()}
      updateHeaderSettings={vi.fn()}
      cardsOnlyMode={false}
      updateCardsOnlyMode={vi.fn()}
      t={t}
    />
  );
}

const openVisibility = () =>
  fireEvent.click(screen.getByRole('button', { name: 'header.visibility' }));

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

  it('translates the font style choices', () => {
    renderSidebar();

    ['italic', 'normal', 'uppercase'].forEach((style) => {
      expect(screen.getByRole('button', { name: `header.fontStyle.${style}` })).toBeInTheDocument();
    });
  });

  it('gives the font style and clock format buttons a 44 px tap target', () => {
    renderSidebar();
    openVisibility();

    ['header.fontStyle.italic', '24h', '12h'].forEach((name) => {
      expect(screen.getByRole('button', { name }).className).toContain('min-h-11');
    });
  });

  it('gives the title and font fields a 44 px tap target', () => {
    renderSidebar();

    expect(screen.getByLabelText('header.titleLabel').className).toContain('min-h-11');
    expect(screen.getAllByLabelText('header.fontFamily')[0].className).toContain('min-h-11');
  });

  it('says how to get out of cards-only mode before it is switched on', () => {
    renderSidebar();
    openVisibility();

    expect(screen.getByText('header.cardsOnlyExitHint')).toBeInTheDocument();
  });

  it('leaves out the phone clock switch while the clock is hidden everywhere', () => {
    renderSidebar({ showTitle: true, showClock: false, showDate: true });
    openVisibility();

    expect(
      screen.queryByRole('switch', { name: 'header.showClockOnMobile' })
    ).not.toBeInTheDocument();
  });
});
