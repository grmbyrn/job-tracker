<script setup>
// The decorative right-hand panel shared by the login and register screens.
// Purely presentational — it shows a taste of the app's "small wins" rewards.
defineProps({
  eyebrow: { type: String, default: 'Made for ADHD job-seekers' },
  title: { type: String, default: '' },
  lead: { type: String, default: '' },
});
</script>

<template>
  <aside class="auth-aside" aria-hidden="true">
    <span class="aside-eyebrow">✳︎ {{ eyebrow }}</span>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <h2 class="aside-title" v-html="title" />
    <p class="aside-lead">{{ lead }}</p>

    <div class="aside-cards">
      <div class="fcard">
        <div class="fcard-row">
          <div class="fcard-ic">🔥</div>
          <div>
            <div class="fcard-k">Current streak</div>
            <div class="fcard-v">5 days</div>
          </div>
        </div>
      </div>

      <div class="fcard">
        <div class="fcard-head">
          <span>Today's plan</span>
          <span class="n">2 of 3</span>
        </div>
        <div class="fcard-task is-done"><span class="tick">✓</span> Apply to 1 role</div>
        <div class="fcard-task is-done"><span class="tick">✓</span> Follow up with Maya</div>
        <div class="fcard-task"><span>○</span> Update résumé bullet</div>
      </div>

      <div class="fcard">
        <div class="fcard-head"><span>Weekly goal</span></div>
        <div class="fcard-row" style="justify-content: space-between">
          <strong>Points</strong>
          <span>340 / 500</span>
        </div>
        <div class="fcard-bar"><i style="width: 68%"></i></div>
      </div>
    </div>
  </aside>
</template>
