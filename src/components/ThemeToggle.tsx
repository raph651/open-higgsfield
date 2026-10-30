import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemeStore, type ThemePreference } from '../store/useThemeStore';

export const THEME_LABEL: Record<ThemePreference, string> = {
  system: 'Auto (follows your system)',
  light: 'Bright',
  dark: 'Night',
};

export function ThemeIcon({ preference, size = 15 }: { preference: ThemePreference; size?: number }) {
  return preference === 'system' ? <Monitor size={size} /> : preference === 'dark' ? <Moon size={size} /> : <Sun size={size} />;
}

export function ThemeToggle() {
  const preference = useThemeStore((state) => state.preference);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <button
      className="canvas-icon theme-toggle"
      onClick={toggleTheme}
      title={`Theme: ${THEME_LABEL[preference]}. Click to change.`}
      aria-label={`Theme: ${THEME_LABEL[preference]}. Click to change.`}
    >
      <ThemeIcon preference={preference} />
    </button>
  );
}
