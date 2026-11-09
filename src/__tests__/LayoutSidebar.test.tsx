import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LayoutSidebar from '../components/sidebars/LayoutSidebar';

vi.mock('../contexts', () => ({
  usePages: () => ({ headerSettings: {}, updateHeaderSettings: vi.fn() }),
}));

vi.mock('../components/sidebars/SidebarContainer', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const renderSidebar = (pageSettings: Record<string, { gridColumns?: number }>) => {
  const setGridColumns = vi.fn();
  const savePageSetting = vi.fn();
  render(
    <LayoutSidebar
      open
      onClose={vi.fn()}
      onSwitchToTheme={vi.fn()}
      onSwitchToHeader={vi.fn()}
      t={(key: string) => key}
      gridGapH={16}
      setGridGapH={vi.fn()}
      gridGapV={16}
      setGridGapV={vi.fn()}
      gridColumns={4}
      setGridColumns={setGridColumns}
      dynamicGridColumns={false}
      setDynamicGridColumns={vi.fn()}
      sectionSpacing={{}}
      updateSectionSpacing={vi.fn()}
      activePage="home"
      pageSettings={pageSettings}
      savePageSetting={savePageSetting}
    />
  );
  return { setGridColumns, savePageSetting };
};

const columnsSlider = () => screen.getAllByRole('slider')[0];

describe('LayoutSidebar columns slider', () => {
  it('writes to the current page when the page has its own column count', async () => {
    const { setGridColumns, savePageSetting } = renderSidebar({ home: { gridColumns: 3 } });

    expect(screen.getByText('settings.gridColumnsPage')).toBeInTheDocument();
    fireEvent.change(columnsSlider(), { target: { value: '2' } });

    await waitFor(() => expect(savePageSetting).toHaveBeenCalledWith('home', 'gridColumns', 2));
    expect(setGridColumns).not.toHaveBeenCalled();
  });

  it('writes the global value when the page has no column count of its own', async () => {
    const { setGridColumns, savePageSetting } = renderSidebar({});

    expect(screen.getByText('settings.gridColumns')).toBeInTheDocument();
    fireEvent.change(columnsSlider(), { target: { value: '2' } });

    await waitFor(() => expect(setGridColumns).toHaveBeenCalledWith(2));
    expect(savePageSetting).not.toHaveBeenCalled();
  });
});
