import { LoaderCircle, PlugZap } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';

interface ProviderBadgeProps {
  compact?: boolean;
}

export function ProviderBadge({ compact = false }: ProviderBadgeProps) {
  const useComfy = useSettingsStore((state) => state.useComfy);
  const connection = useSettingsStore((state) => state.connection);
  const serverVersion = useSettingsStore((state) => state.serverVersion);
  const locked = useSettingsStore((state) => state.locked);
  const open = useSettingsStore((state) => state.openConnection);

  const label = !useComfy
    ? 'Demo provider'
    : connection === 'online'
      ? locked
        ? 'ComfyUI online · key needed'
        : `ComfyUI${serverVersion ? ` ${serverVersion}` : ''}`
      : connection === 'checking'
        ? 'Checking ComfyUI'
        : 'ComfyUI offline';

  const status = !useComfy ? 'demo' : connection;

  return (
    <button
      className={`provider-badge provider-badge--${status} ${compact ? 'provider-badge--compact' : ''}`}
      onClick={open}
      title="ComfyUI connection settings"
    >
      {connection === 'checking' ? (
        <LoaderCircle size={12} className="spin" />
      ) : (
        <span className={`provider-badge__dot provider-badge__dot--${status}`} />
      )}
      {!compact && <span>{label}</span>}
      {compact && <PlugZap size={12} />}
    </button>
  );
}
