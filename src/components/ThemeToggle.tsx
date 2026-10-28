import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const night = theme === 'dark';

  return (
    <button
      className="canvas-icon theme-toggle"
      onClick={toggleTheme}
      title={night ? 'Switch to bright theme' : 'Switch to night theme'}
      aria-label={night ? 'Switch to bright theme' : 'Switch to night theme'}
      aria-pressed={night}
    >
      {night ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
