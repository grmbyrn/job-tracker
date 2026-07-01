import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api/client.js';
import { localToday } from '../lib/format.js';

// Daily Plan store (Phase 8, 8a). Holds today's checklist plus the cumulative
// points / milestone ladder. Points only change when a past day rolls over
// (server-side, on load), so progress is fetched alongside the plan — not on
// every task edit.
export const usePlanStore = defineStore('plan', () => {
  const plan = ref(null);
  const points = ref(0);
  const ladder = ref([]);
  const nextMilestone = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const tasks = computed(() => plan.value?.tasks ?? []);
  const doneCount = computed(() => tasks.value.filter((t) => t.done).length);
  // A cleared day = at least one task, all checked off (mirrors the point rule).
  const allDone = computed(() => tasks.value.length > 0 && doneCount.value === tasks.value.length);

  function replaceTask(task) {
    const i = plan.value.tasks.findIndex((t) => t.id === task.id);
    if (i !== -1) plan.value.tasks[i] = task;
  }

  async function fetchProgress() {
    const { data } = await api.get('/plan/progress');
    points.value = data.points;
    ladder.value = data.ladder;
    nextMilestone.value = data.nextMilestone;
  }

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get('/plan/today', { params: { date: localToday() } });
      plan.value = data.plan;
      await fetchProgress();
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
    }
  }

  async function addTask(title) {
    const { data } = await api.post('/plan/today/tasks', { date: localToday(), title });
    plan.value.tasks.push(data.task);
    return data.task;
  }

  async function toggle(task) {
    const { data } = await api.patch(`/plan/tasks/${task.id}`, { done: !task.done });
    replaceTask(data.task);
  }

  async function editTask(id, title) {
    const { data } = await api.patch(`/plan/tasks/${id}`, { title });
    replaceTask(data.task);
  }

  async function removeTask(id) {
    await api.delete(`/plan/tasks/${id}`);
    plan.value.tasks = plan.value.tasks.filter((t) => t.id !== id);
  }

  return {
    plan,
    tasks,
    points,
    ladder,
    nextMilestone,
    loading,
    error,
    doneCount,
    allDone,
    load,
    addTask,
    toggle,
    editTask,
    removeTask,
  };
});
