<template>
  <div class="min-h-screen">
    <aside
      :class="[
        'fixed top-0 left-0 h-full flex flex-col bg-gray-800 text-white py-6 transition-all duration-300',
        'px-2 [&>*:not(.skip)]:mb-4',
        isCollapsed ? 'w-16' : 'w-64',
      ]"
    >
      <NuxtLink to="/" class="text-3xl font-bold truncate mx-auto">
        {{ isCollapsed ? '雲' : '雲鎮管理面板' }}
      </NuxtLink>

      <div class="relative skip" :class="{ hidden: isCollapsed }">
        <div class="absolute w-full px-2 pointer-events-none z-1">
          <div class="bg-gradient-to-b h-10 from-gray-800 to-transparent"></div>
        </div>
      </div>

      <UNavigationMenu
        popover
        tooltip
        orientation="vertical"
        class="w-full flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pl-2 pr-1 rounded-lg [&>ul]:py-5"
        :items="links"
        :collapsed="isCollapsed"
        :ui="{
          item: 'py-2',
          childList: 'border-gray-400',
          childItem: 'my-0.5 [&>a[data-active]]:bg-gray-700 [&>a]:rounded-md',
        }"
      />

      <div :class="['relative skip', isCollapsed ? 'mx-auto' : 'mx-4']">
        <div
          class="absolute pointer-events-none w-full -top-10 bg-gradient-to-t h-10 from-gray-800 to-transparent"
        ></div>
        <UTooltip
          :ui="{ content: 'w-48 flex flex-col h-auto p-2 gap-2' }"
          :delay-duration="100"
        >
          <template #content>
            <NuxtLink to="/profile" class="hover:underline">
              個人資料
            </NuxtLink>
            <NuxtLink to="/settings" class="hover:underline">
              帳號設定
            </NuxtLink>
            <NuxtLink to="/logout" class="text-red-500 hover:underline">
              登出
            </NuxtLink>
          </template>

          <div class="flex items-center gap-2 cursor-pointer">
            <UAvatar
              :src="user?.image || undefined"
              size="sm"
              class="border border-neutral-300 dark:border-neutral-700"
            />
            <span
              v-if="!isCollapsed"
              class="text-sm font-medium truncate max-w-[120px]"
            >
              {{ user?.name || '未登入' }}
            </span>
          </div>
        </UTooltip>
      </div>
    </aside>
    <div :class="[isCollapsed ? 'ml-16' : 'ml-64', 'p-6 min-h-screen']">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ArrayOrNested, NavigationMenuItem } from '@nuxt/ui';
import { useWindowSize, watchImmediate } from '@vueuse/core';

const { user } = useAuth();
const links = ref<ArrayOrNested<NavigationMenuItem>>([
  {
    label: '伺服器管理',
    icon: 'mdi-server',
    defaultOpen: true,
    children: [
      { label: '伺服器列表', to: '/servers' },
      { label: '代理伺服器', to: '/servers/proxy' },
      { label: '伺服器狀態', to: '/servers/status' },
    ],
  },
  {
    label: '身分組管理',
    icon: 'mdi-shield-account',
    defaultOpen: true,
    children: [
      { label: '身分組', to: '/roles' },
      { label: '權限管理', to: '/roles/permissions' },
    ],
  },
  {
    label: '成員管理',
    icon: 'mdi-account-group',
    defaultOpen: true,
    children: [
      { label: '成員列表', to: '/members' },
      { label: '審核列表', to: '/members/review' },
      { label: '參訪管理', to: '/members/visits' },
    ],
  },
  {
    label: '日誌管理',
    icon: 'mdi-file-document',
    children: [
      { label: '操作日誌', to: '/logs/operations' },
      { label: '登入日誌', to: '/logs/auth' },
      { label: '伺服器日誌', to: '/logs/servers' },
    ],
  },
  {
    label: '系統設定',
    icon: 'mdi-cog',
    children: [
      { label: '基本設定', to: '/settings/general' },
      { label: '郵件設定', to: '/settings/email' },
      { label: '第三方服務', to: '/settings/integrations' },
      { label: 'API 金鑰', to: '/settings/api-keys' },
    ],
  },
]);

const { width } = useWindowSize();
const isCollapsed = ref(true);

// fix ssr hydration issue and lazy script load issue
onMounted(() => {
  watchImmediate(width, (newWidth) => (isCollapsed.value = newWidth < 560));
});
</script>
