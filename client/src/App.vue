<script setup>
import { useRouter, RouterLink, RouterView } from 'vue-router';
import { useAuthStore } from './stores/auth.js';
import { useTheme } from './composables/useTheme.js';

const auth = useAuthStore();
const router = useRouter();
const { theme, cycle } = useTheme();

const themeLabel = { auto: 'Auto', light: 'Light', dark: 'Dark' };

async function logout() {
  await auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <header v-if="auth.isAuthenticated" class="app-header">
    <div class="app-header-inner">
      <span class="brand">Outreach tracker</span>
      <nav class="nav">
        <RouterLink :to="{ name: 'outreach' }">People</RouterLink>
        <RouterLink :to="{ name: 'applications' }">Applications</RouterLink>
        <RouterLink :to="{ name: 'companies' }">Companies</RouterLink>
      </nav>
      <button class="btn btn-mini" type="button" @click="cycle">
        {{ themeLabel[theme] }}
      </button>
      <button class="btn btn-mini" type="button" @click="logout">Log out</button>
    </div>
  </header>

  <RouterView />
</template>
