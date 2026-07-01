import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

// Stub the API client so the plan store's calls can be driven per-test.
const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();
vi.mock('../api/client.js', () => ({
  default: {
    get: (...a) => get(...a),
    post: (...a) => post(...a),
    patch: (...a) => patch(...a),
    delete: (...a) => del(...a),
  },
}));

import PlanView from './PlanView.vue';

const plan = { id: 'p1', tasks: [{ id: 't1', title: 'Email Jo', done: false }] };
const progress = {
  points: 1,
  ladder: [
    { threshold: 1, earned: true },
    { threshold: 5, earned: false },
  ],
  nextMilestone: 5,
};

describe('PlanView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    get.mockReset();
    post.mockReset();
    patch.mockReset();
    del.mockReset();
    get.mockImplementation((url) => {
      if (url === '/plan/today') return Promise.resolve({ data: { plan: structuredClone(plan) } });
      if (url === '/plan/progress') return Promise.resolve({ data: progress });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
  });

  it('renders the loaded checklist, point count, and badge ladder', async () => {
    const wrapper = mount(PlanView);
    await flushPromises();

    expect(wrapper.find('.task-title').text()).toBe('Email Jo');
    expect(wrapper.find('.points-num').text()).toBe('1');
    expect(wrapper.find('.count').text()).toContain('0/1');

    const badges = wrapper.findAll('.badge');
    expect(badges).toHaveLength(2);
    expect(badges[0].classes()).toContain('earned');
    expect(badges[1].classes()).not.toContain('earned');
  });

  it('toggles a task via the API and strikes it through', async () => {
    patch.mockResolvedValue({ data: { task: { id: 't1', title: 'Email Jo', done: true } } });
    const wrapper = mount(PlanView);
    await flushPromises();

    await wrapper.find('.task input[type="checkbox"]').trigger('change');
    await flushPromises();

    expect(patch).toHaveBeenCalledWith('/plan/tasks/t1', { done: true });
    expect(wrapper.find('.task').classes()).toContain('done');
  });

  it('adds a task, sending the local date and title', async () => {
    post.mockResolvedValue({ data: { task: { id: 't2', title: 'Call Sam', done: false } } });
    const wrapper = mount(PlanView);
    await flushPromises();

    await wrapper.find('.add-row input').setValue('Call Sam');
    await wrapper.find('.add-row .btn-primary').trigger('click');
    await flushPromises();

    expect(post).toHaveBeenCalledWith('/plan/today/tasks', {
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      title: 'Call Sam',
    });
    expect(wrapper.findAll('.task')).toHaveLength(2);
  });
});

// Let pending promise microtasks resolve.
function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
