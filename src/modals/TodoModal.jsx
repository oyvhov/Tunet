import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Circle, CheckCircle2, ListChecks, AlertCircle } from 'lucide-react';
import { getTodoItems, addTodoItem, updateTodoItem, removeTodoItem } from '../services/haClient';
import { logger } from '../utils/logger';
import { useRefreshTick } from '../hooks/useRefreshTick';
import { getUnavailableLabel, isUnavailableState } from '../utils/entityState';
import { TodoDeleteButton } from '../components/cards/TodoCard';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader } from '../components/ui/ModalParts';
import Button from '../components/ui/Button';

/**
 * TodoModal - Full-screen modal for managing a todo list from Home Assistant.
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {(e?: any) => void} props.onClose - Close handler
 * @param {Object} props.conn - Home Assistant WebSocket connection
 * @param {Object} props.entities - All HA entities
 * @param {Object} props.settings - Card settings (contains todoEntityId)
 * @param {Function} props.t - Translation function
 */
export default function TodoModal({ show, onClose, conn, entities, settings, t }) {
  const translate = t || ((key) => key);
  const todoEntityId = settings?.todoEntityId;
  const modalTitleId = `todo-modal-title-${(todoEntityId || 'todo').replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [adding, setAdding] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const listEntity = todoEntityId ? entities?.[todoEntityId] : null;
  const listUnavailable =
    !!todoEntityId && (listEntity ? isUnavailableState(listEntity.state) : !!entities);
  const refreshTick = useRefreshTick(conn, { enabled: Boolean(show) });

  const fetchItems = useCallback(async () => {
    if (!conn || !todoEntityId) {
      logger.debug('[TodoModal] fetchItems: conn or todoEntityId missing');
      return;
    }
    setLoading(true);
    try {
      logger.debug('[TodoModal] fetching items for:', todoEntityId);
      const result = await getTodoItems(conn, todoEntityId);
      logger.debug('[TodoModal] items result:', result);
      setItems(result || []);
    } catch (err) {
      setError(err.message);
      console.error('TodoModal: Failed to fetch items', err);
    } finally {
      setLoading(false);
    }
  }, [conn, todoEntityId]);

  useEffect(() => {
    if (!show || listUnavailable) return;
    fetchItems();
  }, [show, listUnavailable, fetchItems, refreshTick]);

  // Refresh every 30 seconds while open
  useEffect(() => {
    if (!show || !conn || !todoEntityId) return;
    const interval = setInterval(fetchItems, 30000);
    return () => clearInterval(interval);
  }, [show, conn, todoEntityId, fetchItems]);

  const handleAdd = async () => {
    const text = newItemText.trim();
    if (!text || !conn || !todoEntityId) return;
    setAdding(true);
    try {
      await addTodoItem(conn, todoEntityId, text);
      setNewItemText('');
      await fetchItems();
      inputRef.current?.focus();
    } catch (err) {
      setError(err.message);
      console.error('TodoModal: Failed to add item', err);
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (item) => {
    if (!conn || !todoEntityId) return;
    const newStatus = item.status === 'completed' ? 'needs_action' : 'completed';
    try {
      await updateTodoItem(conn, todoEntityId, item.uid, newStatus);
      // Optimistic update
      setItems((prev) => prev.map((i) => (i.uid === item.uid ? { ...i, status: newStatus } : i)));
      // Fetch fresh data after a short delay
      setTimeout(fetchItems, 500);
    } catch (err) {
      console.error('TodoModal: Failed to toggle item', err);
      setError(err.message);
      fetchItems();
    }
  };

  const handleDelete = async (item) => {
    if (!conn || !todoEntityId) return;
    try {
      await removeTodoItem(conn, todoEntityId, item.uid);
      setItems((prev) => prev.filter((i) => i.uid !== item.uid));
      setTimeout(fetchItems, 500);
    } catch (err) {
      console.error('TodoModal: Failed to remove item', err);
      setError(err.message);
      fetchItems();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const pendingItems = items.filter((i) => i.status === 'needs_action');
  const completedItems = items.filter((i) => i.status === 'completed');
  const totalCount = items.length;
  const completedCount = completedItems.length;

  const entityName = entities?.[todoEntityId]?.attributes?.friendly_name || todoEntityId || '';

  if (!show) return null;

  return (
    <AccessibleModalShell
      open={show}
      onClose={onClose}
      titleId={modalTitleId}
      size="m"
      placement="top"
    >
      {() => (
        <>
          <ModalHeader
            title={entityName || translate('todo.title') || 'To-do'}
            closeLabel={translate('common.close')}
            onClose={onClose}
            icon={<ListChecks />}
            iconClassName="bg-[var(--status-success-bg)] text-[var(--status-success-fg)]"
          />

          <ModalBody className="flex flex-col gap-4">
            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-4 py-2 text-xs font-bold text-[var(--status-error-fg)]"
              >
                {error}
              </div>
            )}

            {!todoEntityId ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <AlertCircle className="h-8 w-8 text-[var(--text-muted)]" />
                <p className="text-base font-medium text-[var(--text-primary)]">
                  {translate('todo.noListSelected') || 'No list selected'}
                </p>
                <p className="max-w-xs text-sm text-[var(--text-secondary)]">
                  {translate('todo.noListSelectedHint')}
                </p>
              </div>
            ) : listUnavailable ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <AlertCircle className="h-8 w-8 text-[var(--text-muted)]" />
                <p className="text-base font-medium text-[var(--text-primary)]">
                  {getUnavailableLabel(listEntity?.state, translate)}
                </p>
              </div>
            ) : (
              <>
                {/* Progress */}
                {totalCount > 0 && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="modal-section-label">
                        {completedCount}/{totalCount} {translate('todo.completed') || 'completed'}
                      </span>
                      <span className="text-[11px] font-bold tracking-[0.12em] text-[var(--status-success-fg)] uppercase tabular-nums">
                        {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--glass-bg)]">
                      <div
                        className="h-full rounded-full bg-[var(--status-success-fg)]/70 transition-all duration-500"
                        style={{
                          width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Add item */}
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={translate('todo.addPlaceholder') || 'Add a new item...'}
                    aria-label={translate('todo.addPlaceholder') || 'Add a new item...'}
                    disabled={adding}
                    className="min-w-0 flex-1 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm text-[var(--text-primary)] transition-colors outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] disabled:opacity-50"
                  />
                  <Button
                    variant="primary"
                    onClick={handleAdd}
                    disabled={!newItemText.trim() || adding}
                    aria-label={translate('common.add')}
                    icon={<Plus />}
                    className="flex-shrink-0"
                  />
                </div>

                {/* Item list */}
                <div className="space-y-1">
                  {loading && items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)]">
                      <div className="mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-[var(--status-success-fg)]" />
                      <p className="text-xs font-bold tracking-widest uppercase">
                        {translate('common.loading') || 'Loading...'}
                      </p>
                    </div>
                  ) : pendingItems.length === 0 && completedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)] opacity-60">
                      <CheckCircle2 className="mb-3 h-10 w-10 text-[var(--status-success-fg)]" />
                      <p className="text-sm font-medium">
                        {translate('todo.allDone') || 'All done!'}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {translate('todo.addHint') || 'Add a new item above'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Pending items */}
                      {pendingItems.map((item, idx) => (
                        <div
                          key={item.uid || `pending-${idx}`}
                          className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--glass-bg)]"
                        >
                          <button
                            onClick={() => handleToggle(item)}
                            className="mt-0.5 flex-shrink-0 text-[var(--text-secondary)] opacity-40 transition-colors hover:text-[var(--status-success-fg)] hover:opacity-100"
                            title={translate('todo.markDone') || 'Mark as done'}
                            aria-label={translate('todo.markDone') || 'Mark as done'}
                          >
                            <Circle className="h-5 w-5" />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-snug text-[var(--text-primary)]">
                              {item.summary}
                            </p>
                            {item.description && (
                              <p className="mt-1 line-clamp-2 text-[11px] text-[var(--text-muted)]">
                                {item.description}
                              </p>
                            )}
                            {item.due && (
                              <p className="mt-1 text-[11px] font-bold tracking-[0.08em] text-[var(--text-secondary)] uppercase opacity-60">
                                {formatDueDate(item.due, translate)}
                              </p>
                            )}
                          </div>
                          <TodoDeleteButton
                            label={translate('todo.delete')}
                            confirmLabel={translate('todo.deleteConfirm')}
                            iconClassName="h-4 w-4"
                            onConfirm={() => handleDelete(item)}
                          />
                        </div>
                      ))}

                      {/* Completed section */}
                      {completedItems.length > 0 && (
                        <div className="mt-2 border-t border-[var(--glass-border)] pt-3">
                          <button
                            onClick={() => setShowCompleted((prev) => !prev)}
                            aria-expanded={showCompleted}
                            className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-bold tracking-[0.12em] text-[var(--text-muted)] uppercase transition-colors hover:text-[var(--text-primary)]"
                          >
                            <span>
                              {translate('todo.completed') || 'Completed'} ({completedCount})
                            </span>
                            <span aria-hidden="true">{showCompleted ? '▾' : '▸'}</span>
                          </button>
                          {showCompleted &&
                            completedItems.map((item, idx) => (
                              <div
                                key={item.uid || `completed-${idx}`}
                                className="group flex items-start gap-3 rounded-xl px-3 py-2.5 opacity-50 transition-colors hover:bg-[var(--glass-bg)] hover:opacity-70"
                              >
                                <button
                                  onClick={() => handleToggle(item)}
                                  className="mt-0.5 flex-shrink-0 text-[var(--status-success-fg)] transition-colors"
                                  title={translate('todo.markUndone') || 'Mark as not done'}
                                  aria-label={translate('todo.markUndone') || 'Mark as not done'}
                                >
                                  <CheckCircle2 className="h-5 w-5" />
                                </button>
                                <p className="line-clamp-1 min-w-0 flex-1 text-sm leading-snug text-[var(--text-primary)] line-through">
                                  {item.summary}
                                </p>
                                <TodoDeleteButton
                                  label={translate('todo.delete')}
                                  confirmLabel={translate('todo.deleteConfirm')}
                                  iconClassName="h-4 w-4"
                                  onConfirm={() => handleDelete(item)}
                                />
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}

function formatDueDate(due, t) {
  if (!due) return '';
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return due;
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return t('todo.dueToday') || 'Due today';
  if (date.toDateString() === tomorrow.toDateString())
    return t('todo.dueTomorrow') || 'Due tomorrow';

  const isPast = date < today && date.toDateString() !== today.toDateString();
  const label = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return isPast ? `⚠ ${label}` : label;
}
