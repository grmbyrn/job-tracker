<script setup>
import { ref, computed, onMounted } from 'vue';
import { usePlanStore } from '../stores/plan.js';

const plan = usePlanStore();
const newTitle = ref('');
const busy = ref(false);
const formError = ref('');

onMounted(() => plan.load());

// Progress toward the next badge: how many cleared days, and how many to go.
const progress = computed(() => {
  const target = plan.nextMilestone ?? 0;
  const remaining = Math.max(0, target - plan.points);
  const pct = target ? Math.min(100, Math.round((plan.points / target) * 100)) : 0;
  return { target, remaining, pct };
});

async function addTask() {
  const title = newTitle.value.trim();
  if (!title || busy.value) return;
  busy.value = true;
  formError.value = '';
  try {
    await plan.addTask(title);
    newTitle.value = '';
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
    <h1>Today</h1>
    <p class="sub">Jot down what you want to get done, then check it off. That's the whole plan.</p>

    <!-- Points + next milestone -->
    <div class="progress-card">
      <div class="progress-top">
        <div>
          <div class="points-num">{{ plan.points }}</div>
          <div class="points-lbl">{{ plan.points === 1 ? 'day cleared' : 'days cleared' }}</div>
        </div>
        <div v-if="progress.target" class="next-lbl">
          {{ progress.remaining }}
          {{ progress.remaining === 1 ? 'day' : 'days' }} to your {{ progress.target }}-day badge
        </div>
      </div>
      <div v-if="progress.target" class="bar">
        <div class="bar-fill" :style="{ width: progress.pct + '%' }" />
      </div>
    </div>

    <p v-if="formError" class="error">{{ formError }}</p>
    <div class="add">
      <div class="add-row">
        <input
          v-model="newTitle"
          placeholder="add something you want to do today…"
          aria-label="new task"
          @keydown.enter="addTask"
        />
        <button class="btn btn-primary" :disabled="busy || !newTitle.trim()" @click="addTask">
          + add
        </button>
      </div>
    </div>

    <p v-if="plan.loading" class="empty">Loading…</p>
    <p v-else-if="plan.error" class="error">Couldn't load your plan.</p>
    <template v-else>
      <!-- Cleared-day celebration -->
      <div v-if="plan.allDone" class="cleared">
        🎉 Everything's checked off. Keep it clear through midnight to earn today's point.
      </div>

      <div class="section-label">
        Your list
        <span v-if="plan.tasks.length" class="count">
          {{ plan.doneCount }}/{{ plan.tasks.length }}
        </span>
      </div>

      <ul class="checklist">
        <li v-for="t in plan.tasks" :key="t.id" class="task" :class="{ done: t.done }">
          <label class="task-main">
            <input type="checkbox" :checked="t.done" @change="plan.toggle(t)" />
            <span class="task-title">{{ t.title }}</span>
          </label>
          <button class="btn btn-mini" title="remove" @click="plan.removeTask(t.id)">✕</button>
        </li>
      </ul>
      <p v-if="!plan.tasks.length" class="empty">
        Nothing here yet — add the first thing you want to get done. Even one counts.
      </p>

      <!-- Milestone badges -->
      <div class="section-label">Milestones</div>
      <div class="badges">
        <div
          v-for="b in plan.ladder"
          :key="b.threshold"
          class="badge"
          :class="{ earned: b.earned }"
        >
          <div class="badge-num">{{ b.threshold }}</div>
          <div class="badge-lbl">{{ b.threshold === 1 ? 'day' : 'days' }}</div>
          <div class="badge-mark">{{ b.earned ? '★' : '☆' }}</div>
        </div>
      </div>
      <p class="hint">
        One point per fully-cleared day. Points only add up — a missed day never sets you back.
      </p>
    </template>
  </main>
</template>

<style scoped>
.progress-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px;
  margin: 16px 0;
  box-shadow: var(--shadow-sm);
}
.progress-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.points-num {
  font-family: var(--font-display);
  font-size: 2.1rem;
  font-weight: 700;
  line-height: 1;
  color: var(--primary);
}
.points-lbl {
  color: var(--text-3);
  font-size: 0.85rem;
}
.next-lbl {
  color: var(--text-2);
  font-size: 0.9rem;
  text-align: right;
}
.bar {
  margin-top: 12px;
  height: 8px;
  background: var(--surface-2);
  border-radius: 999px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--primary));
  transition: width 0.3s ease;
}
.count {
  color: var(--text-3);
  font-weight: 400;
}
.cleared {
  background: var(--ok-bg);
  color: var(--ok);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  margin: 16px 0 4px;
  font-weight: 600;
}
.checklist {
  list-style: none;
  margin: 0;
  padding: 0;
}
.task {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  background: var(--surface);
}
.task-main {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex: 1;
}
.task-main input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
.task.done .task-title {
  text-decoration: line-through;
  color: var(--text-3);
}
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.badge {
  width: 72px;
  text-align: center;
  padding: 10px 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-3);
  opacity: 0.7;
}
.badge.earned {
  background: var(--primary-soft);
  color: var(--info);
  border-color: color-mix(in srgb, var(--primary) 45%, transparent);
  opacity: 1;
}
.badge-num {
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.1;
}
.badge-lbl {
  font-size: 0.75rem;
}
.badge-mark {
  font-size: 1rem;
  margin-top: 2px;
}
</style>
