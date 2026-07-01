<script setup>
import { onMounted } from 'vue';
import { useCompaniesStore } from '../stores/companies.js';

const companies = useCompaniesStore();

onMounted(() => companies.fetchAll());
</script>

<template>
  <main class="container">
    <h1>Target companies</h1>
    <p class="sub">Companies you're working toward, and who you've reached there.</p>

    <p v-if="companies.loading" class="empty">Loading…</p>
    <p v-else-if="companies.error" class="error">Couldn't load companies.</p>
    <p v-else class="empty">
      {{ companies.items.length }} company/companies loaded. Linked contacts arrive in Phase 6.
    </p>
  </main>
</template>
