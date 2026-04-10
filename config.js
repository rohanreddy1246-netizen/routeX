// Supabase Configuration — New Project
const SUPABASE_URL = 'https://rdfdedgwhvngrdioyrjw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5PgxRjo0KvXzcyKiYmz-wg_MVBqV1EE';

// Initialize Supabase client
if (window.supabase) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase client initialized!');

    // Quick connection test
    (async () => {
        try {
            const { error } = await window.supabaseClient.from('users').select('count()').limit(1);
            if (error) {
                console.warn('⚠️ Supabase connection test:', error.message);
            } else {
                console.log('✅ Supabase connected successfully.');
            }
        } catch (err) {
            console.error('❌ Connection error:', err.message);
        }
    })();
} else {
    console.error('❌ Supabase SDK not found. Make sure CDN script is loaded before config.js.');
}
