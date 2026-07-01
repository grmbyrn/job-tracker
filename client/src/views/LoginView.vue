<script setup>
import { ref } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
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
  <div class="auth-wrap">
    <h1>Log in</h1>
    <p class="sub">Welcome back to your outreach tracker.</p>
    <form class="card" @submit.prevent="submit">
      <p v-if="error" class="error">{{ error }}</p>
      <div class="field">
        <label for="login-email">Email</label>
        <input id="login-email" v-model="email" type="email" autocomplete="email" required />
      </div>
      <div class="field">
        <label for="login-password">Password</label>
        <input
          id="login-password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>
      <button class="btn btn-primary" type="submit" :disabled="busy">
        {{ busy ? 'Logging in…' : 'Log in' }}
      </button>
      <p class="hint">
        No account? <RouterLink class="link" :to="{ name: 'register' }">Register</RouterLink>
      </p>
    </form>
  </div>
</template>
