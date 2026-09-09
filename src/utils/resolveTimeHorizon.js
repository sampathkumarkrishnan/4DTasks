import { TIME_HORIZON_CONFIG, DEFAULT_TIME_HORIZON } from '../constants/timeHorizon';
import { taskMetadata } from '../services/googleTasksApi';

function pickHorizonId(source) {
  if (!source) return DEFAULT_TIME_HORIZON;
  if (source.timeHorizon) return source.timeHorizon;
  if (source.metadata?.timeHorizon) return source.metadata.timeHorizon;
  if (source.notes) {
    const parsed = taskMetadata.parse(source.notes);
    if (parsed.timeHorizon) return parsed.timeHorizon;
  }
  return DEFAULT_TIME_HORIZON;
}

function normalizeHorizonId(id) {
  if (id && TIME_HORIZON_CONFIG[id]) return id;
  return DEFAULT_TIME_HORIZON;
}

export function resolveTimeHorizon(source) {
  const id = normalizeHorizonId(pickHorizonId(source));
  const config = TIME_HORIZON_CONFIG[id];
  return {
    id,
    color: config.color,
    title: config.title,
    subtitle: config.subtitle,
    tooltipLabel: `${config.title} — ${config.subtitle}`,
  };
}

export function resolveTimeHorizonColor(source) {
  return resolveTimeHorizon(source).color;
}
