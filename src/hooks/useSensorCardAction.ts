import { useCallback, useEffect, useRef, useState } from 'react';
import type { Connection } from 'home-assistant-js-websocket';
import { callService as haCallService } from '../services/haClient';
import { openExternalUrl } from '../utils/externalLinks';
import {
  resolveSensorCardActionCall,
  sensorActionExpectationMatches,
} from '../utils/sensorCardConfig';
import type {
  SensorActionExpectation,
  SensorCardAction,
  SensorEntities,
} from '../utils/sensorCardConfig';

type SensorHookAction = Omit<SensorCardAction, 'entityId'> & { entityId?: string };
type SensorActionOverride = string | SensorHookAction;
type SensorActionStatus = 'idle' | 'pending' | 'sent' | 'confirmed' | 'timeout' | 'error';

interface SensorActionFeedback {
  status: SensorActionStatus;
  error: unknown;
}

interface SensorActionRequest {
  acknowledged: boolean;
  expectation: SensorActionExpectation | null;
  timer: number | null;
  actionKey: string;
}

interface UseSensorCardActionOptions {
  conn: Connection | null | undefined;
  connected?: boolean;
  callService?: (domain: string, service: string, data: Record<string, unknown>) => unknown;
  action: SensorHookAction | null | undefined;
  entities?: SensorEntities;
  onOpen?: (entityId: string | undefined) => void;
  onError?: (error: unknown) => void;
  disabled?: boolean;
  timeoutMs?: number;
  feedbackMs?: number;
}

const EMPTY_ENTITIES: SensorEntities = {};

export function useSensorCardAction({
  conn,
  connected = true,
  callService = undefined,
  action,
  entities = EMPTY_ENTITIES,
  onOpen = undefined,
  onError = undefined,
  disabled = false,
  timeoutMs = 10000,
  feedbackMs = 2500,
}: UseSensorCardActionOptions) {
  const [feedback, setFeedback] = useState<SensorActionFeedback>({ status: 'idle', error: null });
  const requestRef = useRef<SensorActionRequest | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;
  const actionKey = JSON.stringify([action?.type, action?.entityId, action?.service, action?.data]);

  const reset = useCallback(() => {
    clearTimeout(requestRef.current?.timer ?? undefined);
    clearTimeout(feedbackTimerRef.current ?? undefined);
    requestRef.current = null;
    setFeedback({ status: 'idle', error: null });
  }, []);

  const finish = useCallback(
    (request: SensorActionRequest, status: SensorActionStatus, error: unknown = null) => {
      if (requestRef.current !== request) return;
      clearTimeout(request.timer ?? undefined);
      requestRef.current = null;
      setFeedback({ status, error });
      clearTimeout(feedbackTimerRef.current ?? undefined);
      feedbackTimerRef.current = setTimeout(() => {
        setFeedback({ status: 'idle', error: null });
      }, feedbackMs);
    },
    [feedbackMs]
  );

  useEffect(() => {
    const request = requestRef.current;
    if (
      request?.acknowledged &&
      request.expectation &&
      sensorActionExpectationMatches(request.expectation, entities)
    ) {
      finish(request, 'confirmed');
    }
  }, [entities, finish]);

  useEffect(() => {
    if (disabled) reset();
  }, [disabled, reset]);

  useEffect(() => {
    if (requestRef.current && requestRef.current.actionKey !== actionKey) reset();
  }, [actionKey, reset]);

  useEffect(
    () => () => {
      clearTimeout(requestRef.current?.timer ?? undefined);
      clearTimeout(feedbackTimerRef.current ?? undefined);
      requestRef.current = null;
    },
    []
  );

  const execute = useCallback(
    async (override?: SensorActionOverride): Promise<boolean> => {
      if (disabled || requestRef.current) return false;
      const resolvedAction = {
        ...action,
        ...(typeof override === 'string' ? { type: override } : override),
      };
      if (resolvedAction.type === 'none') return false;
      if (resolvedAction.type === 'more-info') {
        onOpen?.(resolvedAction.entityId);
        return true;
      }
      if (resolvedAction.type === 'url') return openExternalUrl(resolvedAction.url);
      clearTimeout(feedbackTimerRef.current ?? undefined);
      const request: SensorActionRequest = {
        acknowledged: false,
        expectation: null,
        timer: null,
        actionKey,
      };
      requestRef.current = request;
      setFeedback({ status: 'pending', error: null });
      request.timer = setTimeout(() => finish(request, 'timeout'), timeoutMs);

      try {
        if (!conn || connected === false) throw new Error('disconnected');
        // A missing entityId indexes as 'undefined' and falls back to targetEntity, as in JS.
        const targetEntity =
          entitiesRef.current[resolvedAction.entityId as string] || resolvedAction.targetEntity;
        const call = resolveSensorCardActionCall(resolvedAction, targetEntity);
        if (!call) {
          finish(request, 'idle');
          return false;
        }
        request.expectation = call.expectation;
        // resolveSensorCardActionCall throws unless entityId (and so domain) is non-empty.
        await (callService
          ? callService(call.domain as string, call.service, call.data)
          : haCallService(conn, call.domain as string, call.service, call.data));
        if (requestRef.current !== request) return false;
        request.acknowledged = true;
        if (!call.expectation) finish(request, 'sent');
        else if (sensorActionExpectationMatches(call.expectation, entitiesRef.current)) {
          finish(request, 'confirmed');
        }
        return true;
      } catch (error) {
        if (requestRef.current === request) {
          finish(request, 'error', error);
          onError?.(error);
        }
        return false;
      }
    },
    [action, actionKey, callService, conn, connected, disabled, finish, onError, onOpen, timeoutMs]
  );

  return {
    execute,
    pending: feedback.status === 'pending',
    status: feedback.status,
    error: feedback.error,
    reset,
  };
}
