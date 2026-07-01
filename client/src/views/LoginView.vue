<script setup>
import { ref } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import AuthAside from '../components/AuthAside.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const remember = ref(true);
const showPassword = ref(false);
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    await auth.login(email.value.trim(), password.value);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null;
    router.replace(redirect || { name: 'outreach' });
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not log in. Please try again.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="auth-split">
    <div class="auth-col">
      <div class="auth-form">
        <div class="auth-brand">
          <span class="brand-logo">✓</span> Job Tracker
        </div>

        <span class="eyebrow">✳︎ Welcome back</span>
        <h1 class="auth-title">Let's find your <em>next&nbsp;yes.</em></h1>
        <p class="auth-lead">
          Good to see you again. Your streak is waiting — no pressure, one small step at a time.
        </p>

        <form @submit.prevent="submit">
          <p v-if="error" class="error">{{ error }}</p>

          <div class="field">
            <label for="login-email">Email</label>
            <input id="login-email" v-model="email" type="email" autocomplete="email" required />
          </div>

          <div class="field">
            <div class="auth-actions-row">
              <label for="login-password" style="margin: 0">Password</label>
              <span class="link" style="font-size: 13px">Forgot password?</span>
            </div>
            <div class="pw-wrap">
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                class="pw-toggle"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? '🙈' : '👁' }}
              </button>
            </div>
          </div>

          <label class="check" style="margin-bottom: 18px">
            <input v-model="remember" type="checkbox" />
            Keep me signed in on this device
          </label>

          <button class="btn btn-primary" type="submit" :disabled="busy">
            {{ busy ? 'Signing in…' : 'Sign in →' }}
          </button>

          <p class="auth-fine">By continuing you agree to our friendly Terms &amp; Privacy.</p>
        </form>

        <p class="auth-foot">
          New around here?
          <RouterLink class="link" :to="{ name: 'register' }">Create an account</RouterLink>
        </p>
      </div>
    </div>

    <AuthAside
      eyebrow="Welcome back"
      title="Small wins today.<br /><em>Big momentum tomorrow.</em>"
      lead="A calm, doable daily plan — with streaks, milestones, and gentle nudges that make job-hunting feel a whole lot kinder."
    />
  </div>
</template>
