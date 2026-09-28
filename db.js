(function(){
  const configured = window.SUPABASE_URL && !window.SUPABASE_URL.includes('PASTE_') && window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.includes('PASTE_');
  window.db = { configured, client: null };
  if (configured && window.supabase) window.db.client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
})();
