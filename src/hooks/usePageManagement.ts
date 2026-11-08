import { useState, useEffect, useCallback, useRef } from 'react';
import { useOptionalToast } from '../contexts/ToastContext';
import type { UsePageManagementDeps, UsePageManagementResult } from '../types/dashboard';

interface TypedPageOptions {
  labelKey: string;
  fallbackLabel: string;
  defaultIcon: string;
  defaultType: string;
  defaultSlug: string;
}

/**
 * Encapsulates page CRUD (create / createMedia / delete) and the
 * "new-page" form state (label & icon).
 */
export function usePageManagement({
  pagesConfig,
  persistConfig,
  pageSettings,
  persistPageSettings,
  savePageSetting,
  pageDefaults,
  activePage,
  setActivePage,
  showAddPageModal,
  setShowAddPageModal,
  t,
}: UsePageManagementDeps): UsePageManagementResult {
  const [newPageLabel, setNewPageLabel] = useState('');
  const [newPageIcon, setNewPageIcon] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const addToast = useOptionalToast()?.addToast;

  // An Undo tapped later must not write back the config from before the removal.
  const pagesConfigRef = useRef(pagesConfig);
  useEffect(() => {
    pagesConfigRef.current = pagesConfig;
  }, [pagesConfig]);

  // Reset form when the "add page" modal opens
  useEffect(() => {
    if (!showAddPageModal) return;
    setNewPageLabel('');
    setNewPageIcon(null);
  }, [showAddPageModal]);

  // ── Create a regular page ──────────────────────────────────────────────
  const createPage = () => {
    const label = newPageLabel.trim() || t('page.newDefault');
    let slugBase =
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'side';

    const isReservedMediaLikeSlug = /^(media|sonos)(_|$)/.test(slugBase);
    if (isReservedMediaLikeSlug) {
      slugBase = `page_${slugBase}`;
    }

    let pageId = slugBase;
    const existing = new Set(pagesConfig.pages || []);
    let counter = 1;
    while (existing.has(pageId)) {
      counter += 1;
      pageId = `${slugBase}_${counter}`;
    }

    const newConfig = { ...pagesConfig };
    newConfig.pages = [...(newConfig.pages || []), pageId];
    newConfig[pageId] = [];
    persistConfig(newConfig);

    savePageSetting(pageId, 'label', label);
    savePageSetting(pageId, 'icon', newPageIcon);

    setActivePage(pageId);
    setShowAddPageModal(false);
  };

  // ── Create a media/Sonos page ──────────────────────────────────────────
  const createTypedPage = ({
    labelKey,
    fallbackLabel,
    defaultIcon,
    defaultType,
    defaultSlug,
  }: TypedPageOptions) => {
    const baseLabel = t(labelKey) || fallbackLabel;
    const existingLabels = (pagesConfig.pages || []).map(
      (id) => pageSettings[id]?.label || pageDefaults[id]?.label || id
    );
    let maxNum = 0;
    existingLabels.forEach((label) => {
      if (String(label).toLowerCase().startsWith(baseLabel.toLowerCase())) {
        const match = String(label).match(/(\d+)$/);
        const num = match ? parseInt(match[1], 10) : 1;
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    const label = nextNum === 1 ? baseLabel : `${baseLabel} ${nextNum}`;

    const slugBase =
      baseLabel
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || defaultSlug;
    let pageId = slugBase;
    const existing = new Set(pagesConfig.pages || []);
    let counter = 1;
    while (existing.has(pageId)) {
      counter += 1;
      pageId = `${slugBase}_${counter}`;
    }

    const newConfig = { ...pagesConfig };
    newConfig.pages = [...(newConfig.pages || []), pageId];
    newConfig[pageId] = [];
    persistConfig(newConfig);

    savePageSetting(pageId, 'label', label);
    savePageSetting(pageId, 'icon', defaultIcon);
    savePageSetting(pageId, 'type', defaultType);
    savePageSetting(pageId, 'mediaIds', []);

    setActivePage(pageId);
    setShowAddPageModal(false);
  };

  const createMediaPage = () =>
    createTypedPage({
      labelKey: 'addCard.type.media',
      fallbackLabel: 'Media',
      defaultIcon: 'Music',
      defaultType: 'media',
      defaultSlug: 'media',
    });

  const createSonosPage = () =>
    createTypedPage({
      labelKey: 'addCard.type.sonos',
      fallbackLabel: 'SONOS',
      defaultIcon: 'Speaker',
      defaultType: 'sonos',
      defaultSlug: 'sonos',
    });

  const createLightsPage = () =>
    createTypedPage({
      labelKey: 'addCard.type.light',
      fallbackLabel: 'Lights',
      defaultIcon: 'Lightbulb',
      defaultType: 'lights',
      defaultSlug: 'lights',
    });

  const createBatteryPage = () =>
    createTypedPage({
      labelKey: 'addCard.type.battery',
      fallbackLabel: 'Battery',
      defaultIcon: 'Battery',
      defaultType: 'battery',
      defaultSlug: 'battery',
    });

  const createRoomExplorerPage = () =>
    createTypedPage({
      labelKey: 'addCard.type.roomExplorer',
      fallbackLabel: 'Rooms',
      defaultIcon: 'Home',
      defaultType: 'room_explorer',
      defaultSlug: 'room_explorer',
    });

  // ── Delete a page (the caller confirms first) ─────────────────────────
  const deletePage = (pageId: string) => {
    if (!pageId || pageId === 'home') return;

    const newConfig = { ...pagesConfig };
    newConfig.pages = (newConfig.pages || []).filter((id) => id !== pageId);
    delete newConfig[pageId];
    persistConfig(newConfig);

    const newSettings = { ...pageSettings };
    delete newSettings[pageId];
    persistPageSettings(newSettings);

    if (activePage === pageId) setActivePage('home');
    setEditingPage(null);
  };

  // Settings stay stored when a card is removed, so restoring only re-inserts its id.
  const restoreCard = useCallback(
    (cardId: string, listName: string, index: number) => {
      const latest = pagesConfigRef.current;
      const list = latest[listName];
      if (!Array.isArray(list) || list.includes(cardId)) return;
      const next = [...list];
      next.splice(Math.min(index, next.length), 0, cardId);
      persistConfig({ ...latest, [listName]: next });
    },
    [persistConfig]
  );

  const removeCard = useCallback(
    (cardId: string, listName: string = activePage) => {
      const newConfig = { ...pagesConfig };
      const list = listName === 'header' ? newConfig.header || [] : newConfig[listName];
      if (!Array.isArray(list)) return;
      newConfig[listName] = list.filter((id) => id !== cardId);
      persistConfig(newConfig);

      const index = list.indexOf(cardId);
      if (index === -1) return;
      addToast?.(t('toast.cardRemoved'), 'info', {
        label: t('common.undo'),
        onClick: () => restoreCard(cardId, listName, index),
      });
    },
    [pagesConfig, activePage, persistConfig, addToast, restoreCard, t]
  );

  return {
    newPageLabel,
    setNewPageLabel,
    newPageIcon,
    setNewPageIcon,
    editingPage,
    setEditingPage,
    createPage,
    createMediaPage,
    createSonosPage,
    createLightsPage,
    createBatteryPage,
    createRoomExplorerPage,
    deletePage,
    removeCard,
  };
}
