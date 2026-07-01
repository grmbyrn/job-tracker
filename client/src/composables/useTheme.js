import { ref, watchEffect } from 'vue';

// Ported from the prototype, which relied purely on prefers-color-scheme. Here
// we keep that as the "auto" default but allow an explicit light/dark override
// persisted across reloads. The stylesheet reads `data-theme` on <html>.
const STORAGE_KEY = 'jt-theme';
const MODES = ['auto', 'light', 'dark'];

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
const theme = ref(MODES.includes(stored) ? stored : 'auto');

watchEffect(() => {
  const root = document.documentElement;
  if (theme.value === 'auto') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme.value);
  }
  localStorage.setItem(STORAGE_KEY, theme.value);
});

export function useTheme() {
  // Cycle auto → light → dark → auto.
  function cycle() {
    const i = MODES.indexOf(theme.value);
    theme.value = MODES[(i + 1) % MODES.length];
  }
  return { theme, cycle };
}
