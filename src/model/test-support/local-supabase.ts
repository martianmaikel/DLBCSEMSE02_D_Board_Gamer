/// <reference types="node" />

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../database.types';

export function createLocalSupabaseMock() {
  const url = process.env.SUPABASE_TEST_URL;
  const key = process.env.SUPABASE_TEST_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing local integration test configuration');
  }

  const target = new URL(url);
  const localHosts = ['127.0.0.1', 'localhost', '[::1]'];

  if (target.protocol !== 'http:' || !localHosts.includes(target.hostname)) {
    throw new Error('Integration tests require a local HTTP Supabase URL');
  }

  return {
    supabase: createClient<Database>(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }),
  };
}
