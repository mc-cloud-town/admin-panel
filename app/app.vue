<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
// Valibot doesn't have built-in i18n/locale configuration like zod
// Custom error messages should be defined per-schema if needed
</script>
