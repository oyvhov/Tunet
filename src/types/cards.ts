import type { useEntityHelpers } from '../hooks/useEntityHelpers';
import type { ServiceData } from '../services/haClient';

// Card props that more than one card component receives from the renderers.
export type GetEntityAttribute = ReturnType<typeof useEntityHelpers>['getA'];

export type CardCallService = (
  domain: string,
  service: string,
  data?: ServiceData | null
) => unknown;
