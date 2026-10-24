import { act, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lazyModal } from '../components/ui/lazyModal';

afterEach(cleanup);

describe('on-demand modal loading', () => {
  it('renders as soon as the module resolves and reuses it on subsequent openings', async () => {
    let resolve;
    const load = vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    const Modal = lazyModal(load);
    expect(load).not.toHaveBeenCalled();
    const first = render(<Modal title="Light controls" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await act(async () => {
      resolve({ default: ({ title }) => <div role="dialog">{title}</div> });
    });
    expect(screen.getByRole('dialog')).toHaveTextContent('Light controls');
    first.unmount();
    render(<Modal title="Next opening" />);
    expect(screen.getByRole('dialog')).toHaveTextContent('Next opening');
    expect(load).toHaveBeenCalledOnce();
  });

  it('deduplicates an import when a popup closes before it finishes loading', async () => {
    let resolve;
    const load = vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    const Modal = lazyModal(load);
    const first = render(<Modal />);
    first.unmount();
    render(<Modal />);
    await act(async () => {
      resolve({ default: () => <div role="dialog">Ready</div> });
    });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(load).toHaveBeenCalledOnce();
  });
});
