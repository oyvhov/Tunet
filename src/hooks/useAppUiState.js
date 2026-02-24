import { useState } from 'react';

export function useAppUiState() {
  const [activeVacuumId, setActiveVacuumId] = useState(null);
  const [showThemeSidebar, setShowThemeSidebar] = useState(false);
  const [showLayoutSidebar, setShowLayoutSidebar] = useState(false);
  const [editCardSettingsKey, setEditCardSettingsKey] = useState(null);
  const [editMode, setEditMode] = useState(false);

  return {
    activeVacuumId,
    setActiveVacuumId,
    showThemeSidebar,
    setShowThemeSidebar,
    showLayoutSidebar,
    setShowLayoutSidebar,
    editCardSettingsKey,
    setEditCardSettingsKey,
    editMode,
    setEditMode,
  };
}
