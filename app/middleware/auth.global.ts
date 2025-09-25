export default defineNuxtRouteMiddleware(async (to) => {
  const auth = to.meta?.auth;
  if (auth === false) return;

  const { only = 'user', redirect } = auth || {};
  const localePath = useLocalePath();
  const { loggedIn, fetchSession } = useAuth();

  await fetchSession();

  if (only === 'guest') {
    if (loggedIn.value) {
      if (redirect?.guest && to.path !== redirect.guest) {
        return navigateTo(redirect.guest);
      }
      return navigateTo('/');
    }

    return;
  }

  if (!loggedIn.value) {
    if (redirect?.user && to.path !== redirect.user) {
      return navigateTo(redirect.user);
    }
    return navigateTo(localePath('/login'));
  }
});

type AuthTypes = 'guest' | 'user';

type MiddlewareOptions =
  | false
  | { only?: AuthTypes; redirect?: Record<AuthTypes, string> };

declare module '#app' {
  interface PageMeta {
    auth?: MiddlewareOptions;
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    auth?: MiddlewareOptions;
  }
}
