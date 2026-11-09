import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Header from '../layouts/Header';

vi.mock('../contexts', () => ({
  useConfig: () => ({ language: 'en' }),
}));

const baseProps = {
  now: new Date('2026-08-19T10:30:00'),
  headerTitle: 'My home',
  headerScale: 1,
  editMode: false,
  setShowHeaderEditModal: vi.fn(),
  t: (key) => key,
  isMobile: true,
};

describe('Header edit entry', () => {
  it.each([['classic'], ['battery']])(
    'gives the add-header button a 44 px tap target in the %s layout',
    (headerStyle) => {
      render(
        <Header
          {...baseProps}
          editMode
          headerSettings={{ showTitle: false, showClock: true, showDate: true, headerStyle }}
        />
      );

      expect(screen.getByRole('button', { name: 'header.addHeader' })).toHaveClass('min-h-11');
    }
  );
});

describe('Header mobile alignment', () => {
  it.each([
    ['left', 'items-start', 'text-left', 'justify-start'],
    ['center', 'items-center', 'text-center', 'justify-center'],
    ['right', 'items-end', 'text-right', 'justify-end'],
  ])('aligns the classic mobile header %s', (alignment, itemsClass, textClass, justifyClass) => {
    const { container } = render(
      <Header
        {...baseProps}
        headerSettings={{
          showTitle: true,
          showClock: false,
          showDate: true,
          mobileAlignment: alignment,
        }}
      />
    );

    const title = screen.getByRole('heading', { name: 'My home' });
    expect(title.parentElement).toHaveClass(justifyClass);
    expect(title.parentElement.parentElement).toHaveClass(itemsClass, textClass);
    expect(container.querySelector('header')).toBeInTheDocument();
  });

  it('keeps the title and clock on one row on phones', () => {
    render(
      <Header
        {...baseProps}
        headerSettings={{ showTitle: true, showClock: true, showClockOnMobile: true }}
      />
    );

    const row = screen.getByRole('heading', { name: 'My home' }).parentElement.parentElement;
    expect(row).toHaveClass('items-baseline');
    expect(row).not.toHaveClass('flex-col');
    expect(row).toContainElement(screen.getByRole('heading', { level: 2 }));
  });

  it('applies the selected alignment to the battery header and mobile date', () => {
    const { container } = render(
      <Header
        {...baseProps}
        headerSettings={{
          showTitle: true,
          showClock: true,
          showClockOnMobile: true,
          showDate: true,
          headerStyle: 'battery',
          mobileAlignment: 'right',
        }}
      />
    );

    expect(container.querySelector('.battery-bar')).toHaveClass('battery-bar--align-right');
    expect(screen.getByText(/Wednesday/)).toHaveClass('text-right');
  });
});
