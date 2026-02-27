import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Circle, CheckCircle2, Plus, AlertCircle, ListChecks, Trash2 } from 'lucide-react';
import { getIconComponent } from '../../icons';
import { getTodoItems, addTodoItem, updateTodoItem, removeTodoItem } from '../../services/haClient';

class TodoErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Todo error' };
  }

  componentDidCatch(error, info) {
    console.error('TodoCard crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 text-red-400">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-semibold">Todo error</span>
          </div>
          <p className="mt-2 text-xs opacity-80">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function TodoCard({
  cardId,
  settings,
  conn,
  t,
  className,
  style,
  dragProps,
  getControls,
  onClick,
  isEditMode,
  size,
  iconName,
  customName,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  // Large card interactive state
  const [newItemText, setNewItemText] = useState('');
  const [adding, setAdding] = useState(false);

  const todoEntityId = settings?.todoEntityId;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const fetchItems = useCallback(async () => {
    if (!conn || !todoEntityId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getTodoItems(conn, todoEntityId);
      setItems(result || []);
    } catch (err) {
      console.error('[TodoCard] Failed to fetch todo items:', err);
      setError(err.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, [conn, todoEntityId]);

  // Fetch immediately when todoEntityId changes (don't wait for visibility)
  useEffect(() => {
    if (!conn || !todoEntityId) {
      setItems([]);
      return;
    }
    fetchItems();
  }, [conn, todoEntityId, fetchItems]);

  // Set up refresh interval only when visible
  useEffect(() => {
    if (!conn || !todoEntityId || !isVisible) return;

    // Refresh every 2 minutes
    const interval = setInterval(() => fetchItems(), 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [conn, todoEntityId, isVisible, fetchItems]);

  const handleToggle = async (e, item) => {
    e.stopPropagation();
    if (!conn || !todoEntityId) return;
    const newStatus = item.status === 'completed' ? 'needs_action' : 'completed';
    try {
      // Optimistic update
      setItems((prev) => prev.map((i) => (i.uid === item.uid ? { ...i, status: newStatus } : i)));
      await updateTodoItem(conn, todoEntityId, item.uid, newStatus);
      setTimeout(fetchItems, 500);
    } catch (err) {
      console.error('TodoCard: Failed to toggle item', err);
      // Revert on error
      fetchItems();
    }
  };

  const handleDelete = async (e, item) => {
    e.stopPropagation();
    if (!conn || !todoEntityId) return;
    try {
      setItems((prev) => prev.filter((i) => i.uid !== item.uid));
      await removeTodoItem(conn, todoEntityId, item.uid);
      setTimeout(fetchItems, 500);
    } catch (err) {
      console.error('TodoCard: Failed to remove item', err);
      fetchItems();
    }
  };

  const handleAdd = async (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = newItemText.trim();
      if (!text || !conn || !todoEntityId) return;
      setAdding(true);
      try {
        await addTodoItem(conn, todoEntityId, text);
        setNewItemText('');
        await fetchItems();
      } catch (err) {
        console.error('TodoCard: Failed to add item', err);
      } finally {
        setAdding(false);
      }
    }
  };

  const pendingItems = useMemo(() => items.filter((i) => i.status === 'needs_action'), [items]);
  const completedItems = useMemo(() => items.filter((i) => i.status === 'completed'), [items]);
  const pendingCount = pendingItems.length;
  const completedCount = completedItems.length;
  const totalCount = items.length;

  const IconComp = iconName ? getIconComponent(iconName) || ListChecks : ListChecks;
  const displayName = customName || settings?.name || t('todo.title') || 'To-do';
  const isSmall = size === 'small';

  if (isSmall) {
    return (
      <div
        ref={cardRef}
        {...dragProps}
        data-haptic={isEditMode ? undefined : 'card'}
        onClick={onClick}
        className={`glass-texture touch-feedback relative flex h-full items-center gap-4 overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 pl-5 font-sans backdrop-blur-xl transition-all duration-300 ${className}`}
        style={style}
      >
        {getControls && getControls(cardId)}
        <div className="group flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)]">
          <IconComp className="h-6 w-6 stroke-[1.5px] transition-transform duration-300 group-hover:scale-110" />
        </div>
        <div className="flex min-w-0 flex-col justify-center">
          {!todoEntityId ? (
            <p className="truncate text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
              {t('todo.selectList') || 'Select Todo List'}
            </p>
          ) : error ? (
            <p className="truncate text-xs text-red-400" title={error}>
              Error: {error}
            </p>
          ) : loading && items.length === 0 ? (
            <p className="truncate text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
              {t('common.loading') || 'Loading...'}
            </p>
          ) : (
            <>
              <p className="mb-1.5 truncate text-xs leading-none font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
                {displayName}
              </p>
              <p className="truncate text-sm leading-none font-bold text-[var(--text-primary)]">
                {pendingCount > 0
                  ? `${pendingCount} ${t('todo.pending') || 'pending'}`
                  : items.length === 0
                    ? `Empty (${todoEntityId})`
                    : t('todo.allDone') || 'All done!'}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Large card
  return (
    <div
      ref={cardRef}
      {...dragProps}
      data-haptic={isEditMode ? undefined : 'card'}
      onClick={onClick}
      className={`glass-texture touch-feedback relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] font-sans backdrop-blur-xl transition-all duration-300 ${isEditMode ? 'cursor-move' : 'cursor-pointer'} ${className}`}
      style={style}
    >
      {getControls && getControls(cardId)}

      {/* Header */}
      <div className="group z-10 flex items-center justify-between p-5 pb-2">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 transition-transform duration-300 group-hover:scale-110">
            <IconComp className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
            {displayName}
          </h3>
        </div>
        {totalCount > 0 ? (
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
            <span className="text-emerald-400">{completedCount}</span>
            <span>/</span>
            <span>{totalCount}</span>
          </div>
        ) : (
          <div className="text-[10px] text-[var(--text-muted)]">{todoEntityId}</div>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="px-5 pb-2">
          <div className="h-1 overflow-hidden rounded-full bg-[var(--glass-bg)]">
            <div
              className="h-full rounded-full bg-emerald-400/60 transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="hide-scrollbar flex-1 space-y-1 overflow-y-auto p-5 pt-1 [-ms-overflow-style:'none'] [scrollbar-width:'none'] [&::-webkit-scrollbar]:hidden">
        {!todoEntityId ? (
          <div className="flex h-full flex-col items-center justify-center text-[var(--text-secondary)] opacity-60">
            <IconComp className="mb-2 h-8 w-8" />
            <p className="text-xs font-bold tracking-widest uppercase">
              {t('todo.selectList') || 'Select Todo List'}
            </p>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center text-red-400">
            <AlertCircle className="mb-2 h-8 w-8" />
            <p className="px-4 text-center text-xs font-bold tracking-widest uppercase">{error}</p>
          </div>
        ) : loading && items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-[var(--text-secondary)]">
            <div className="mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-emerald-500" />
            <p className="text-xs font-bold tracking-widest uppercase">
              {t('common.loading') || 'Loading...'}
            </p>
          </div>
        ) : pendingItems.length === 0 && completedItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-[var(--text-secondary)] opacity-60">
            <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-400" />
            <p className="text-xs font-bold tracking-widest uppercase">
              {t('todo.empty') || 'No items'}
            </p>
          </div>
        ) : (
          <>
            {/* Pending items */}
            {pendingItems.map((item, idx) => (
              <div
                key={item.uid || `pending-${idx}`}
                className="group flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--glass-bg)]"
                onClick={(e) => handleToggle(e, item)}
              >
                <div className="mt-0.5">
                  <Circle
                    className={`h-4 w-4 text-[var(--text-secondary)] opacity-40 transition-colors group-hover:text-emerald-400 group-hover:opacity-100 ${loading ? 'opacity-20' : ''}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm leading-snug text-[var(--text-primary)] select-none">
                    {item.summary}
                  </p>
                  {item.due && (
                    <p className="mt-1 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60 select-none">
                      {formatDueDate(item.due, t)}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => handleDelete(e, item)}
                  className="-m-1 mt-0.5 flex-shrink-0 p-1 text-transparent transition-colors group-hover:text-red-400/60 hover:!text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Completed items */}
            {completedItems.length > 0 && (
              <div className="pt-2 opacity-50">
                <div className="pt-2 pb-1">
                  <p className="px-3 text-[10px] font-bold tracking-widest text-emerald-400/60 uppercase">
                    {t('todo.completed') || 'Completed'} ({completedCount})
                  </p>
                </div>
                {completedItems.map((item, idx) => (
                  <div
                    key={item.uid || `completed-${idx}`}
                    className="group flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 transition-colors"
                    onClick={(e) => handleToggle(e, item)}
                  >
                    <div className="mt-0.5 flex-shrink-0 text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm leading-snug text-[var(--text-primary)] line-through opacity-70">
                        {item.summary}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, item)}
                      className="-m-1 mt-0.5 flex-shrink-0 p-1 text-transparent transition-colors group-hover:text-red-400/60 hover:!text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Add */}
      <div className="px-5 pt-2 pb-5">
        <div className="group relative">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={handleAdd}
            placeholder={t('todo.addPlaceholder') || 'Add item...'}
            className="w-full rounded-xl border border-transparent bg-[var(--glass-bg)] px-3 py-2 pl-9 text-sm text-[var(--text-primary)] transition-all outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--glass-border)]"
            onClick={(e) => e.stopPropagation()}
          />
          <Plus className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-focus-within:text-emerald-400" />
          {adding && (
            <div className="absolute top-1/2 right-3 -translate-y-1/2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
            </div>
          )}
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
  if (date.toDateString() === tomorrow.toDateString())
    return t('todo.dueTomorrow') || 'Due tomorrow';

  const isPast = date < today && date.toDateString() !== today.toDateString();
  const label = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return isPast ? `⚠ ${label}` : label;
}

export default function TodoCardWithBoundary(props) {
  return (
    <TodoErrorBoundary>
      <TodoCard {...props} />
    </TodoErrorBoundary>
  );
}
