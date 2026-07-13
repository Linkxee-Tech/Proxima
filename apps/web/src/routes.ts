import { API_ROUTES, NAVIGATION } from '../../../packages/contracts/src/index.ts';

export const webRoutes = NAVIGATION.map((item) => ({ ...item, api: item.route === '/' ? API_ROUTES.plan : `/api${item.route}` }));

export function renderRoute(path: string): string {
  const match = webRoutes.find((route) => route.route === path);
  if (!match) return '<main><h1>404</h1><p>Page not found.</p></main>';
  return `<main><nav>${webRoutes.map((route) => `<a href="${route.route}">${route.label}</a>`).join('')}</nav><h1>${match.label}</h1><p>Connected to ${match.api}</p></main>`;
}
