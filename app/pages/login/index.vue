<template>
  <div
    class="max-w-md mx-auto p-6 bg-gray-900 rounded-lg shadow-md text-center"
  >
    <h2 class="text-2xl font-bold">{{ t('login.login') }}</h2>
    <p class="text-xl text-gray-500">{{ t('login.loginSubtitle') }}</p>

    <NuxtImg
      src="/images/logo.png"
      alt="Login Illustration"
      class="w-full h-48 object-contain my-4"
    />

    <div class="space-y-4">
      <div class="flex gap-3 justify-center">
        <UButton
          v-for="(provider, key) in authProviders"
          :key="key"
          color="neutral"
          variant="outline"
          class="gap-2.5 px-5 py-3 cursor-pointer"
          :icon="provider.icon"
          :disabled="loading"
          :loading="loadingAction === key"
          @click="onSocialLogin(key)"
        >
          {{ provider.name }}
        </UButton>
      </div>
    </div>
    {{ auth }}
  </div>
</template>

<script lang="ts" setup>
definePageMeta({ auth: { only: 'guest' }, layout: 'content-none' });

const auth = useAuth();
const { t } = useI18n();
const route = useRoute();
// const toast = useToast();
const { signIn } = useAuth();

const redirectTo = computed(() => {
  const value = route.query.redirect;

  return (Array.isArray(value) ? value[0] : value) || '/';
});

const loading = ref(false);
const loadingAction = ref<AuthProvider | 'submit' | null>(null);

type AuthProvider = 'google' | 'discord';

const authProviders: {
  [key in AuthProvider]: { icon: string; name: string };
} = {
  google: { icon: 'i-simple-icons-google', name: 'Google' },
  discord: { icon: 'i-simple-icons-discord', name: 'Discord' },
} as const;

const onSocialLogin = async (action: AuthProvider) => {
  loadingAction.value = action;
  signIn.social({ provider: action, callbackURL: redirectTo.value });
};
</script>

<i18n lang="json">
{
  "zh-TW": {
    "login": {
      "login": "登入",
      "loginSubtitle": "請使用以下方式登入",
      "loginSuccess": "登入成功！",
      "loginError": "登入時發生錯誤，請稍後再試\n{errorMsg}"
    }
  }
}
</i18n>
