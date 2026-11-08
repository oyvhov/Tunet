import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SidebarContainer from '../components/sidebars/SidebarContainer';

const renderPanel = (props = {}) =>
  render(
    <SidebarContainer open onClose={vi.fn()} title="Panel" testId="panel" {...props}>
      <p>Content</p>
    </SidebarContainer>
  );

const panel = () => screen.getByTestId('panel');
const backdrop = () => document.querySelector('.tunet-sidebar-backdrop');
const peek = () => screen.getByTestId('sidebar-peek');

const expectPeeking = () => {
  expect(panel()).toHaveAttribute('data-peeking', 'true');
  expect(backdrop().style.opacity).toBe('0');
};

const expectNotPeeking = () => {
  expect(panel()).not.toHaveAttribute('data-peeking');
  expect(backdrop().style.opacity).not.toBe('0');
};

describe('SidebarContainer peek', () => {
  it('has no peek button without a label', () => {
    renderPanel();

    expect(screen.queryByTestId('sidebar-peek')).not.toBeInTheDocument();
  });

  it('labels the peek button', () => {
    renderPanel({ peekLabel: 'View dashboard' });

    expect(peek()).toHaveAccessibleName('View dashboard');
  });

  it('hides the panel only while the button is held', () => {
    renderPanel({ peekLabel: 'View dashboard' });
    expectNotPeeking();

    fireEvent.pointerDown(peek(), { pointerId: 1 });
    expectPeeking();

    fireEvent.pointerUp(peek(), { pointerId: 1 });
    expectNotPeeking();
  });

  it.each([
    ['pointer cancel', fireEvent.pointerCancel],
    ['lost capture', fireEvent.lostPointerCapture],
  ])('brings the panel back after %s', (_name, interrupt) => {
    renderPanel({ peekLabel: 'View dashboard' });
    fireEvent.pointerDown(peek(), { pointerId: 1 });

    interrupt(peek(), { pointerId: 1 });

    expectNotPeeking();
  });

  it('works with the space bar held down', () => {
    renderPanel({ peekLabel: 'View dashboard' });

    fireEvent.keyDown(peek(), { key: ' ' });
    expectPeeking();

    fireEvent.keyUp(peek(), { key: ' ' });
    expectNotPeeking();
  });

  it('brings the panel back when the held button loses focus', () => {
    renderPanel({ peekLabel: 'View dashboard' });
    fireEvent.keyDown(peek(), { key: ' ' });

    fireEvent.blur(peek());

    expectNotPeeking();
  });

  it('blocks the long-press context menu', () => {
    renderPanel({ peekLabel: 'View dashboard' });
    const contextMenu = createEvent.contextMenu(peek());

    fireEvent(peek(), contextMenu);

    expect(contextMenu.defaultPrevented).toBe(true);
  });
});
