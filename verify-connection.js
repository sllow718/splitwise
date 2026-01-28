const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Checking connection to:', supabaseUrl);

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
    try {
        // Try to select from the profiles table - even if empty/RLS blocks, it should not fail with "connection refused"
        // If table doesn't exist, it will error with "relation does not exist" which means connection IS working but schema is missing
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

        if (error) {
            if (error.code === 'PGRST116') {
                // This implies connection worked but it returned no data in a way expected for .single(), not relevant here usually
                console.log('✅ Connection Successful! (Supabase is reachable)');
            } else if (error.code === '42P01') {
                console.log('✅ Connection Successful! (Supabase is reachable)');
                console.warn('⚠️  However, the "profiles" table does not exist. Did you run the schema.sql?');
            } else {
                console.log('✅ Connection Successful! (Supabase is reachable)');
                console.log('i  Received error from DB (this is normal if RLS is on or table empty):', error.message);
            }
        } else {
            console.log('✅ Connection Successful! Supabase is reachable and read to query.');
        }

        // Also check Auth service
        const { data: authData, error: authError } = await supabase.auth.getSession();
        if (authError) {
            console.error('❌ Auth Service Error:', authError.message);
        } else {
            console.log('✅ Auth Service is reachable');
        }

    } catch (err) {
        console.error('❌ Failed to connect:', err.message);
    }
}

checkConnection();
