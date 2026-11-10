import { render, screen } from '@testing-library/react';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import CardName from '../components/ui/CardName';

// jsdom has no layout, so the test decides how wide the text is for each fit step.
let widthsByFit: Record<string, number> = {};

const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
const originalClient = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');

Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
  configurable: true,
  get() {
    const fit = (this as HTMLElement).dataset.fit;
    return fit !== undefined && fit in widthsByFit ? widthsByFit[fit] : 0;
  },
});
Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
  configurable: true,
  get() {
    return (this as HTMLElement).dataset.fit !== undefined ? 100 : 0;
  },
});

afterEach(() => {
  widthsByFit = {};
});

describe('CardName', () => {
  it('wraps between words and never inside a word', () => {
    widthsByFit = { '0': 90 };
    render(<CardName>Stove taklys</CardName>);
    const name = screen.getByText('Stove taklys');
    expect(name.className).toContain('[overflow-wrap:normal]');
    expect(name.className).not.toContain('break-words');
    expect(name.dataset.fit).toBe('0');
    expect(name.getAttribute('title')).toBe('Stove taklys');
  });

  // The name's own size is 12px inside a 16px parent: each step scales the 12px, not the parent.
  const renderSized = (text: string) =>
    render(
      <div style={{ fontSize: '16px' }}>
        <CardName style={{ fontSize: '12px' }}>{text}</CardName>
      </div>
    );

  it('shrinks the text one step from its own size when a word is a little too wide', () => {
    widthsByFit = { '0': 120, '1': 100 };
    renderSized('Garasjeport');
    const name = screen.getByText('Garasjeport');
    expect(name.dataset.fit).toBe('1');
    expect(name.style.fontSize).toBe('11.04px');
  });

  it('shrinks two steps before giving up', () => {
    widthsByFit = { '0': 130, '1': 115, '2': 100 };
    renderSized('Garasjeportopnar');
    const name = screen.getByText('Garasjeportopnar');
    expect(name.dataset.fit).toBe('2');
    expect(name.style.fontSize).toBe('10.2px');
  });

  it('keeps two lines and cuts the long word with an ellipsis when nothing else fits', () => {
    widthsByFit = { '0': 200, '1': 190, '2': 180, clip: 100 };
    render(<CardName>Soverom temperaturmålar</CardName>);
    const name = screen.getByText('Soverom temperaturmålar');
    expect(name.dataset.fit).toBe('clip');
    expect(name.className).toContain('line-clamp-2');
    expect(name.className).toContain('text-ellipsis');
    expect(name.className).not.toContain('truncate');
  });

  it('ends with an ellipsis on one line when a one-line name does not fit', () => {
    widthsByFit = { '0': 200, '1': 190, '2': 180, clip: 100 };
    render(<CardName lines={1}>Varmepumpeinnstillingar</CardName>);
    const name = screen.getByText('Varmepumpeinnstillingar');
    expect(name.dataset.fit).toBe('clip');
    expect(name.className).toContain('truncate');
  });
});

afterAll(() => {
  if (originalScroll) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', originalScroll);
  if (originalClient) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClient);
});
