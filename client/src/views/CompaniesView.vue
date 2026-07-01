<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useCompaniesStore } from '../stores/companies.js';
import { useContactsStore } from '../stores/contacts.js';
import { TARGET_GOAL } from '../lib/constants.js';
import { initials, href } from '../lib/format.js';

const companies = useCompaniesStore();
const contacts = useContactsStore();
const busy = ref(false);
const formError = ref('');

const form = reactive({ name: '', link: '' });

onMounted(() => {
  companies.fetchAll();
  contacts.fetchAll();
});

// Progress is derived from real contacts: the server-computed contactedCount
// (linked contacts past the `hit` stage) vs the 3-person goal.
const isDone = (co) => (co.contactedCount || 0) >= TARGET_GOAL;

const stats = computed(() => {
  let active = 0;
  let done = 0;
  for (const co of companies.items) isDone(co) ? done++ : active++;
  return { active, done };
});

const groups = computed(() => {
  const active = companies.items.filter((co) => !isDone(co));
  const done = companies.items.filter(isDone);
  const out = [];
  if (active.length)
    out.push({ key: 'active', label: 'Working on — reach out to 3 people', items: active });
  if (done.length) out.push({ key: 'done', label: 'Done — 3 people contacted', items: done });
  return out;
});

// Contacts linked to a company (from the contacts store), for the sub-list.
const linkedContacts = (co) => contacts.items.filter((c) => c.companyId === co.id);

function dots(co) {
  const n = Math.min(co.contactedCount || 0, TARGET_GOAL);
  return '●'.repeat(n) + '○'.repeat(Math.max(0, TARGET_GOAL - n));
}

async function addCompany() {
  const name = form.name.trim();
  if (!name || busy.value) return;
  busy.value = true;
  formError.value = '';
  try {
    await companies.create({ name, link: form.link.trim() || null });
    Object.assign(form, { name: '', link: '' });
  } catch (e) {
    formError.value =
      e.response?.data?.error || 'Could not add — is the server running? Please try again.';
  } finally {
    busy.value = false;
  }
}

async function removeCompany(co) {
  await companies.remove(co.id);
  // Linked contacts get their companyId nulled server-side; refresh to match.
  contacts.fetchAll();
}
</script>

<template>
  <main class="container">
    <h1>Target companies</h1>
    <p class="sub">Companies you're working toward, and who you've reached there.</p>

    <div class="stats stats-2">
      <div class="stat">
        <div class="stat-num">{{ stats.active }}</div>
        <div class="stat-lbl">still working on</div>
      </div>
      <div class="stat">
        <div class="stat-num">{{ stats.done }}</div>
        <div class="stat-lbl">done (3 contacted)</div>
      </div>
    </div>

    <p v-if="formError" class="error">{{ formError }}</p>
    <div class="add">
      <div class="add-row">
        <input
          v-model="form.name"
          placeholder="company you want to reach out to"
          @keydown.enter="addCompany"
        />
      </div>
      <div class="add-row">
        <input v-model="form.link" placeholder="link to company page or job ad (optional)" />
      </div>
      <div class="add-row">
        <button class="btn btn-primary" :disabled="busy" @click="addCompany">+ add company</button>
      </div>
    </div>

    <p v-if="companies.loading" class="empty">Loading…</p>
    <p v-else-if="companies.error" class="error">Couldn't load companies.</p>
    <template v-else>
      <div v-for="g in groups" :key="g.key">
        <div class="section-label">{{ g.label }}</div>
        <div v-for="co in g.items" :key="co.id" class="item" :class="{ done: isDone(co) }">
          <div class="avatar">{{ initials(co.name) }}</div>
          <div class="body">
            <div class="name">{{ co.name }}</div>
            <div class="meta">
              <template v-if="isDone(co)">
                <span class="stage s-reply">✓ done</span> · {{ co.contactedCount }} people contacted
              </template>
              <template v-else>
                <span class="dots">{{ dots(co) }}</span> ·
                {{ Math.min(co.contactedCount || 0, TARGET_GOAL) }} / {{ TARGET_GOAL }} people
                contacted
              </template>
              <template v-if="co.link">
                · <a class="link" :href="href(co.link)" target="_blank" rel="noopener">link</a>
              </template>
            </div>
            <div v-if="linkedContacts(co).length" class="sublist">
              Reached:
              {{
                linkedContacts(co)
                  .map((c) => c.name)
                  .join(', ')
              }}
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-mini" title="delete" @click="removeCompany(co)">✕</button>
          </div>
        </div>
      </div>
      <p v-if="!groups.length" class="empty">no target companies yet — add one above.</p>
    </template>
  </main>
</template>
