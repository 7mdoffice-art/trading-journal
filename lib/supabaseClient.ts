import { createClient } from "@supabase/supabase-js";

// 🔥 fallback + env support
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://uzxbrwfanjtaqejpixki.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_KEY ||
  "sb_publishable_fV36b7rAiM6H2eeAliKMGw_Ynyctc00";

// ❌ REMOVE hard crash (this was your problem)
// we don't throw error anymore

export const supabase = createClient(supabaseUrl, supabaseKey);