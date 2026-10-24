import { useEffect, useRef, useState } from 'react';

interface PowerCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

interface PowerRequest {
  entityId: string;
  target: boolean;
}

interface UsePowerToggleOptions {
  entityId: string | null | undefined;
  isOn: boolean;
  domain: string;
  callService?: (domain: string, service: string, data: Record<string, unknown>) => unknown;
  buildCall?: () => PowerCall | null | undefined;
}

export function usePowerToggle({
  entityId,
  isOn,
  domain,
  callService,
  buildCall = undefined,
}: UsePowerToggleOptions) {
  const [pending, setPending] = useState<PowerRequest | null>(null);
  const requestRef = useRef<PowerRequest | null>(null);

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
