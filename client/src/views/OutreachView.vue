<script setup>
import { onMounted } from 'vue';
import { useContactsStore } from '../stores/contacts.js';

const contacts = useContactsStore();

onMounted(() => contacts.fetchAll());
</script>

<template>
  <main class="container">
    <h1>People &amp; outreach</h1>
    <p class="sub">Your hitlist, your timers, and who to chase next.</p>

    <p v-if="contacts.loading" class="empty">Loading…</p>
    <p v-else-if="contacts.error" class="error">Couldn't load contacts.</p>
    <p v-else class="empty">
      {{ contacts.items.length }} contact(s) loaded. The pipeline view arrives in Phase 6.
    </p>
  </main>
</template>
