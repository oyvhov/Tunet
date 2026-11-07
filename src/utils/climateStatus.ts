interface ClimateStatusEntity {
  state: string;
  attributes?: { hvac_action?: unknown };
}

const modeKeys: Record<string, string> = {
  heat: 'heat',
  cool: 'cool',
  dry: 'dry',
  fan_only: 'fanOnly',
  heat_cool: 'heatCool',
  auto: 'auto',
};

export function getClimateStatus(entity: ClimateStatusEntity) {
  const reportedAction = entity.attributes?.hvac_action;
  const action =
    entity.state === 'off' ? 'off' : typeof reportedAction === 'string' ? reportedAction : '';
  const mode = modeKeys[entity.state];
  return {
    translationKey: action
      ? `climate.action.${action}`
      : mode
        ? `climate.hvac.${mode}`
        : 'common.unknown',
    isHeating: action ? action === 'heating' : entity.state === 'heat',
    isCooling: action ? action === 'cooling' : entity.state === 'cool',
  };
}
