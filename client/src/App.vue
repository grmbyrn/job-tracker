<script setup>
import { ref } from 'vue';
import { useRouter, RouterLink, RouterView } from 'vue-router';
import { useAuthStore } from './stores/auth.js';
import { useContactsStore } from './stores/contacts.js';
import { useApplicationsStore } from './stores/applications.js';
import { useCompaniesStore } from './stores/companies.js';
import { useSettingsStore } from './stores/settings.js';
import { useTheme } from './composables/useTheme.js';
import api from './api/client.js';
import { toDateInput, today } from './lib/format.js';

const auth = useAuthStore();
const contacts = useContactsStore();
const applications = useApplicationsStore();
const companies = useCompaniesStore();
const settings = useSettingsStore();
const router = useRouter();
const { theme, cycle } = useTheme();

const themeLabel = { auto: 'Auto', light: 'Light', dark: 'Dark' };
const fileInput = ref(null);
const importing = ref(false);

async function logout() {
  await auth.logout();
  router.push({ name: 'login' });
}

// Refetch every store — used after an import so all three views reflect it.
function reloadAll() {
  return Promise.all([
    contacts.fetchAll(),
    applications.fetchAll(),
    companies.fetchAll(),
    settings.fetch(),
  ]);
}

// Build the prototype's "Export backup" shape from live data, then download it.
async function exportBackup() {
  await reloadAll();
  const backup = {
    items: contacts.items.map((c) => ({
      name: c.name,
      person: c.person,
      personRole: c.personRole,
      link: c.link,
      lane: c.lane,
      channel: c.channel,
      status: c.stage,
      firstDate: toDateInput(c.firstDate),
      lastDate: toDateInput(c.lastDate),
      followups: c.followups,
    })),
    apps: applications.items.map((a) => ({
      company: a.company,
      position: a.position,
      link: a.link,
      note: a.note,
      appliedDate: toDateInput(a.appliedDate),
      status: a.status,
    })),
    targets: companies.items.map((t) => ({
      name: t.name,
      link: t.link,
      contacted: t.contactedCount ?? 0,
    })),
    timers: settings.timers,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `outreach-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function onImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  // Reset so re-picking the same file fires change again.
  event.target.value = '';
  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    alert('Could not read that file.');
    return;
  }
  // A bare array is the prototype's oldest export (just contacts).
  if (Array.isArray(backup)) backup = { items: backup };
  const replace = window.confirm(
    'Import backup:\n\nOK = REPLACE all your current data with this file.\nCancel = MERGE it into what you already have.',
  );
  importing.value = true;
  try {
    await api.post('/import', backup, { params: { mode: replace ? 'replace' : 'merge' } });
    await reloadAll();
  } catch {
    alert('Import failed. Please check the file and try again.');
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <header v-if="auth.isAuthenticated" class="app-header">
    <div class="app-header-inner">
      <RouterLink :to="{ name: 'plan' }" class="brand">
        <span class="brand-logo">✓</span> Job Tracker
      </RouterLink>
      <nav class="nav">
        <RouterLink :to="{ name: 'plan' }">Today</RouterLink>
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

  <div v-if="auth.isAuthenticated" class="container" style="padding-top: 0">
    <div class="toolbar">
      <button class="btn" type="button" :disabled="importing" @click="exportBackup">
        Export backup
      </button>
      <button class="btn" type="button" :disabled="importing" @click="fileInput.click()">
        {{ importing ? 'Importing…' : 'Import backup' }}
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="application/json"
        style="display: none"
        @change="onImportFile"
      />
    </div>
    <p class="hint">
      Your data lives on the server. Export now and then to keep a JSON backup or move it between
      accounts.
    </p>
  </div>
</template>
