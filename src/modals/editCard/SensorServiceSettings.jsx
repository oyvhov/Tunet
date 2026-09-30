import React, { useEffect, useMemo, useState } from 'react';
import { Zap } from '../../icons';
import {
  Disclosure,
  DropdownField,
  EntityField,
  FIELD_CLASS,
  Field,
  ToggleRow,
} from './settingsControls';

const EMPTY_OBJECT = {};

function getFieldType(field) {
  const selector = field.selector || {};
  if (!Object.keys(selector).length || 'template' in selector) return 'text';
  if ('boolean' in selector) return 'boolean';
  if ('number' in selector) return 'number';
  if ('select' in selector && !selector.select?.multiple) return 'select';
  if ('entity' in selector && !selector.entity?.multiple) return 'entity';
  if ('text' in selector && !selector.text?.multiple) return 'text';
  return 'json';
}

function getServiceFields(metadata) {
  const result = [];
  const visit = (fields) => {
    Object.entries(fields || {}).forEach(([key, field]) => {
      if (field.fields) visit(field.fields);
      else if (key !== 'entity_id') result.push([key, field]);
    });
  };
  visit(metadata?.fields);
  return result;
}

function getEntityDomains(selector) {
  return [selector]
    .flat()
    .filter(Boolean)
    .flatMap((item) =>
      item.filter
        ? item.filter.flatMap((filter) => [filter.domain || []].flat())
        : [item.domain || []].flat()
    );
}

function getServiceTargetDomains(metadata, domain) {
  const selector = metadata?.fields?.entity_id?.selector?.entity || metadata?.target?.entity;
  const domains = getEntityDomains(selector);
  return domains.length ? domains : metadata?.target && domain !== 'homeassistant' ? [domain] : [];
}

/** @param {any} props */
function ServiceField({ fieldKey, field, value, setValue, entities, t }) {
  const id = React.useId();
  const type = getFieldType(field);
  const label = `${field.name || fieldKey}${field.required ? ' *' : ''}`;
  const options = field.selector?.select?.options || [];
  const entityDomains = getEntityDomains(field.selector?.entity);
  const entityOptions = Object.keys(entities).filter(
    (entityId) => !entityDomains.length || entityDomains.includes(entityId.split('.')[0])
  );

  if (type === 'entity') {
    return (
      <EntityField
        label={label}
        hint={field.description}
        value={value || ''}
        options={entityOptions}
        entities={entities}
        onChange={setValue}
        t={t}
      />
    );
  }

  return (
    <Field label={label} hint={field.description} htmlFor={id}>
      {type === 'boolean' ? (
        <select
          id={id}
          className={FIELD_CLASS}
          value={value === undefined ? '' : String(value)}
          onChange={(event) =>
            setValue(event.target.value === '' ? undefined : event.target.value === 'true')
          }
        >
          <option value="">{t('sensor.custom.automatic')}</option>
          <option value="true">{t('common.on')}</option>
          <option value="false">{t('common.off')}</option>
        </select>
      ) : type === 'select' ? (
        <select
          id={id}
          className={FIELD_CLASS}
          value={value || ''}
          onChange={(event) => setValue(event.target.value || undefined)}
        >
          <option value="">{t('dropdown.noneSelected')}</option>
          {options.map((option) => (
            <option
              key={typeof option === 'string' ? option : option.value}
              value={typeof option === 'string' ? option : option.value}
            >
              {typeof option === 'string' ? option : option.label}
            </option>
          ))}
        </select>
      ) : type === 'json' ? (
        <textarea
          id={id}
          className={`${FIELD_CLASS} font-mono`}
          rows={2}
          value={
            value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value)
          }
          onChange={(event) => setValue(event.target.value || undefined)}
          placeholder={t('sensor.custom.jsonValue')}
        />
      ) : (
        <input
          id={id}
          className={FIELD_CLASS}
          type={type === 'number' ? 'number' : 'text'}
          value={value ?? ''}
          min={field.selector?.number?.min}
          max={field.selector?.number?.max}
          step={field.selector?.number?.step || 'any'}
          onChange={(event) =>
            setValue(
              event.target.value === ''
                ? undefined
                : type === 'number'
                  ? Number(event.target.value)
                  : event.target.value
            )
          }
        />
      )}
    </Field>
  );
}

/** @param {any} props */
export default function SensorServiceSettings({
  action,
  primaryId,
  updateAction,
  conn,
  connected,
  entities,
  t,
}) {
  const [services, setServices] = useState(EMPTY_OBJECT);
  const [loadState, setLoadState] = useState('loading');
  const [draft, setDraft] = useState(() => action.data || {});
  const [draftService, setDraftService] = useState(action.service || '');
  const [draftTargetMode, setDraftTargetMode] = useState(action.targetMode || 'entity');
  const [draftEntityId, setDraftEntityId] = useState(action.entityId || primaryId);
  const [extraJson, setExtraJson] = useState('{}');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [loadedConnection, setLoadedConnection] = useState(null);
  const extraDataId = React.useId();

  useEffect(() => {
    if (!conn || connected === false) return undefined;
    let cancelled = false;
    conn
      .sendMessagePromise({ type: 'get_services' })
      .then((result) => {
        if (!cancelled) {
          setServices(result || EMPTY_OBJECT);
          setLoadedConnection(conn);
          setLoadState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedConnection(conn);
          setLoadState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [conn, connected]);

  const availableServices = useMemo(() => {
    const options = Object.entries(services)
      .flatMap(([domain, items]) =>
        Object.entries(items)
          .filter(([_name, metadata]) => metadata?.response?.optional !== false)
          .map(([name]) => `${domain}.${name}`)
      )
      .sort();
    const [domain, name] = draftService.split('.');
    return draftService && !options.includes(draftService) && !services[domain]?.[name]
      ? [draftService, ...options]
      : options;
  }, [services, draftService]);
  const [serviceDomain, serviceName] = draftService.split('.');
  const metadata = services[serviceDomain]?.[serviceName];
  const fields = getServiceFields(metadata);
  const supportsTarget = Boolean(metadata?.target || metadata?.fields?.entity_id);
  const targetDomains = getServiceTargetDomains(metadata, serviceDomain);
  const targetOptions = Object.keys(entities).filter(
    (id) => !targetDomains.length || targetDomains.includes(id.split('.')[0])
  );
  const selectedTarget = targetOptions.includes(draftEntityId) ? draftEntityId : '';
  useEffect(() => {
    if (dirty || !metadata) return;
    const data = action.data || EMPTY_OBJECT;
    const knownFields = new Set(getServiceFields(metadata).map(([key]) => key));
    setDraft(Object.fromEntries(Object.entries(data).filter(([key]) => knownFields.has(key))));
    setExtraJson(
      JSON.stringify(
        Object.fromEntries(Object.entries(data).filter(([key]) => !knownFields.has(key))),
        null,
        2
      )
    );
  }, [metadata, action.data, dirty]);
  const serviceLabels = Object.fromEntries(
    availableServices.map((service) => {
      const [domain, name] = service.split('.');
      return [service, `${services[domain]?.[name]?.name || service} (${service})`];
    })
  );

  const applyData = () => {
    if (!metadata || metadata.response?.optional === false) {
      setError(t('sensor.custom.servicesUnavailable'));
      return;
    }
    let extra;
    try {
      extra = JSON.parse(extraJson || '{}');
      if (!extra || typeof extra !== 'object' || Array.isArray(extra)) throw new Error();
    } catch {
      setError(t('sensor.custom.invalidJson'));
      return;
    }
    const data = { ...draft, ...extra };
    const targetMode = supportsTarget ? draftTargetMode : 'none';
    if (targetMode === 'entity' && !selectedTarget && !data.entity_id && !data.target) {
      setError(
        t('sensor.custom.requiredField').replace('{field}', t('sensor.custom.actionTarget'))
      );
      return;
    }
    if (targetMode === 'none' && metadata.fields?.entity_id?.required && !data.entity_id) {
      setError(
        t('sensor.custom.requiredField').replace(
          '{field}',
          metadata.fields.entity_id.name || 'entity_id'
        )
      );
      return;
    }
    if (
      data.entity_id &&
      targetDomains.length &&
      [data.entity_id]
        .flat()
        .some((id) => typeof id !== 'string' || !targetDomains.includes(id.split('.')[0]))
    ) {
      setError(t('sensor.custom.invalidField').replace('{field}', t('sensor.custom.actionTarget')));
      return;
    }
    for (const [key, field] of fields) {
      if (field.required && (data[key] == null || data[key] === '')) {
        setError(t('sensor.custom.requiredField').replace('{field}', field.name || key));
        return;
      }
      if (data[key] === undefined || data[key] === '') {
        delete data[key];
        continue;
      }
      if (getFieldType(field) === 'json' && typeof data[key] === 'string') {
        try {
          data[key] = JSON.parse(data[key]);
        } catch {
          setError(t('sensor.custom.invalidJson'));
          return;
        }
      }
      if (getFieldType(field) === 'number') {
        const value = Number(data[key]);
        if (
          !Number.isFinite(value) ||
          (field.selector.number?.min != null && value < field.selector.number.min) ||
          (field.selector.number?.max != null && value > field.selector.number.max)
        ) {
          setError(t('sensor.custom.invalidField').replace('{field}', field.name || key));
          return;
        }
        data[key] = value;
      }
      if (getFieldType(field) === 'boolean' && typeof data[key] !== 'boolean') {
        setError(t('sensor.custom.invalidField').replace('{field}', field.name || key));
        return;
      }
      if (getFieldType(field) === 'select' && !field.selector.select?.custom_value) {
        const options = (field.selector.select?.options || []).map((option) =>
          typeof option === 'string' ? option : option.value
        );
        if (!options.includes(data[key])) {
          setError(t('sensor.custom.invalidField').replace('{field}', field.name || key));
          return;
        }
      }
    }
    updateAction({
      service: draftService,
      data,
      targetMode,
      entityId: targetMode === 'entity' ? selectedTarget || null : null,
    });
    setDraft(data);
    setExtraJson('{}');
    setError('');
    setDirty(false);
  };

  const changeService = (service) => {
    const [domain, name] = service.split('.');
    const selectedMetadata = services[domain]?.[name];
    setDraftService(service);
    setDraftTargetMode(
      selectedMetadata?.target || selectedMetadata?.fields?.entity_id ? 'entity' : 'none'
    );
    setDraft({});
    setExtraJson('{}');
    setError('');
    setDirty(true);
  };

  const connectionMessage =
    !conn || connected === false
      ? 'sensor.custom.servicesOffline'
      : loadedConnection !== conn || loadState === 'loading'
        ? 'sensor.custom.servicesLoading'
        : null;

  return (
    <div className="space-y-4">
      {connectionMessage ? (
        <p role="status" className="text-xs text-[var(--text-muted)]">
          {t(connectionMessage)}
        </p>
      ) : loadState === 'error' ? (
        <p role="alert" className="text-xs text-[var(--status-error-fg)]">
          {t('sensor.custom.servicesError')}
        </p>
      ) : null}
      <DropdownField
        icon={Zap}
        label={t('sensor.custom.service')}
        hint={metadata?.description}
        options={availableServices}
        current={draftService}
        map={serviceLabels}
        onChange={changeService}
        t={t}
      />
      {supportsTarget ? (
        <>
          <ToggleRow
            label={t('sensor.custom.useEntityTarget')}
            checked={draftTargetMode !== 'none'}
            onChange={(value) => {
              setDraftTargetMode(value ? 'entity' : 'none');
              setDirty(true);
            }}
          />
          {draftTargetMode !== 'none' ? (
            <EntityField
              label={t('sensor.custom.actionTarget')}
              value={selectedTarget}
              options={targetOptions}
              entities={entities}
              onChange={(id) => {
                setDraftEntityId(id || '');
                setDirty(true);
              }}
              t={t}
            />
          ) : null}
        </>
      ) : null}
      {draftService ? (
        <>
          {fields.map(([key, field]) => (
            <ServiceField
              key={key}
              fieldKey={key}
              field={field}
              value={draft[key]}
              entities={entities}
              t={t}
              setValue={(value) => {
                setDraft((previous) => ({ ...previous, [key]: value }));
                setDirty(true);
                setError('');
              }}
            />
          ))}
          <Disclosure summary={t('sensor.custom.advancedData')}>
            <Field
              label={t('sensor.custom.serviceData')}
              hint={t('sensor.custom.advancedDataHint')}
              htmlFor={extraDataId}
            >
              <textarea
                id={extraDataId}
                className={`${FIELD_CLASS} font-mono`}
                rows={4}
                value={extraJson}
                onChange={(event) => {
                  setExtraJson(event.target.value);
                  setDirty(true);
                  setError('');
                }}
              />
            </Field>
          </Disclosure>
          {error ? (
            <p role="alert" className="text-xs text-[var(--status-error-fg)]">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 flex-1 text-[11px] text-[var(--text-muted)]">
              {dirty ? t('sensor.custom.unsavedData') : null}
            </p>
            <button
              type="button"
              onClick={applyData}
              className={`rounded-2xl px-5 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors ${dirty ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
            >
              {t('sensor.custom.applyData')}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
