import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./config";

export const createClient = () => createBrowserClient(supabaseUrl, supabaseKey);
