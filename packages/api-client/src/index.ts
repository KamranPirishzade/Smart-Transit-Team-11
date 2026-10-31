import createClient from 'openapi-fetch';
import type { components, paths } from './schema';

export type { components, paths };
export type Schemas = components['schemas'];

/** Typed REST client. `getToken` is read on every request (operator JWT). */
export function createApiClient(baseUrl: string, getToken?: () => string | null) {
  const client = createClient<paths>({ baseUrl });
  client.use({
    onRequest({ request }) {
      const token = getToken?.();
      if (token) request.headers.set('authorization', `Bearer ${token}`);
      return request;
    },
  });
  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;
