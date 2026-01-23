import { useMemo } from 'react';
import { CLIMATE_ID } from '../constants';

export default function useClimateInfo(entities) {
  return useMemo(() => {
    const climate = entities[CLIMATE_ID];
    const hvacAction = climate?.attributes?.hvac_action || 'idle';
    const hvacState = climate?.state || 'off';
    const isHeating = hvacAction === 'heating' || hvacAction === 'heat' || hvacState === 'heat';
    const isCooling = hvacAction === 'cooling' || hvacAction === 'cool' || hvacState === 'cool';
    const currentTemp = climate?.attributes?.current_temperature ?? '--';
    const targetTemp = climate?.attributes?.temperature ?? 21;
    const fanMode = climate?.attributes?.fan_mode ?? 'Auto';
    return { hvacAction, hvacState, isHeating, isCooling, currentTemp, targetTemp, fanMode };
  }, [entities]);
}
