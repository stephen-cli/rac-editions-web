import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';
import { useSession, type StepId } from './stores/session';

/** Each wizard step is a route; the step components load as the player reaches them. */
const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/edition' },
  { path: '/edition', name: 'edition', component: () => import('./steps/EditionStep.vue') },
  { path: '/discs', name: 'discs', component: () => import('./steps/DiscsStep.vue') },
  { path: '/output', name: 'output', component: () => import('./steps/OutputStep.vue') },
  { path: '/review', name: 'review', component: () => import('./steps/ReviewStep.vue') },
  { path: '/build', name: 'build', component: () => import('./steps/BuildStep.vue') },
  { path: '/done', name: 'done', component: () => import('./steps/DoneStep.vue') },
];

export function createBuilderRouter() {
  // Hash history: the desktop shell serves the app from files, where paths other than / don't exist.
  const router = createRouter({ history: createWebHashHistory(), routes });

  // A step the session doesn't open yet (see canOpen) leads to the one the player should be on instead.
  router.beforeEach((to) => {
    const session = useSession();
    if (session.canOpen(to.name as StepId)) return true;
    return { name: session.build.state === 'running' ? 'build' : session.lastOpen };
  });

  return router;
}
