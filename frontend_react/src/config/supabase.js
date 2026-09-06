import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://virecfebgqsumovpumqe.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcmVjZmViZ3FzdW1vdnB1bXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MTQ0NzQsImV4cCI6MjEwNDI5MDQ3NH0.HAtvrnYmiMHTUnuN1alflizNAFQA5PNCjJypLlMsOEo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export default supabase;
