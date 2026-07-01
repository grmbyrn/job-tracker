<script setup>
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.';
    return;
  }
  busy.value = true;
  try {
    await auth.register(email.value.trim(), password.value);
    router.replace({ name: 'outreach' });
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not create your account.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="auth-wrap">
    <h1>Create account</h1>
    <p class="sub">Start tracking your outreach and applications.</p>
    <form class="card" @submit.prevent="submit">
      <p v-if="error" class="error">{{ error }}</p>
      <div class="field">
        <label for="reg-email">Email</label>
        <input id="reg-email" v-model="email" type="email" autocomplete="email" required />
      </div>
      <div class="field">
        <label for="reg-password">Password</label>
        <input
          id="reg-password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          minlength="8"
          required
        />
      </div>
      <button class="btn btn-primary" type="submit" :disabled="busy">
        {{ busy ? 'Creating…' : 'Create account' }}
      </button>
      <p class="hint">
        Already have an account?
        <RouterLink class="link" :to="{ name: 'login' }">Log in</RouterLink>
      </p>
    </form>
  </div>
</template>
