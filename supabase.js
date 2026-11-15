import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ipwgnolkusxnsxokpqhz.supabase.co";
const supabaseKey = "sb_publishable_R54ucqvu6tB6ofEm0Exg2A_QsGjJIev";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);