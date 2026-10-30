import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** What is shown. */
export type ThemeMode = 'light' | 'dark';
/** What the user chose: follow the system (the default) or pin one. */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'framegraph-theme';

interface ThemeState {
  preference: ThemePreference;
  /** the theme in effect: the preference, or the system's when the preference is "system" */
  theme: ThemeMode;
  setPreference: (preference: ThemePreference) => void;
  /** system -> light -> dark -> system */
  toggleTheme: () => void;
}

const ORDER: ThemePreference[] = ['system', 'light', 'dark'];

function systemTheme(): ThemeMode {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(preference: ThemePreference): ThemeMode {
  return preference === 'system' ? systemTheme() : preference;
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#07090c' : '#ffffff');
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: 'system',
      theme: systemTheme(),
      setPreference: (preference) => {
        const theme = resolveTheme(preference);
        applyTheme(theme);
        set({ preference, theme });
      },
      toggleTheme: () => get().setPreference(ORDER[(ORDER.indexOf(get().preference) + 1) % ORDER.length]),
    }),
    {
      name: THEME_STORAGE_KEY,
      version: 2,
      // before v2 the choice was stored as { theme } and only ever written by pressing the toggle
      migrate: (persisted) => {
        const old = (persisted ?? {}) as { theme?: ThemeMode; preference?: ThemePreference };
        return { preference: old.preference ?? old.theme ?? 'system' } as Pick<ThemeState, 'preference'>;
      },
      partialize: (state) => ({ preference: state.preference }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const theme = resolveTheme(state.preference);
        applyTheme(theme);
        useThemeStore.setState({ theme });
      },
    },
  ),
);

// Follow the system live while the preference is "system". The media query's change event does the work; refreshing
// on focus and when the tab becomes visible again covers browsers that do not deliver it to a hidden tab.
if (typeof window !== 'undefined' && window.matchMedia) {
  const followSystem = () => {
    const { preference, theme, setPreference } = useThemeStore.getState();
    if (preference === 'system' && resolveTheme('system') !== theme) setPreference('system');
  };
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', followSystem);
  window.addEventListener('focus', followSystem);
  document.addEventListener('visibilitychange', followSystem);
}
