import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { Circle, CheckCircle2, Plus, AlertCircle, ListChecks, Trash2 } from 'lucide-react';
import { getIconComponent } from '../../icons';
import { getTodoItems, addTodoItem, updateTodoItem, removeTodoItem } from '../../services/haClient';
import { useRefreshTick } from '../../hooks/useRefreshTick';
import { useRowsThatFit } from '../../hooks/useRowsThatFit';
import { getUnavailableLabel, isUnavailableState } from '../../utils/entityState';
import type {
  CSSProperties,
  ErrorInfo,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react';
import type { Connection } from 'home-assistant-js-websocket';
import type { CardBaseProps, EntityMap } from '../../types/dashboard';
import type { Translate } from '../../types/ha';
import type { TodoItem } from '../../services/haClient';
import { cardButtonProps } from '../../utils/keyboard';
import CardName from '../ui/CardName';

type TodoCardItem = TodoItem & { due?: string };

interface TodoCardSettings {
  todoEntityId?: string;
  name?: string;
  [key: string]: unknown;
}

interface TodoCardProps extends Pick<CardBaseProps, 'cardId' | 't'> {
  settings?: TodoCardSettings;
  conn?: Connection | null;
  entity?: EntityMap[string] | null;
  entitiesReady?: boolean;
  className?: string;
  style?: CSSProperties;
  dragProps?: Record<string, unknown>;
  getControls?: (cardId: string) => ReactNode;
  onClick?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  isEditMode?: boolean;
  size?: string;
  iconName?: string | null;
  customName?: string | null;
}

interface TodoErrorBoundaryProps {
  t?: Translate;
  children?: ReactNode;
}

interface TodoErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class TodoErrorBoundary extends React.Component<TodoErrorBoundaryProps, TodoErrorBoundaryState> {
  constructor(props: TodoErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: (error as Error | null | undefined)?.message || '' };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('TodoCard crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        <div className="flex h-full flex-col rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 text-[var(--status-error-fg)]">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-semibold">{t?.('error.cardCrash') || 'Card Error'}</span>
          </div>
          <p className="mt-2 text-xs opacity-80">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const DELETE_ARM_MS = 3000;

interface TodoDeleteButtonProps {
  label: string;
  confirmLabel: string;
  iconClassName?: string;
  onConfirm: (event: ReactMouseEvent) => void;
}

/** Trash button that is visible on touch and only deletes on a second tap. */
export function TodoDeleteButton({
  label,
  confirmLabel,
  iconClassName = 'h-3.5 w-3.5',
  onConfirm,
}: TodoDeleteButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const timer = setTimeout(() => setArmed(false), DELETE_ARM_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      aria-label={armed ? confirmLabel : label}
      title={armed ? confirmLabel : label}
      onClick={(event) => {
        event.stopPropagation();
        if (armed) {
          setArmed(false);
          onConfirm(event);
        } else {
          setArmed(true);
        }
      }}
      className={`relative -m-1 mt-0.5 flex flex-shrink-0 items-center gap-1 rounded-lg p-1 transition-colors before:absolute before:-inset-3 ${
        armed
          ? 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)]'
          : 'touch:text-[var(--status-error-fg)]/60 text-transparent group-hover:text-[var(--status-error-fg)]/60 hover:!text-[var(--status-error-fg)] focus-visible:text-[var(--status-error-fg)]'
      }`}
    >
      <Trash2 className={iconClassName} aria-hidden="true" />
      {armed && <span className="text-[10px] font-bold whitespace-nowrap">{confirmLabel}</span>}
    </button>
  );
}

const TodoCard = memo(function TodoCard({
  cardId,
  settings,
  conn,
  entity,
  entitiesReady,
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
}: TodoCardProps) {
  const [items, setItems] = useState<TodoCardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Large card interactive state
  const [newItemText, setNewItemText] = useState('');
  const [adding, setAdding] = useState(false);
  const [actionFailed, setActionFailed] = useState(false);

  const todoEntityId = settings?.todoEntityId;
  const listUnavailable =
    !!todoEntityId && (entity ? isUnavailableState(entity.state) : !!entitiesReady);
  const refreshTick = useRefreshTick(conn, { enabled: !!todoEntityId });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
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
      setError((err as Error).message || 'Failed to fetch items');
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
    if (listUnavailable) return;
    fetchItems();
  }, [conn, todoEntityId, listUnavailable, fetchItems, refreshTick]);

  // Set up refresh interval only when visible
  useEffect(() => {
    if (!conn || !todoEntityId || !isVisible) return;

    // Refresh every 2 minutes
    const interval = setInterval(() => fetchItems(), 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [conn, todoEntityId, isVisible, fetchItems]);

  const handleToggle = async (e: ReactMouseEvent, item: TodoCardItem) => {
    e.stopPropagation();
    if (!conn || !todoEntityId) return;
    const newStatus = item.status === 'completed' ? 'needs_action' : 'completed';
    setActionFailed(false);
    try {
      // Optimistic update
      setItems((prev) => prev.map((i) => (i.uid === item.uid ? { ...i, status: newStatus } : i)));
      await updateTodoItem(conn, todoEntityId, item.uid, newStatus);
      setTimeout(fetchItems, 500);
    } catch (err) {
      console.error('TodoCard: Failed to toggle item', err);
      setActionFailed(true);
      // Revert on error
      fetchItems();
    }
  };

  const handleDelete = async (e: ReactMouseEvent, item: TodoCardItem) => {
    e.stopPropagation();
    if (!conn || !todoEntityId) return;
    setActionFailed(false);
    try {
      setItems((prev) => prev.filter((i) => i.uid !== item.uid));
      await removeTodoItem(conn, todoEntityId, item.uid);
      setTimeout(fetchItems, 500);
    } catch (err) {
      console.error('TodoCard: Failed to remove item', err);
      setActionFailed(true);
      fetchItems();
    }
  };

  const submitAdd = async () => {
    const text = newItemText.trim();
    if (!text || !conn || !todoEntityId || adding) return;
    setAdding(true);
    setActionFailed(false);
    try {
      await addTodoItem(conn, todoEntityId, text);
      setNewItemText('');
      await fetchItems();
    } catch (err) {
      console.error('TodoCard: Failed to add item', err);
      setActionFailed(true);
    } finally {
      setAdding(false);
    }
  };

  const handleAddKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitAdd();
    }
  };

  const pendingItems = useMemo(() => items.filter((i) => i.status === 'needs_action'), [items]);
  const completedItems = useMemo(() => items.filter((i) => i.status === 'completed'), [items]);
  const pendingCount = pendingItems.length;
  const completedCount = completedItems.length;
  const totalCount = items.length;
  const listRowCount = pendingCount + completedCount;
  const { listRef, visibleRows, measuring: measuringList } = useRowsThatFit(listRowCount, items);

  const IconComp = iconName ? getIconComponent(iconName) || ListChecks : ListChecks;
  const displayName = customName || settings?.name || t('todo.title') || 'To-do';
  const isSmall = size === 'small';

  if (isSmall) {
    return (
      <div
        ref={cardRef}
        {...dragProps}
        {...cardButtonProps(isEditMode, displayName)}
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
          ) : listUnavailable ? (
            <>
              <CardName
                lines={1}
                className="mb-1.5 text-xs leading-none font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60"
              >
                {String(displayName)}
              </CardName>
              <p className="truncate text-sm leading-none font-bold text-[var(--text-secondary)]">
                {getUnavailableLabel(entity?.state, t)}
              </p>
            </>
          ) : error ? (
            <p className="truncate text-xs text-[var(--status-error-fg)]" title={error}>
              {t('todo.loadFailed')}
            </p>
          ) : loading && items.length === 0 ? (
            <p className="truncate text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
              {t('common.loading') || 'Loading...'}
            </p>
          ) : (
            <>
              <CardName
                lines={1}
                className="mb-1.5 text-xs leading-none font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60"
              >
                {String(displayName)}
              </CardName>
              <p className="truncate text-sm leading-none font-bold text-[var(--text-primary)]">
                {pendingCount > 0
                  ? `${pendingCount} ${t('todo.pending') || 'pending'}`
                  : items.length === 0
                    ? t('todo.empty') || 'No items'
                    : t('todo.allDone') || 'All done!'}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Large card: pending first, then completed, as many as fit whole.
  const shownPending = pendingItems.slice(0, visibleRows);
  const shownCompleted = completedItems.slice(0, Math.max(0, visibleRows - pendingCount));
  const hiddenRows = Math.max(0, listRowCount - visibleRows);

  return (
    <div
      ref={cardRef}
      {...dragProps}
      {...cardButtonProps(isEditMode, displayName)}
      data-haptic={isEditMode ? undefined : 'card'}
      onClick={onClick}
      className={`glass-texture touch-feedback relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] font-sans backdrop-blur-xl transition-all duration-300 ${isEditMode ? 'cursor-move' : 'cursor-pointer'} ${className}`}
      style={style}
    >
      {getControls && getControls(cardId)}

      {/* Header */}
      <div className="group z-10 flex items-center justify-between p-5 pb-2">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[var(--status-success-bg)] p-2 text-[var(--status-success-fg)] transition-transform duration-300 group-hover:scale-110">
            <IconComp className="h-5 w-5" />
          </div>
          <CardName
            as="h3"
            className="text-lg leading-tight font-medium tracking-tight text-[var(--text-primary)]"
          >
            {String(displayName)}
          </CardName>
        </div>
        {totalCount > 0 ? (
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
            <span className="text-[var(--status-success-fg)]">{completedCount}</span>
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
              className="h-full rounded-full bg-[var(--status-success-fg)]/60 transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div ref={listRef} className="min-h-0 flex-1 space-y-1 overflow-hidden p-5 pt-1">
        {!todoEntityId ? (
          <div className="flex h-full flex-col items-center justify-center text-[var(--text-secondary)] opacity-60">
            <IconComp className="mb-2 h-8 w-8" />
            <p className="text-xs font-bold tracking-widest uppercase">
              {t('todo.selectList') || 'Select Todo List'}
            </p>
          </div>
        ) : listUnavailable ? (
          <div className="flex h-full flex-col items-center justify-center text-[var(--text-secondary)] opacity-60">
            <AlertCircle className="mb-2 h-8 w-8" />
            <p className="text-xs font-bold tracking-widest uppercase">
              {getUnavailableLabel(entity?.state, t)}
            </p>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center text-[var(--status-error-fg)]">
            <AlertCircle className="mb-2 h-8 w-8" />
            <p className="px-4 text-center text-xs font-bold tracking-widest uppercase">
              {t('todo.loadFailed')}
            </p>
          </div>
        ) : loading && items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-[var(--text-secondary)]">
            <div className="mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-[var(--status-success-fg)]" />
            <p className="text-xs font-bold tracking-widest uppercase">
              {t('common.loading') || 'Loading...'}
            </p>
          </div>
        ) : pendingItems.length === 0 && completedItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-[var(--text-secondary)] opacity-60">
            <CheckCircle2 className="mb-2 h-8 w-8 text-[var(--status-success-fg)]" />
            <p className="text-xs font-bold tracking-widest uppercase">
              {t('todo.empty') || 'No items'}
            </p>
          </div>
        ) : (
          <>
            {/* Pending items */}
            {shownPending.map((item, idx) => (
              <div
                key={item.uid || `pending-${idx}`}
                data-fit-row=""
                className="group flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--glass-bg)]"
                onClick={(e) => handleToggle(e, item)}
              >
                <div className="mt-0.5">
                  <Circle
                    className={`h-4 w-4 text-[var(--text-secondary)] opacity-40 transition-colors group-hover:text-[var(--status-success-fg)] group-hover:opacity-100 ${loading ? 'opacity-20' : ''}`}
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
                <TodoDeleteButton
                  label={t('todo.delete')}
                  confirmLabel={t('todo.deleteConfirm')}
                  onConfirm={(e) => handleDelete(e, item)}
                />
              </div>
            ))}

            {/* Completed items */}
            {shownCompleted.length > 0 && (
              <div className="pt-2 opacity-50">
                <div className="pt-2 pb-1">
                  <p className="px-3 text-[10px] font-bold tracking-widest text-[var(--status-success-fg)]/60 uppercase">
                    {t('todo.completed') || 'Completed'} ({completedCount})
                  </p>
                </div>
                {shownCompleted.map((item, idx) => (
                  <div
                    key={item.uid || `completed-${idx}`}
                    data-fit-row=""
                    className="group flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 transition-colors"
                    onClick={(e) => handleToggle(e, item)}
                  >
                    <div className="mt-0.5 flex-shrink-0 text-[var(--status-success-fg)]">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm leading-snug text-[var(--text-primary)] line-through opacity-70">
                        {item.summary}
                      </p>
                    </div>
                    <TodoDeleteButton
                      label={t('todo.delete')}
                      confirmLabel={t('todo.deleteConfirm')}
                      onConfirm={(e) => handleDelete(e, item)}
                    />
                  </div>
                ))}
              </div>
            )}
            {(hiddenRows > 0 || measuringList) && (
              <p
                data-fit-more=""
                className="px-3 pt-1 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase"
              >
                {t('common.moreCount').replace('{count}', String(hiddenRows))}
              </p>
            )}
          </>
        )}
      </div>

      {/* Quick Add */}
      {!listUnavailable && (
        <div className="px-5 pt-2 pb-5">
          {actionFailed && (
            <p role="alert" className="mb-2 text-xs text-[var(--status-error-fg)]">
              {t('todo.saveFailed')}
            </p>
          )}
          <div className="group relative">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={handleAddKey}
              placeholder={t('todo.addPlaceholder') || 'Add item...'}
              className="w-full rounded-xl border border-transparent bg-[var(--glass-bg)] px-3 py-2 pr-11 text-sm text-[var(--text-primary)] transition-all outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--glass-border)]"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              aria-label={t('common.add')}
              disabled={!newItemText.trim() || adding || isEditMode}
              onClick={(e) => {
                e.stopPropagation();
                submitAdd();
              }}
              className="absolute top-1/2 right-0 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[var(--status-success-fg)] transition-opacity disabled:opacity-40"
            >
              {adding ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--status-success-fg)] border-t-transparent" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

function formatDueDate(due: string, t: Translate) {
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

export default function TodoCardWithBoundary(props: TodoCardProps) {
  return (
    <TodoErrorBoundary t={props.t}>
      <TodoCard {...props} />
    </TodoErrorBoundary>
  );
}
