import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import LockCard from '../components/cards/LockCard';
import LockModal from '../modals/LockModal';
import type { EntityMap } from '../types/dashboard';

vi.mock('../services/haClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/haClient')>()),
  getHistory: vi.fn(async () => []),
}));

const LOCK = 'lock.door';
const t = (key: string) => key;
const OPENABLE = { supported_features: 1 };

const entities = (state: string, attributes: Record<string, unknown> = {}): EntityMap => ({
  [LOCK]: { entity_id: LOCK, state, attributes, last_changed: '', last_updated: '' },
});

function renderCard(state: string, attributes: Record<string, unknown>, size?: 'small') {
  const callService = vi.fn(async () => ({}));
  const onOpen = vi.fn();
  const map = entities(state, attributes);
  const props = {
    cardId: LOCK,
    lockId: LOCK,
    entities: map,
    conn: {},
    cardSettings: { key: { size } },
    settingsKey: 'key',
    customNames: {},
    customIcons: {},
    getA: () => LOCK,
    callService,
    onOpen,
    t,
  } as unknown as ComponentProps<typeof LockCard>;
  return { ...render(<LockCard {...props} />), callService, onOpen };
}

function renderModal(state: string, attributes: Record<string, unknown>) {
  const callService = vi.fn(async () => ({}));
  const props = {
    entityId: LOCK,
    entity: entities(state, attributes)[LOCK],
    conn: null,
    callService,
    onClose: () => {},
    t,
  } as unknown as ComponentProps<typeof LockModal>;
  render(<LockModal {...props} />);
  return { callService };
}

const button = (name: string) => screen.getByRole('button', { name });

describe('lock card', () => {
  let prompt: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    prompt = vi.fn(() => '1234');
    vi.stubGlobal('prompt', prompt);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it.each([undefined, 'small'] as const)('asks before opening (size %s)', (size) => {
    const { callService, container } = renderCard('locked', OPENABLE, size);
    fireEvent.click(button('lock.action.open'));
    expect(callService).not.toHaveBeenCalled();
    expect(container).toHaveTextContent('lock.action.confirmOpen');

    fireEvent.click(button('lock.action.confirmOpen'));
    expect(callService).toHaveBeenCalledWith('lock', 'open', { entity_id: LOCK });
  });

  it('forgets the open confirmation after a few seconds', () => {
    vi.useFakeTimers();
    const { callService, container } = renderCard('locked', OPENABLE);
    fireEvent.click(button('lock.action.open'));
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(container).not.toHaveTextContent('lock.action.confirmOpen');
    fireEvent.click(button('lock.action.open'));
    expect(callService).not.toHaveBeenCalled();
  });

  it('shows the unlock confirmation as visible text', () => {
    const { container, callService } = renderCard('locked', {});
    fireEvent.click(button('lock.action.unlock'));
    expect(container).toHaveTextContent('lock.action.confirmUnlock');
    expect(callService).not.toHaveBeenCalled();
  });

  it('does not let a confirmation for one action carry over to the other', () => {
    const { callService } = renderCard('locked', OPENABLE);
    fireEvent.click(button('lock.action.open'));
    fireEvent.click(button('lock.action.unlock'));
    expect(callService).not.toHaveBeenCalled();
  });

  it('draws unlock and open with different icons on the small card', () => {
    renderCard('locked', OPENABLE, 'small');
    expect(button('lock.action.unlock').innerHTML).not.toBe(button('lock.action.open').innerHTML);
  });

  it.each([
    ['locked', 'lock.action.unlock'],
    ['locked', 'lock.action.open'],
    ['unlocked', 'lock.action.lock'],
  ])('opens the popup instead of prompting when %s needs a code for %s', (state, name) => {
    const { callService, onOpen } = renderCard(state, { ...OPENABLE, code_format: '^\\d{4}$' });
    fireEvent.click(button(name));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(prompt).not.toHaveBeenCalled();
    expect(callService).not.toHaveBeenCalled();
  });
});

describe('lock popup', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const renderConnected = (state: string, attributes: Record<string, unknown>) => {
    const callService = vi.fn(async () => ({}));
    const props = {
      entityId: LOCK,
      entity: entities(state, attributes)[LOCK],
      conn: { sendMessagePromise: vi.fn(async () => ({})) },
      callService,
      onClose: () => {},
      t,
    } as unknown as ComponentProps<typeof LockModal>;
    render(<LockModal {...props} />);
    return { callService };
  };

  it('asks before opening and says so', async () => {
    const { callService } = renderConnected('locked', OPENABLE);
    await act(async () => {});
    fireEvent.click(button('lock.action.open'));
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(button('lock.action.confirmOpen'));
    expect(callService).toHaveBeenCalledWith('lock', 'open', { entity_id: LOCK });
  });

  it('does not carry a confirmation between unlock and open', async () => {
    const { callService } = renderConnected('locked', OPENABLE);
    await act(async () => {});
    fireEvent.click(button('lock.action.unlock'));
    fireEvent.click(button('lock.action.open'));
    expect(callService).not.toHaveBeenCalled();
  });

  it('keeps every action disabled without a connection', async () => {
    const { callService } = renderModal('locked', OPENABLE);
    await act(async () => {});
    fireEvent.click(button('lock.action.open'));
    expect(callService).not.toHaveBeenCalled();
  });
});
