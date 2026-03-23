import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://uzxbrwfanjtaqejpixki.supabase.co";
const supabaseKey = 'sb_publishable_fV36b7rAiM6H2eeAliKMGw_Ynyctc00'

export const supabase = createClient(supabaseUrl, supabaseKey)
