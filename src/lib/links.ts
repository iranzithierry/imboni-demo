import type { Href } from 'expo-router';

import type { RouteRef } from '@/data/schema';

export function toHref(ref: RouteRef): Href {
  switch (ref.kind) {
    case 'home':
      return '/home';
    case 'tracking':
      return '/tracking';
    case 'calendar':
      return '/calendar';
    case 'rates':
      return '/rates';
    case 'traffic':
      return '/traffic';
    case 'reports':
      return '/reports';
    case 'action':
      return { pathname: '/action/[id]', params: { id: ref.id } };
    case 'what_changed':
      return { pathname: '/what-changed/[id]', params: { id: ref.id } };
    case 'storyline':
      return { pathname: '/storyline/[id]', params: { id: ref.id } };
    case 'regulation':
      return { pathname: '/regulation/[id]', params: { id: ref.id } };
    case 'original':
      return { pathname: '/original/[id]', params: { id: ref.id } };
    case 'institution':
      return { pathname: '/institution/[id]', params: { id: ref.id } };
    case 'directory':
      return { pathname: '/directory/[id]', params: { id: ref.id } };
    case 'advisory':
      return { pathname: '/advisory/[id]', params: { id: ref.id } };
    case 'notice':
      return { pathname: '/notice/[id]', params: { id: ref.id } };
    case 'alert':
      return { pathname: '/alert/[id]', params: { id: ref.id } };
    default: {
      const exhaustive: never = ref;
      return exhaustive;
    }
  }
}

/** Path used in shared links and notification payloads (scheme-less). */
export function toPath(ref: RouteRef): string {
  const href = toHref(ref);
  if (typeof href === 'string') return href;
  const params = href.params ?? {};
  return href.pathname.replace(/\[(\w+)\]/g, (_, key: string) => {
    const value = (params as Record<string, unknown>)[key];
    return typeof value === 'string' ? encodeURIComponent(value) : '';
  });
}
