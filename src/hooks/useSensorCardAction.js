import { useCallback, useEffect, useRef, useState } from 'react';
import { callService as haCallService } from '../services/haClient';
import {
  resolveSensorCardActionCall,
  sensorActionExpectationMatches,
} from '../utils/sensorCardConfig';

const EMPTY_ENTITIES = {};

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
}) {
  const [feedback, setFeedback] = useState({ status: 'idle', error: null });
  const requestRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;
  const actionKey = JSON.stringify([action?.type, action?.entityId, action?.service, action?.data]);

  const reset = useCallback(() => {
    clearTimeout(requestRef.current?.timer);
    clearTimeout(feedbackTimerRef.current);
    requestRef.current = null;
    setFeedback({ status: 'idle', error: null });
  }, []);

  const finish = useCallback(
    (request, status, error = null) => {
      if (requestRef.current !== request) return;
      clearTimeout(request.timer);
      requestRef.current = null;
      setFeedback({ status, error });
      clearTimeout(feedbackTimerRef.current);
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
      clearTimeout(requestRef.current?.timer);
      clearTimeout(feedbackTimerRef.current);
      requestRef.current = null;
    },
    []
  );

  const execute = useCallback(
    async (override) => {
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
      clearTimeout(feedbackTimerRef.current);
      const request = { acknowledged: false, expectation: null, timer: null, actionKey };
      requestRef.current = request;
      setFeedback({ status: 'pending', error: null });
      request.timer = setTimeout(() => finish(request, 'timeout'), timeoutMs);

      try {
        if (!conn || connected === false) throw new Error('disconnected');
        const targetEntity =
          entitiesRef.current[resolvedAction.entityId] || resolvedAction.targetEntity;
        const call = resolveSensorCardActionCall(resolvedAction, targetEntity);
        if (!call) {
          finish(request, 'idle');
          return false;
        }
        request.expectation = call.expectation;
        await (callService
          ? callService(call.domain, call.service, call.data)
          : haCallService(conn, call.domain, call.service, call.data));
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
