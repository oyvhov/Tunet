import { useState, useEffect, useCallback } from 'react';

/** @typedef {import('../types/dashboard').UsePageManagementDeps} UsePageManagementDeps */
/** @typedef {import('../types/dashboard').UsePageManagementResult} UsePageManagementResult */

/**
 * Encapsulates page CRUD (create / createMedia / delete) and the
 * "new-page" form state (label & icon).
 *
 * @param {UsePageManagementDeps} deps
 * @returns {UsePageManagementResult}
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
}) {
  const [newPageLabel, setNewPageLabel] = useState('');
  const [newPageIcon, setNewPageIcon] = useState(null);
  const [editingPage, setEditingPage] = useState(null);

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
  const createTypedPage = ({ labelKey, fallbackLabel, defaultIcon, defaultType, defaultSlug }) => {
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

  // ── Delete a page ──────────────────────────────────────────────────────
  const deletePage = (pageId) => {
    if (!pageId || pageId === 'home') return;
    if (!window.confirm(t('confirm.deletePage'))) return;

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

  const removeCard = useCallback(
    (cardId, listName = activePage) => {
      const newConfig = { ...pagesConfig };
      if (listName === 'header') {
        newConfig.header = (newConfig.header || []).filter((id) => id !== cardId);
        persistConfig(newConfig);
      } else if (Array.isArray(newConfig[listName])) {
        newConfig[listName] = newConfig[listName].filter((id) => id !== cardId);
        persistConfig(newConfig);
      }
    },
    [pagesConfig, activePage, persistConfig]
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
    deletePage,
    removeCard,
  };
}
