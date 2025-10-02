import type {
  ClientOptions,
  InferSessionFromClient,
  InferUserFromClient,
} from 'better-auth';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/vue';
import type { RouteLocationRaw } from 'vue-router';

import type { auth } from '@@/server/utils/auth';

export const useAuth = () => {
  const url = useRequestURL();
  const headers = import.meta.server ? useRequestHeaders() : undefined;
  const session = useState<InferSessionFromClient<ClientOptions> | null>(
    'auth:session',
    () => null
  );
  const user = useState<InferUserFromClient<ClientOptions> | null>(
    'auth:user',
    () => null
  );
  const sessionFetching = import.meta.server
    ? ref(false)
    : useState('auth:sessionFetching', () => false);

  const authClient = createAuthClient({
    baseURL: url.origin,
    fetchOptions: { headers },
    plugins: [inferAdditionalFields<typeof auth>()],
  });

  const fetchSession = async () => {
    if (sessionFetching.value) {
      console.log('already fetching session');
      return;
    }
    sessionFetching.value = true;

    const { data } = await authClient.getSession();

    user.value = data?.user || null;
    session.value = data?.session || null;
    sessionFetching.value = false;
    return data;
  };

  if (import.meta.client) {
    authClient.$store.listen('$sessionSignal', async (signal) => {
      if (!signal) return;
      await fetchSession();
    });
  }

  return {
    user,
    session,
    authClient,
    fetchSession,
    sessionFetching,
    loggedIn: computed(() => !!session.value),
    signIn: authClient.signIn,
    async signOut({ redirectTo }: { redirectTo?: RouteLocationRaw } = {}) {
      const result = await authClient.signOut();

      user.value = null;
      session.value = null;

      if (redirectTo) {
        await navigateTo(redirectTo);
      }

      return result;
    },
    errorCodes: authClient.$ERROR_CODES,
  };
};
