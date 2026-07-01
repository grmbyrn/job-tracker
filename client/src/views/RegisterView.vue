<script setup>
import { ref, computed } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import AuthAside from '../components/AuthAside.vue';

const auth = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const error = ref('');
const busy = ref(false);

// A light strength hint (0–3). Meaningful once the 8-char minimum is met.
const strength = computed(() => {
  const p = password.value;
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p) && (/\d/.test(p) || /[^\w]/.test(p))) score++;
  return Math.min(3, score);
});
const strengthNote = computed(
  () =>
    ['', 'A little short — 8 characters minimum.', 'Good — that works.', "Great! You're all set."][
      strength.value
    ],
);

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
  <div class="auth-split">
    <div class="auth-col">
      <div class="auth-form">
        <div class="auth-brand"><span class="brand-logo">✓</span> Job Tracker</div>

        <span class="eyebrow">✳︎ Let's get you started</span>
        <h1 class="auth-title">Your kinder <em>job&nbsp;search</em> starts here.</h1>
        <p class="auth-lead">
          No overwhelm, no giant to-do lists — just small, warm steps forward. It's genuinely nice
          to meet you.
        </p>

        <form @submit.prevent="submit">
          <p v-if="error" class="error">{{ error }}</p>

          <div class="field">
            <label for="reg-email">Email</label>
            <input id="reg-email" v-model="email" type="email" autocomplete="email" required />
          </div>

          <div class="field">
            <label for="reg-password">Password</label>
            <div class="pw-wrap">
              <input
                id="reg-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="8"
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
            <div class="pw-meter" aria-hidden="true">
              <span class="pw-seg" :class="strength >= 1 && `on-${strength}`" />
              <span class="pw-seg" :class="strength >= 2 && `on-${strength}`" />
              <span class="pw-seg" :class="strength >= 3 && `on-${strength}`" />
            </div>
            <p v-if="password" class="pw-note">{{ strengthNote }}</p>
          </div>

          <button class="btn btn-primary" type="submit" :disabled="busy" style="margin-top: 6px">
            {{ busy ? 'Creating…' : 'Create my account →' }}
          </button>

          <p class="auth-fine">
            By creating an account you agree to our Terms and Privacy Policy. We'll never spam you —
            promise.
          </p>
        </form>

        <p class="auth-foot">
          Already have an account?
          <RouterLink class="link" :to="{ name: 'login' }">Sign in</RouterLink>
        </p>
      </div>
    </div>

    <AuthAside
      title="Small wins today.<br /><em>Big momentum tomorrow.</em>"
      lead="A calm, doable daily plan — with streaks, milestones, and gentle nudges that make job-hunting feel a whole lot kinder."
    />
  </div>
</template>
