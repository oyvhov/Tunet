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
        <div className="h-full rounded-3xl flex flex-col bg-[var(--card-bg)] border border-[var(--card-border)] p-5 text-red-400">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">Todo error</span>
          </div>
          <p className="text-xs mt-2 opacity-80">{this.state.message}</p>
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
  customName
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);
  const actionErrorTimer = useRef(null);

  // Large card interactive state
  const [newItemText, setNewItemText] = useState('');
  const [adding, setAdding] = useState(false);

  const showActionError = useCallback((msg) => {
    setActionError(msg);
    if (actionErrorTimer.current) clearTimeout(actionErrorTimer.current);
    actionErrorTimer.current = setTimeout(() => setActionError(null), 4000);
  }, []);

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
    return () => {
      observer.disconnect();
      if (actionErrorTimer.current) clearTimeout(actionErrorTimer.current);
    };
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
      setItems(prev => prev.map(i => (i.uid === item.uid ? { ...i, status: newStatus } : i)));
      await updateTodoItem(conn, todoEntityId, item.uid, newStatus);
      setTimeout(fetchItems, 500);
    } catch (err) {
      console.error('TodoCard: Failed to toggle item', err);
      const msg = err?.message || '';
      if (msg.includes('does not support')) {
        showActionError(t('todo.updateNotSupported') || 'This todo list does not support toggling items');
      } else {
        showActionError(t('todo.toggleFailed') || 'Failed to update item');
      }
      fetchItems();
    }
  };

  const handleDelete = async (e, item) => {
    e.stopPropagation();
    if (!conn || !todoEntityId) return;
    try {
        setItems(prev => prev.filter(i => i.uid !== item.uid));
        await removeTodoItem(conn, todoEntityId, item.uid);
        setTimeout(fetchItems, 500);
    } catch (err) {
        console.error('TodoCard: Failed to remove item', err);
        showActionError(t('todo.deleteFailed') || 'Failed to remove item');
        fetchItems();
    }
  }

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
            showActionError(t('todo.addFailed') || 'Failed to add item');
        } finally {
            setAdding(false);
        }
    }
  };

  const pendingItems = useMemo(() => items.filter(i => i.status === 'needs_action'), [items]);
  const completedItems = useMemo(() => items.filter(i => i.status === 'completed'), [items]);
  const pendingCount = pendingItems.length;
  const completedCount = completedItems.length;
  const totalCount = items.length;

  const IconComp = iconName ? (getIconComponent(iconName) || ListChecks) : ListChecks;
  const displayName = customName || settings?.name || t('todo.title') || 'To-do';
  const isSmall = size === 'small';

  if (isSmall) {
    return (
      <div
        ref={cardRef}
        {...dragProps}
        data-haptic={isEditMode ? undefined : 'card'}
        onClick={onClick}
        className={`touch-feedback relative overflow-hidden font-sans h-full rounded-3xl flex items-center p-4 pl-5 gap-4 bg-[var(--card-bg)] border border-[var(--card-border)] backdrop-blur-xl transition-all duration-300 ${className}`}
        style={style}
      >
        {getControls && getControls(cardId)}
        <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center bg-[var(--glass-bg)] text-[var(--text-secondary)]">
          <IconComp className="w-6 h-6 stroke-[1.5px]" />
        </div>
        <div className="flex flex-col min-w-0 justify-center">
          {!todoEntityId ? (
            <p className="text-xs uppercase font-bold tracking-widest opacity-60 text-[var(--text-secondary)] truncate">
              {t('todo.selectList') || 'Select Todo List'}
            </p>          ) : error ? (
            <p className="text-xs text-red-400 truncate" title={error}>
              Error: {error}
            </p>          ) : loading && items.length === 0 ? (
            <p className="text-xs uppercase font-bold tracking-widest opacity-60 text-[var(--text-secondary)] truncate">
              {t('common.loading') || 'Loading...'}
            </p>
          ) : (
            <>
              <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 truncate leading-none mb-1.5">
                {displayName}
              </p>
              <p className="text-sm font-bold text-[var(--text-primary)] leading-none truncate">
                {pendingCount > 0
                  ? `${pendingCount} ${t('todo.pending') || 'pending'}`
                  : items.length === 0 
                    ? `Empty (${todoEntityId})` 
                    : (t('todo.allDone') || 'All done!')}
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
      className={`touch-feedback relative overflow-hidden font-sans h-full rounded-3xl flex flex-col bg-[var(--card-bg)] border border-[var(--card-border)] backdrop-blur-xl transition-all duration-300 ${isEditMode ? 'cursor-move' : 'cursor-pointer'} ${className}`}
      style={style}
    >
      {getControls && getControls(cardId)}

      {/* Header */}
      <div className="p-5 pb-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <IconComp className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-medium text-[var(--text-primary)] tracking-tight">
            {displayName}
          </h3>
        </div>
        {totalCount > 0 ? (
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
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
          <div className="h-1 rounded-full bg-[var(--glass-bg)] overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400/60 transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 pt-1 hide-scrollbar space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        {!todoEntityId ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] opacity-60">
            <IconComp className="w-8 h-8 mb-2" />
            <p className="text-xs uppercase font-bold tracking-widest">
              {t('todo.selectList') || 'Select Todo List'}
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-red-400">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-xs uppercase font-bold tracking-widest text-center px-4">{error}</p>
          </div>
        ) : loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)]">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mb-2" />
            <p className="text-xs uppercase font-bold tracking-widest">
              {t('common.loading') || 'Loading...'}
            </p>
          </div>
        ) : pendingItems.length === 0 && completedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] opacity-60">
            <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-400" />
            <p className="text-xs uppercase font-bold tracking-widest">
              {t('todo.empty') || 'No items'}
            </p>
          </div>
        ) : (
          <>
            {/* Pending items */}
            {pendingItems.map((item, idx) => (
              <div
                key={item.uid || `pending-${idx}`}
                className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--glass-bg)] transition-colors group cursor-pointer"
                onClick={(e) => handleToggle(e, item)}
              >
                <div className="mt-0.5">
                     <Circle className={`w-4 h-4 text-[var(--text-secondary)] opacity-40 group-hover:text-emerald-400 group-hover:opacity-100 transition-colors ${loading ? 'opacity-20' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] leading-snug line-clamp-2 select-none">
                    {item.summary}
                  </p>
                  {item.due && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mt-1 opacity-60 select-none">
                      {formatDueDate(item.due, t)}
                    </p>
                  )}
                </div>
                 <button
                    onClick={(e) => handleDelete(e, item)}
                    className="mt-0.5 flex-shrink-0 text-transparent group-hover:text-red-400/60 hover:!text-red-400 transition-colors p-1 -m-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
              </div>
            ))}

            {/* Completed items */}
            {completedItems.length > 0 && (
                <div className="pt-2 opacity-50">
                    <div className="pt-2 pb-1">
                      <p className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest px-3">
                        {t('todo.completed') || 'Completed'} ({completedCount})
                      </p>
                    </div>
                    {completedItems.map((item, idx) => (
                        <div
                            key={item.uid || `completed-${idx}`}
                            className="flex items-start gap-3 px-3 py-2 rounded-xl transition-colors group cursor-pointer"
                            onClick={(e) => handleToggle(e, item)}
                        >
                             <div className="mt-0.5 flex-shrink-0 text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-[var(--text-primary)] leading-snug line-clamp-1 line-through opacity-70">
                                    {item.summary}
                                </p>
                            </div>
                             <button
                                onClick={(e) => handleDelete(e, item)}
                                className="mt-0.5 flex-shrink-0 text-transparent group-hover:text-red-400/60 hover:!text-red-400 transition-colors p-1 -m-1"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
          </>
        )}
      </div>

      {/* Action error banner */}
      {actionError && (
        <div className="px-5 pb-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{actionError}</span>
          </div>
        </div>
      )}

       {/* Quick Add */}
       <div className="px-5 pb-5 pt-2">
         <div className="relative group">
            <input 
                type="text" 
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={handleAdd}
                placeholder={t('todo.addPlaceholder') || 'Add item...'}
                className="w-full bg-[var(--glass-bg)] border border-transparent focus:border-[var(--glass-border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] pl-9"
                onClick={(e) => e.stopPropagation()} 
            />
            <Plus className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-emerald-400 transition-colors" />
             {adding && (
                 <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
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
  if (date.toDateString() === tomorrow.toDateString()) return t('todo.dueTomorrow') || 'Due tomorrow';

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
