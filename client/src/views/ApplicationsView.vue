<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useApplicationsStore } from '../stores/applications.js';
import { initials, href, toDateInput, today, daysSince } from '../lib/format.js';

const applications = useApplicationsStore();
const busy = ref(false);
const formError = ref('');

const form = reactive({
  company: '',
  position: '',
  link: '',
  appliedDate: today(),
  note: '',
});

onMounted(() => applications.fetchAll());

const STATUS_LABEL = {
  applied: 'applied',
  interview: 'interviewing',
  offer: 'offer',
  rejected: 'rejected',
};

const stats = computed(() => {
  const counts = { applied: 0, interview: 0, offer: 0, rejected: 0 };
  for (const a of applications.items) if (counts[a.status] != null) counts[a.status] += 1;
  return counts;
});

const byDateDesc = (a, b) => toDateInput(b.appliedDate).localeCompare(toDateInput(a.appliedDate));

const groups = computed(() => {
  const of = (status) => applications.items.filter((a) => a.status === status).sort(byDateDesc);
  const out = [];
  const applied = of('applied');
  const interview = of('interview');
  const offer = of('offer');
  const rejected = of('rejected');
  if (applied.length)
    out.push({ key: 'applied', label: 'Applied — waiting to hear back', items: applied });
  if (interview.length) out.push({ key: 'interview', label: 'Interviewing', items: interview });
  if (offer.length) out.push({ key: 'offer', label: 'Offers', items: offer });
  if (rejected.length) out.push({ key: 'rejected', label: 'Rejected / closed', items: rejected });
  return out;
});

function appliedWhen(a) {
  const date = toDateInput(a.appliedDate);
  if (!date) return '';
  const d = daysSince(a.appliedDate);
  return `applied ${date} (${d <= 0 ? 'today' : d + 'd ago'})`;
}

async function addApp() {
  const company = form.company.trim();
  if (!company || busy.value) return;
  busy.value = true;
  formError.value = '';
  try {
    await applications.create({
      company,
      position: form.position.trim() || null,
      link: form.link.trim() || null,
      note: form.note.trim() || null,
      appliedDate: form.appliedDate || today(),
    });
    Object.assign(form, { company: '', position: '', link: '', note: '', appliedDate: today() });
  } catch (e) {
    formError.value =
      e.response?.data?.error || 'Could not add — is the server running? Please try again.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="container">
    <h1>Applications</h1>
    <p class="sub">Where each application stands.</p>

    <div class="stats">
      <div class="stat">
        <div class="stat-num">{{ stats.applied }}</div>
        <div class="stat-lbl">applied</div>
      </div>
      <div class="stat">
        <div class="stat-num">{{ stats.interview }}</div>
        <div class="stat-lbl">interviewing</div>
      </div>
      <div class="stat">
        <div class="stat-num">{{ stats.offer }}</div>
        <div class="stat-lbl">offers</div>
      </div>
      <div class="stat">
        <div class="stat-num">{{ stats.rejected }}</div>
        <div class="stat-lbl">rejected</div>
      </div>
    </div>

    <p v-if="formError" class="error">{{ formError }}</p>
    <div class="add">
      <div class="add-row">
        <input v-model="form.company" placeholder="company" @keydown.enter="addApp" />
        <input v-model="form.position" placeholder="position / role" />
      </div>
      <div class="add-row">
        <input v-model="form.link" placeholder="link to job ad (optional)" />
        <input v-model="form.appliedDate" type="date" />
      </div>
      <div class="add-row">
        <input v-model="form.note" placeholder="note (optional)" />
      </div>
      <div class="add-row">
        <button class="btn btn-primary" :disabled="busy" @click="addApp">+ add application</button>
      </div>
    </div>

    <p v-if="applications.loading" class="empty">Loading…</p>
    <p v-else-if="applications.error" class="error">Couldn't load applications.</p>
    <template v-else>
      <div v-for="g in groups" :key="g.key">
        <div class="section-label">{{ g.label }}</div>
        <div v-for="a in g.items" :key="a.id" class="item">
          <div class="avatar">{{ initials(a.company) }}</div>
          <div class="body">
            <div class="name">{{ a.company }}</div>
            <div class="meta">
              <span class="stage" :class="`s-${a.status}`">{{ STATUS_LABEL[a.status] }}</span>
              <template v-if="a.position"> · {{ a.position }}</template>
              <template v-if="a.link">
                · <a class="link" :href="href(a.link)" target="_blank" rel="noopener">job ad</a>
              </template>
              <template v-if="appliedWhen(a)"> · {{ appliedWhen(a) }}</template>
              <template v-if="a.note"> · {{ a.note }}</template>
            </div>
          </div>
          <div class="actions">
            <template v-if="a.status === 'applied'">
              <button class="btn btn-mini" @click="applications.setStatus(a.id, 'interview')">
                interview
              </button>
              <button class="btn btn-mini" @click="applications.setStatus(a.id, 'rejected')">
                rejected
              </button>
            </template>
            <template v-if="a.status === 'interview'">
              <button class="btn btn-mini" @click="applications.setStatus(a.id, 'offer')">
                got offer
              </button>
              <button class="btn btn-mini" @click="applications.setStatus(a.id, 'rejected')">
                rejected
              </button>
            </template>
            <button
              v-if="a.status === 'rejected' || a.status === 'offer'"
              class="btn btn-mini"
              @click="applications.setStatus(a.id, 'applied')"
            >
              reopen
            </button>
            <button class="btn btn-mini" title="delete" @click="applications.remove(a.id)">
              ✕
            </button>
          </div>
        </div>
      </div>
      <p v-if="!groups.length" class="empty">no applications yet — add one above.</p>
    </template>
  </main>
</template>
