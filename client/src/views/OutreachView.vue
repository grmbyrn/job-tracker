<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useContactsStore } from '../stores/contacts.js';
import { useCompaniesStore } from '../stores/companies.js';
import { useSettingsStore } from '../stores/settings.js';
import { LANES, CHANNELS } from '../lib/constants.js';
import { initials, href } from '../lib/format.js';

const contacts = useContactsStore();
const companies = useCompaniesStore();
const settings = useSettingsStore();

const lane = ref('all');
const busy = ref(false);
const formError = ref('');

// Add form (mirrors the prototype's fields, plus an optional company link).
const form = reactive({
  name: '',
  lane: 'Agency',
  person: '',
  personRole: '',
  channel: 'Email',
  link: '',
  note: '',
  companyId: '',
});

onMounted(() => {
  contacts.fetchAll();
  companies.fetchAll();
  settings.fetch();
});

// Count every contact per lane (any stage), for the tab badges.
const laneCounts = computed(() => {
  const counts = { Agency: 0, Company: 0, Freelance: 0, Warm: 0 };
  for (const c of contacts.items) if (counts[c.lane] != null) counts[c.lane] += 1;
  return counts;
});

const pool = computed(() =>
  contacts.items.filter((c) => lane.value === 'all' || c.lane === lane.value),
);

const stats = computed(() => {
  let hit = 0;
  let waiting = 0;
  let comm = 0;
  let due = 0;
  for (const c of contacts.items) {
    if (c.stage === 'hit') hit += 1;
    if ((c.stage === 'sent' || c.stage === 'contacted') && !c.isDue) waiting += 1;
    if (c.stage === 'communication') comm += 1;
    if (c.isDue) due += 1;
  }
  return { hit, waiting, comm, due };
});

// Sort helper: fewest days left first; unknown (null) sinks to the bottom.
const byDaysLeft = (a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity);

// Pipeline groups in the prototype's order.
const groups = computed(() => {
  const p = pool.value;
  const out = [];
  const due = p.filter((c) => c.isDue);
  const hit = p.filter((c) => c.stage === 'hit');
  const sent = p.filter((c) => c.stage === 'sent' && !c.isDue).sort(byDaysLeft);
  const accepted = p.filter((c) => c.stage === 'accepted');
  const contacted = p.filter((c) => c.stage === 'contacted' && !c.isDue).sort(byDaysLeft);
  const comm = p.filter((c) => c.stage === 'communication');
  if (due.length) out.push({ key: 'due', label: '⏰ Time to follow up', alert: true, items: due });
  if (hit.length)
    out.push({ key: 'hit', label: 'Hitlist — not contacted yet', alert: false, items: hit });
  if (sent.length)
    out.push({
      key: 'sent',
      label: 'Waiting for connection to be accepted',
      alert: false,
      items: sent,
    });
  if (accepted.length)
    out.push({
      key: 'accepted',
      label: 'Accepted — send them a message',
      alert: false,
      items: accepted,
    });
  if (contacted.length)
    out.push({
      key: 'contacted',
      label: 'Contacted — waiting for reply',
      alert: false,
      items: contacted,
    });
  if (comm.length) out.push({ key: 'comm', label: 'In communication', alert: false, items: comm });
  return out;
});

// Per-contact display bits.
const rowClass = (c) => (c.stage === 'hit' ? 'item hit' : c.isDue ? 'item due' : 'item');

function stageLabel(c) {
  switch (c.stage) {
    case 'sent':
      return { text: 'awaiting connection', cls: 's-await' };
    case 'contacted':
      return { text: 'message sent', cls: 's-applied' };
    case 'accepted':
      return { text: 'accepted connection', cls: 's-reply' };
    case 'communication':
      return { text: 'in communication', cls: 's-offer' };
    default:
      return null; // hit → plain text
  }
}

function countdown(c) {
  if (c.stage !== 'sent' && c.stage !== 'contacted') return null;
  if (c.isDue) return { text: 'chase now', soon: true };
  if (c.daysLeft == null) return null;
  return { text: `${c.daysLeft}d left`, soon: c.daysLeft <= 2 };
}

async function addContact(stage) {
  const name = form.name.trim();
  if (!name || busy.value) return;
  busy.value = true;
  formError.value = '';
  try {
    const payload = {
      name,
      lane: form.lane,
      channel: form.channel,
      person: form.person.trim() || null,
      personRole: form.personRole.trim() || null,
      link: form.link.trim() || null,
      companyId: form.companyId || null,
      stage,
    };
    if (stage === 'sent') {
      payload.firstDate = new Date().toISOString();
      payload.lastDate = payload.firstDate;
    }
    await contacts.create({ ...payload, note: form.note.trim() || null });
    if (form.companyId) companies.fetchAll(); // refresh derived contacted counts
    Object.assign(form, { name: '', person: '', personRole: '', link: '', note: '' });
  } catch (e) {
    formError.value =
      e.response?.data?.error || 'Could not add — is the server running? Please try again.';
  } finally {
    busy.value = false;
  }
}

async function advance(c, stage) {
  await contacts.setStage(c.id, stage);
  if (c.companyId) companies.fetchAll();
}

async function didFollowup(c) {
  await contacts.followup(c.id);
}

async function removeContact(c) {
  await contacts.remove(c.id);
  if (c.companyId) companies.fetchAll();
}

// Persist a timer change, then refetch contacts so countdowns reflect it.
async function saveTimer(key, event) {
  const raw = parseInt(event.target.value, 10);
  const value = key === 'max' ? Math.max(1, raw || 2) : Math.max(0, raw || 0);
  await settings.save({ [key]: value });
  await contacts.fetchAll();
}
</script>

<template>
  <main class="container">
    <h1>People &amp; outreach</h1>
    <p class="sub">Your hitlist, your timers, and who to chase next.</p>

    <div class="stats">
      <div class="stat">
        <div class="stat-num">{{ stats.hit }}</div>
        <div class="stat-lbl">to contact</div>
      </div>
      <div class="stat">
        <div class="stat-num">{{ stats.waiting }}</div>
        <div class="stat-lbl">waiting</div>
      </div>
      <div class="stat">
        <div class="stat-num">{{ stats.comm }}</div>
        <div class="stat-lbl">in comms</div>
      </div>
      <div class="stat alert">
        <div class="stat-num">{{ stats.due }}</div>
        <div class="stat-lbl">follow up now</div>
      </div>
    </div>

    <div class="tabs">
      <div class="tab" :class="{ active: lane === 'all' }" @click="lane = 'all'">All</div>
      <div
        v-for="l in LANES"
        :key="l.value"
        class="tab"
        :class="{ active: lane === l.value }"
        @click="lane = l.value"
      >
        {{ l.tab }} <span class="badge">{{ laneCounts[l.value] }}</span>
      </div>
    </div>

    <p v-if="formError" class="error">{{ formError }}</p>
    <div class="add">
      <div class="add-row">
        <input
          v-model="form.name"
          placeholder="name or company"
          @keydown.enter="addContact('hit')"
        />
        <select v-model="form.lane">
          <option v-for="l in LANES" :key="l.value" :value="l.value">{{ l.label }}</option>
        </select>
      </div>
      <div class="add-row">
        <input v-model="form.person" placeholder="contact person" />
        <input v-model="form.personRole" placeholder="their position / role (optional)" />
      </div>
      <div class="add-row">
        <select v-model="form.channel">
          <option v-for="ch in CHANNELS" :key="ch.value" :value="ch.value">{{ ch.label }}</option>
        </select>
        <select v-model="form.companyId">
          <option value="">— no target company —</option>
          <option v-for="co in companies.items" :key="co.id" :value="co.id">{{ co.name }}</option>
        </select>
      </div>
      <div class="add-row">
        <input v-model="form.link" placeholder="link, e.g. LinkedIn profile URL (optional)" />
        <input v-model="form.note" placeholder="note (optional)" />
      </div>
      <div class="add-row">
        <button class="btn btn-primary" style="flex: 2" :disabled="busy" @click="addContact('hit')">
          + add to hitlist
        </button>
        <button class="btn" style="flex: 1" :disabled="busy" @click="addContact('sent')">
          add as already contacted
        </button>
      </div>
    </div>

    <details class="settings">
      <summary>Follow-up timers (days before something needs a chase)</summary>
      <div class="settings-body">
        <div class="set-row">
          <label>Agencies</label>
          <input
            type="number"
            min="1"
            max="60"
            :value="settings.timers.Agency"
            @change="saveTimer('Agency', $event)"
          />
        </div>
        <div class="set-row">
          <label>Companies / jobs</label>
          <input
            type="number"
            min="1"
            max="60"
            :value="settings.timers.Company"
            @change="saveTimer('Company', $event)"
          />
        </div>
        <div class="set-row">
          <label>Freelance / local business</label>
          <input
            type="number"
            min="1"
            max="60"
            :value="settings.timers.Freelance"
            @change="saveTimer('Freelance', $event)"
          />
        </div>
        <div class="set-row">
          <label>Warm contacts (0 = never auto-surface)</label>
          <input
            type="number"
            min="0"
            max="90"
            :value="settings.timers.Warm"
            @change="saveTimer('Warm', $event)"
          />
        </div>
        <div class="set-row">
          <label>Max follow-ups before it stops chasing</label>
          <input
            type="number"
            min="1"
            max="5"
            :value="settings.timers.max"
            @change="saveTimer('max', $event)"
          />
        </div>
      </div>
    </details>

    <p v-if="contacts.loading" class="empty">Loading…</p>
    <p v-else-if="contacts.error" class="error">Couldn't load contacts.</p>
    <template v-else>
      <div v-for="g in groups" :key="g.key">
        <div class="section-label" :class="{ alert: g.alert }">{{ g.label }}</div>
        <div v-for="c in g.items" :key="c.id" :class="rowClass(c)">
          <div class="avatar">{{ initials(c.person || c.name) }}</div>
          <div class="body">
            <div class="name">
              {{ c.name }}
              <span class="pill">{{ c.channel }}</span>
              <span v-if="countdown(c)" class="countdown" :class="{ soon: countdown(c).soon }">
                {{ countdown(c).text }}
              </span>
            </div>
            <div class="meta">
              <span v-if="stageLabel(c)" class="stage" :class="stageLabel(c).cls">
                {{ stageLabel(c).text }}
              </span>
              <span v-else>on hitlist</span>
              <template v-if="c.followups">
                · {{ c.followups }} follow-up{{ c.followups > 1 ? 's' : '' }}
              </template>
              <template v-if="c.person">
                · 👤 {{ c.person }}<template v-if="c.personRole"> ({{ c.personRole }})</template>
              </template>
              <template v-if="c.link">
                · <a class="link" :href="href(c.link)" target="_blank" rel="noopener">link</a>
              </template>
            </div>
          </div>
          <div class="actions">
            <button v-if="c.stage === 'hit'" class="btn btn-mini" @click="advance(c, 'sent')">
              mark sent
            </button>
            <button v-if="c.stage === 'sent'" class="btn btn-mini" @click="advance(c, 'accepted')">
              accepted
            </button>
            <button
              v-if="c.stage === 'accepted'"
              class="btn btn-mini"
              @click="advance(c, 'contacted')"
            >
              send message
            </button>
            <button
              v-if="c.stage === 'contacted'"
              class="btn btn-mini"
              @click="advance(c, 'communication')"
            >
              replied
            </button>
            <button v-if="c.isDue" class="btn btn-mini" @click="didFollowup(c)">
              did follow-up
            </button>
            <button class="btn btn-mini" title="delete" @click="removeContact(c)">✕</button>
          </div>
        </div>
      </div>
      <p v-if="!groups.length" class="empty">
        {{
          contacts.items.length
            ? 'nothing in this lane yet.'
            : 'nothing yet — add your first target above.'
        }}
      </p>
    </template>
  </main>
</template>
