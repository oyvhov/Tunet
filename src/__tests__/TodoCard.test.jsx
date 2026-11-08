import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/haClient', () => ({
  getTodoItems: vi.fn(),
  addTodoItem: vi.fn(),
  updateTodoItem: vi.fn(),
  removeTodoItem: vi.fn(),
}));

vi.mock('../components/ui/AccessibleModalShell', () => ({
  default: ({ open, children }) => (open ? <div>{children('title')}</div> : null),
  useModalShell: () => null,
}));

import TodoCard from '../components/cards/TodoCard';
import TodoModal from '../modals/TodoModal';
import { addTodoItem, getTodoItems, removeTodoItem, updateTodoItem } from '../services/haClient';

const t = (key) => key;
const items = [
  { uid: '1', summary: 'Milk', status: 'needs_action' },
  { uid: '2', summary: 'Bread', status: 'completed' },
];
const listEntity = (state = '2') => ({ entity_id: 'todo.home', state, attributes: {} });
const makeConn = () => {
  const listeners = new Set();
  return {
    addEventListener: (_name, fn) => listeners.add(fn),
    removeEventListener: (_name, fn) => listeners.delete(fn),
    reconnect: () => listeners.forEach((fn) => fn()),
  };
};
const renderCard = (props = {}) => {
  const conn = props.conn || makeConn();
  render(
    <TodoCard
      cardId="todo"
      settings={{ todoEntityId: 'todo.home' }}
      conn={conn}
      t={t}
      className=""
      entity={listEntity()}
      entitiesReady
      {...props}
    />
  );
  return conn;
};
const renderModal = (props = {}) => {
  const conn = props.conn || makeConn();
  render(
    <TodoModal
      show
      onClose={vi.fn()}
      conn={conn}
      entities={{ 'todo.home': listEntity() }}
      settings={{ todoEntityId: 'todo.home' }}
      t={t}
      {...props}
    />
  );
  return conn;
};

describe('Todo', () => {
  beforeAll(() => {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });
  beforeEach(() => {
    vi.clearAllMocks();
    getTodoItems.mockResolvedValue(items);
    addTodoItem.mockResolvedValue({});
    updateTodoItem.mockResolvedValue({});
    removeTodoItem.mockResolvedValue({});
  });
  afterEach(() => vi.restoreAllMocks());

  describe.each([
    ['card', renderCard],
    ['popup', renderModal],
  ])('%s delete', (_name, renderView) => {
    const firstDelete = async () => {
      await screen.findByText('Milk');
      return screen.getAllByRole('button', { name: 'todo.delete' })[0];
    };

    it('is visible without hover and has a large hit area', async () => {
      renderView();
      const button = await firstDelete();
      expect(button.className).toContain('touch:text-[var(--status-error-fg)]');
      expect(button.className).toMatch(/before:-inset-3/);
    });

    it('needs a second tap', async () => {
      renderView();
      const button = await firstDelete();
      fireEvent.click(button);
      expect(removeTodoItem).not.toHaveBeenCalled();
      expect(button).toHaveTextContent('todo.deleteConfirm');
      fireEvent.click(button);
      await waitFor(() =>
        expect(removeTodoItem).toHaveBeenCalledWith(expect.anything(), 'todo.home', '1')
      );
    });

    it('disarms by itself', async () => {
      renderView();
      const button = await firstDelete();
      vi.useFakeTimers();
      fireEvent.click(button);
      act(() => vi.advanceTimersByTime(3100));
      vi.useRealTimers();
      expect(screen.getAllByRole('button', { name: 'todo.delete' }).length).toBe(2);
      expect(removeTodoItem).not.toHaveBeenCalled();
    });

    it('refetches after a reconnect', async () => {
      const conn = renderView();
      await screen.findByText('Milk');
      const before = getTodoItems.mock.calls.length;
      await act(async () => conn.reconnect());
      await waitFor(() => expect(getTodoItems.mock.calls.length).toBe(before + 1));
    });
  });

  describe('card', () => {
    it.each([
      ['a missing list', { entity: undefined, entitiesReady: true }, 'status.unavailable'],
      ['an unavailable list', { entity: listEntity('unavailable') }, 'status.unavailable'],
      ['an unknown list', { entity: listEntity('unknown') }, 'common.unknown'],
    ])('says so for %s', async (_name, props, label) => {
      renderCard(props);
      await screen.findByText(label);
      expect(screen.queryByText('todo.empty')).toBeNull();
    });

    it('says so on the small card too', async () => {
      renderCard({ entity: listEntity('unavailable'), size: 'small' });
      await screen.findByText('status.unavailable');
      expect(document.body).not.toHaveTextContent('Empty');
    });

    it('does not call a list missing before the entities have arrived', async () => {
      renderCard({ entity: undefined, entitiesReady: false });
      await screen.findByText('Milk');
      expect(screen.queryByText('status.unavailable')).toBeNull();
    });

    it('adds with a visible button', async () => {
      renderCard();
      await screen.findByText('Milk');
      fireEvent.change(screen.getByPlaceholderText('todo.addPlaceholder'), {
        target: { value: 'Eggs' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'common.add' }));
      await waitFor(() =>
        expect(addTodoItem).toHaveBeenCalledWith(expect.anything(), 'todo.home', 'Eggs')
      );
    });

    it('still adds with Enter', async () => {
      renderCard();
      await screen.findByText('Milk');
      const input = screen.getByPlaceholderText('todo.addPlaceholder');
      fireEvent.change(input, { target: { value: 'Eggs' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      await waitFor(() => expect(addTodoItem).toHaveBeenCalled());
    });

    it.each([
      ['add', addTodoItem],
      ['toggle', updateTodoItem],
      ['delete', removeTodoItem],
    ])('shows a failed %s', async (name, service) => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      service.mockRejectedValue(new Error('down'));
      renderCard();
      await screen.findByText('Milk');
      if (name === 'add') {
        fireEvent.change(screen.getByPlaceholderText('todo.addPlaceholder'), {
          target: { value: 'Eggs' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'common.add' }));
      } else if (name === 'toggle') {
        fireEvent.click(screen.getByText('Milk'));
      } else {
        const button = screen.getAllByRole('button', { name: 'todo.delete' })[0];
        fireEvent.click(button);
        fireEvent.click(button);
      }
      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('todo.saveFailed'));
    });
  });

  describe('popup', () => {
    it.each([
      ['missing', {}],
      ['unavailable', { 'todo.home': listEntity('unavailable') }],
    ])('says a %s list is unavailable', async (_name, entities) => {
      renderModal({ entities });
      await screen.findByText('status.unavailable');
      expect(screen.queryByText('todo.allDone')).toBeNull();
    });
  });
});
