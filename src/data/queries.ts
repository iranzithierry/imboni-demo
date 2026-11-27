import { queryOptions } from '@tanstack/react-query';

import type { ImboniApi } from './api';

/** One request per Home module, each with its own key so they load, fail and retry independently. */
export const q = {
  safetyAlerts: (api: ImboniApi) => queryOptions({ queryKey: ['safety-alerts'], queryFn: ({ signal }) => api.safetyAlerts(signal) }),
  feed: (api: ImboniApi) => queryOptions({ queryKey: ['feed'], queryFn: ({ signal }) => api.feed(signal) }),
  rates: (api: ImboniApi) => queryOptions({ queryKey: ['rates'], queryFn: ({ signal }) => api.rates(signal) }),
  roads: (api: ImboniApi) => queryOptions({ queryKey: ['roads'], queryFn: ({ signal }) => api.roads(signal) }),
  calendar: (api: ImboniApi) => queryOptions({ queryKey: ['calendar'], queryFn: ({ signal }) => api.calendar(signal) }),
  actions: (api: ImboniApi) => queryOptions({ queryKey: ['actions'], queryFn: ({ signal }) => api.actions(signal), staleTime: 10 * 60_000 }),
  institutions: (api: ImboniApi) => queryOptions({ queryKey: ['institutions'], queryFn: ({ signal }) => api.institutions(signal), staleTime: 60 * 60_000 }),
  institutionDetail: (api: ImboniApi, id: string) => queryOptions({ queryKey: ['institution', id], queryFn: ({ signal }) => api.institutionDetail(id, signal) }),
  storylines: (api: ImboniApi) => queryOptions({ queryKey: ['storylines'], queryFn: ({ signal }) => api.storylines(signal) }),
  notices: (api: ImboniApi) => queryOptions({ queryKey: ['notices'], queryFn: ({ signal }) => api.notices(signal) }),
  regulations: (api: ImboniApi) => queryOptions({ queryKey: ['regulations'], queryFn: ({ signal }) => api.regulations(signal), staleTime: 60 * 60_000 }),
  regulation: (api: ImboniApi, id: string) => queryOptions({ queryKey: ['regulation', id], queryFn: ({ signal }) => api.regulation(id, signal) }),
  directory: (api: ImboniApi, id: string) => queryOptions({ queryKey: ['directory', id], queryFn: ({ signal }) => api.directory(id, signal) }),
  original: (api: ImboniApi, id: string) => queryOptions({ queryKey: ['original', id], queryFn: ({ signal }) => api.original(id, signal) }),
  inbox: (api: ImboniApi) => queryOptions({ queryKey: ['inbox'], queryFn: ({ signal }) => api.inbox(signal) }),
  searchIndex: (api: ImboniApi) => queryOptions({ queryKey: ['search-index'], queryFn: ({ signal }) => api.searchIndex(signal), staleTime: 60 * 60_000 }),
};

export const HOME_KEYS = [['safety-alerts'], ['feed'], ['rates'], ['roads'], ['calendar'], ['actions']] as const;
