import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Circle, CheckCircle2, Trash2, ListChecks, AlertCircle } from 'lucide-react';
import { getTodoItems, addTodoItem, updateTodoItem, removeTodoItem } from '../services/haClient';
import { logger } from '../utils/logger';

/**
 * TodoModal - Full-screen modal for managing a todo list from Home Assistant.
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.conn - Home Assistant WebSocket connection
 * @param {Object} props.entities - All HA entities
 * @param {Object} props.settings - Card settings (contains todoEntityId)
 * @param {Function} props.t - Translation function
 */
export default function TodoModal({ show, onClose, conn, entities, settings, t }) {
  if (!show) return null;

  const translate = t || ((key) => key);
  const todoEntityId = settings?.todoEntityId;
  const todoIntegration = settings?.todoIntegration || 'standard';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [adding, setAdding] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

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
    fetchItems();
  }, [fetchItems]);

  // Refresh every 30 seconds while open
  useEffect(() => {
    if (!conn || !todoEntityId) return;
    const interval = setInterval(fetchItems, 30000);
    return () => clearInterval(interval);
  }, [conn, todoEntityId, fetchItems]);

  const handleAdd = async () => {
    const text = newItemText.trim();
    if (!text || !conn || !todoEntityId) return;
    setAdding(true);
    try {
      await addTodoItem(conn, todoEntityId, text, todoIntegration);
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
      await updateTodoItem(conn, todoEntityId, item.uid, newStatus, todoIntegration);
      // Optimistic update
      setItems(prev =>
        prev.map(i => (i.uid === item.uid ? { ...i, status: newStatus } : i))
      );
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
      await removeTodoItem(conn, todoEntityId, item.uid, todoIntegration);
      setItems(prev => prev.filter(i => i.uid !== item.uid));
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

  const pendingItems = items.filter(i => i.status === 'needs_action');
  const completedItems = items.filter(i => i.status === 'completed');
  const totalCount = items.length;
  const completedCount = completedItems.length;

  const entityName = entities?.[todoEntityId]?.attributes?.friendly_name || todoEntityId || '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-12 md:pt-16"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="border w-full max-w-xl max-h-[85vh] rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 shadow-2xl relative font-sans flex flex-col backdrop-blur-xl popup-anim"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 modal-close">
          <X className="w-4 h-4" />
        </button>

        {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-500/90 text-white text-xs font-bold rounded-full shadow-lg">
                {error}
            </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <ListChecks className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-light text-[var(--text-primary)] uppercase tracking-widest italic truncate">
              {entityName || (translate('todo.title') || 'To-do')}
            </h3>
          </div>
        </div>

        {/* Progress */}
        {totalCount > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                {completedCount}/{totalCount} {translate('todo.completed') || 'completed'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400/70 transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Add item */}
        <div className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={translate('todo.addPlaceholder') || 'Add a new item...'}
            disabled={!todoEntityId || adding}
            className="flex-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500/50 transition-colors placeholder:text-[var(--text-muted)] disabled:opacity-50"
          />
          <button
            onClick={handleAdd}
            disabled={!newItemText.trim() || adding}
            className="px-4 py-3 rounded-2xl bg-emerald-500 text-white font-bold transition-colors hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-1">
          {!todoEntityId ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)] opacity-60">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p className="text-xs uppercase font-bold tracking-widest">{translate('todo.noListSelected') || 'No list selected'}</p>
            </div>
          ) : loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)]">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mb-2" />
              <p className="text-xs uppercase font-bold tracking-widest">{translate('common.loading') || 'Loading...'}</p>
            </div>
          ) : pendingItems.length === 0 && completedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)] opacity-60">
              <CheckCircle2 className="w-10 h-10 mb-3 text-emerald-400" />
              <p className="text-sm font-medium">{translate('todo.allDone') || 'All done!'}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{translate('todo.addHint') || 'Add a new item above'}</p>
            </div>
          ) : (
            <>
              {/* Pending items */}
              {pendingItems.map((item, idx) => (
                <div
                  key={item.uid || `pending-${idx}`}
                  className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-[var(--glass-bg)] transition-colors group"
                >
                  <button
                    onClick={() => handleToggle(item)}
                    className="mt-0.5 flex-shrink-0 text-[var(--text-secondary)] opacity-40 hover:text-emerald-400 hover:opacity-100 transition-colors"
                    title={translate('todo.markDone') || 'Mark as done'}
                  >
                    <Circle className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] leading-snug">
                      {item.summary}
                    </p>
                    {item.description && (
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">{item.description}</p>
                    )}
                    {item.due && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mt-1 opacity-60">
                        {formatDueDate(item.due, translate)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item)}
                    className="mt-0.5 flex-shrink-0 text-transparent group-hover:text-red-400/60 hover:!text-red-400 transition-colors"
                    title={translate('todo.delete') || 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Completed section */}
              {completedItems.length > 0 && (
                <div className="pt-3 mt-2 border-t border-[var(--glass-border)]">
                  <button
                    onClick={() => setShowCompleted(prev => !prev)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400/60 hover:text-emerald-400 transition-colors"
                  >
                    <span>{translate('todo.completed') || 'Completed'} ({completedCount})</span>
                    <span>{showCompleted ? '▾' : '▸'}</span>
                  </button>
                  {showCompleted &&
                    completedItems.map((item, idx) => (
                      <div
                        key={item.uid || `completed-${idx}`}
                        className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--glass-bg)] transition-colors group opacity-50 hover:opacity-70"
                      >
                        <button
                          onClick={() => handleToggle(item)}
                          className="mt-0.5 flex-shrink-0 text-emerald-400 transition-colors"
                          title={translate('todo.markUndone') || 'Mark as not done'}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <p className="flex-1 text-sm text-[var(--text-primary)] leading-snug line-through min-w-0 line-clamp-1">
                          {item.summary}
                        </p>
                        <button
                          onClick={() => handleDelete(item)}
                          className="mt-0.5 flex-shrink-0 text-transparent group-hover:text-red-400/60 hover:!text-red-400 transition-colors"
                          title={translate('todo.delete') || 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-[var(--glass-border)]">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl popup-surface popup-surface-hover text-[var(--text-secondary)] font-bold uppercase tracking-widest transition-colors"
          >
            {translate('common.ok') || 'OK'}
          </button>
        </div>
      </div>
    </div>
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
  if (date.toDateString() === tomorrow.toDateString()) return t('todo.dueTomorrow') || 'Due tomorrow';

  const isPast = date < today && date.toDateString() !== today.toDateString();
  const label = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return isPast ? `⚠ ${label}` : label;
}
