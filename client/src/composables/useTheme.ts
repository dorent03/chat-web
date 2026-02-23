import { ref, watch, onMounted } from 'vue';

const THEME_KEY = 'chat-web-theme';

type Theme = 'light' | 'dark';

const currentTheme = ref<Theme>('dark');

/** Composable for managing dark/light theme toggle */
export function useTheme() {
  function setTheme(theme: Theme) {
    currentTheme.value = theme;
    localStorage.setItem(THEME_KEY, theme);

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function toggleTheme() {
    setTheme(currentTheme.value === 'dark' ? 'light' : 'dark');
  }

  function initTheme() {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    setTheme(theme);
  }

  onMounted(() => {
    initTheme();
  });

  watch(currentTheme, (theme) => {
    setTheme(theme);
  });

  return {
    currentTheme,
    setTheme,
    toggleTheme,
    initTheme,
  };
}
