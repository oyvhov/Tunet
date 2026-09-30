import { useEffect, useRef, useState } from 'react';

export function usePowerToggle({ entityId, isOn, domain, callService, buildCall = undefined }) {
  const [pending, setPending] = useState(null);
  const requestRef = useRef(null);

  useEffect(() => {
    if (!pending) return;
    const clear = () => {
      requestRef.current = null;
      setPending(null);
    };
    if (pending.entityId !== entityId || pending.target === isOn) {
      clear();
      return;
    }
    const timeout = setTimeout(clear, 10000);
    return () => clearTimeout(timeout);
  }, [pending, entityId, isOn]);

  const togglePower = () => {
    if (!callService || !entityId || requestRef.current) return;
    const request = { entityId, target: !isOn };
    requestRef.current = request;
    setPending(request);
    const reset = () => {
      if (requestRef.current !== request) return;
      requestRef.current = null;
      setPending(null);
    };
    try {
      const call = buildCall?.() || {
        domain,
        service: isOn ? 'turn_off' : 'turn_on',
        data: { entity_id: entityId },
      };
      Promise.resolve(callService(call.domain, call.service, call.data)).catch(reset);
    } catch {
      reset();
    }
  };

  return { isPending: pending !== null, togglePower };
}
