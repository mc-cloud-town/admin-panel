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
import z from 'zod';
import type { $ZodConfig } from 'zod/v4/core';

const { locale } = useI18n();
const localeModules = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  zh_TW: () => import('#shared/contracts/locales/zh_TW.ts'),
};

const loadLocale = async (lang?: string) => {
  lang = lang?.replace('-', '_');
  let importer = localeModules[lang as keyof typeof localeModules];
  if (!importer) {
    importer = localeModules.zh_TW;
  }
  const { default: config } = (await importer()) as { default: $ZodConfig };
  z.config(config);
};

watchImmediate(locale, loadLocale);
</script>
