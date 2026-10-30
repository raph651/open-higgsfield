import type { ModelDef } from '../types';

/** "4 s", "1 min 20 s", "12 min". */
export function formatSeconds(seconds: number): string {
  if (seconds < 1) return '<1 s';
  if (seconds < 90) return `${Math.round(seconds)} s`;
  const minutes = seconds / 60;
  return minutes < 10 ? `${Math.floor(minutes)} min ${Math.round(seconds - Math.floor(minutes) * 60)} s` : `${Math.round(minutes)} min`;
}

/**
 * What to show as the run time of a model: the time of its last real render on this machine when there is one,
 * otherwise the model's rough guide. null when there is nothing honest to say.
 */
export function runTimeLabel(model: ModelDef, measuredSeconds?: number): { label: string; title: string; measured: boolean } | null {
  if (measuredSeconds) {
    return { label: formatSeconds(measuredSeconds), title: 'Time of your last render with this model on this machine', measured: true };
  }
  if (model.eta) return { label: model.eta.label, title: model.eta.note, measured: false };
  return null;
}
