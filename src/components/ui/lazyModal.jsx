import { useEffect, useState } from 'react';
import { modalLoadingFallback } from './ModalSuspense';

// Modal imports use urgent state updates so React's Suspense fallback throttle
// does not add a minimum spinner delay to the first opening.
export function lazyModal(load) {
  let loaded;
  let pending;

  return function DeferredModal(props) {
    const [state, setState] = useState(() => ({ Component: loaded, error: null }));
    useEffect(() => {
      if (state.Component) return;
      let active = true;
      pending ||= load().then((module) => {
        loaded = module.default;
        return loaded;
      });
      pending.then(
        (Component) => {
          if (active) setState({ Component, error: null });
        },
        (error) => {
          if (active) setState({ Component: null, error });
        }
      );
      return () => {
        active = false;
      };
    }, [state.Component]);

    if (state.error) throw state.error;
    const Component = state.Component;
    return Component ? <Component {...props} /> : modalLoadingFallback;
  };
}
