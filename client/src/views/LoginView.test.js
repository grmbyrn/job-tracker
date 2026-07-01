import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

// Stub the router so the component can call useRouter/useRoute without a real one.
const replace = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace }),
  useRoute: () => ({ query: {} }),
  RouterLink: { template: '<a><slot /></a>' },
}));

// Stub the API client so the auth store's login can be driven per-test.
const post = vi.fn();
vi.mock('../api/client.js', () => ({
  default: { post: (...a) => post(...a) },
  setAccessToken: vi.fn(),
  registerAuthHandlers: vi.fn(),
}));

import LoginView from './LoginView.vue';

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    replace.mockReset();
    post.mockReset();
  });

  it('logs in and redirects to outreach on success', async () => {
    post.mockResolvedValue({ data: { accessToken: 't', user: { id: '1', email: 'a@b.dev' } } });
    const wrapper = mount(LoginView);

    await wrapper.find('#login-email').setValue('a@b.dev');
    await wrapper.find('#login-password').setValue('password123');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.dev', password: 'password123' });
    expect(replace).toHaveBeenCalledWith({ name: 'outreach' });
  });

  it('shows the server error message when login fails', async () => {
    post.mockRejectedValue({ response: { data: { error: 'Invalid email or password.' } } });
    const wrapper = mount(LoginView);

    await wrapper.find('#login-email').setValue('a@b.dev');
    await wrapper.find('#login-password').setValue('wrongpass');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.find('.error').text()).toBe('Invalid email or password.');
    expect(replace).not.toHaveBeenCalled();
  });
});

// Small local helper: let pending promise microtasks resolve.
function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
