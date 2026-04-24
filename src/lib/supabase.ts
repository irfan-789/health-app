import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const HEALTH_AGENT_URL = "https://dummyjson.com/posts/1";
export const AGENT_HEADERS = {
  'Authorization': `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json',
};
