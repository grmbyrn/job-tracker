<script setup>
import { onMounted } from 'vue';
import { useApplicationsStore } from '../stores/applications.js';

const applications = useApplicationsStore();

onMounted(() => applications.fetchAll());
</script>

<template>
  <main class="container">
    <h1>Applications</h1>
    <p class="sub">Where each application stands.</p>

    <p v-if="applications.loading" class="empty">Loading…</p>
    <p v-else-if="applications.error" class="error">Couldn't load applications.</p>
    <p v-else class="empty">
      {{ applications.items.length }} application(s) loaded. Status groups arrive in Phase 6.
    </p>
  </main>
</template>
