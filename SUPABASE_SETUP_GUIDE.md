# 🔧 Supabase Connection Troubleshooting

## Quick Diagnosis Steps

### Step 1: Check Console for Errors
1. Open browser: `http://localhost:8000/`
2. Press `F12` to open Developer Console
3. Look for errors starting with ❌

### Step 2: Check Connection Status
In console, you should see:
```
✅ Supabase client initialized successfully!
✅ Database connection successful!
✅ Users table is accessible
```

If you see ❌ errors instead, continue below.

---

## Common Issues & Fixes

### Issue 1: Table "users" Not Found

**Error Message:**
```
❌ Database connection test failed: relation "public.users" does not exist
```

**Fix:**
1. Go to Supabase Dashboard
2. Click **SQL Editor**
3. Paste this SQL to create users table:

```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'driver', 'admin')),
    license_number TEXT,
    created_at TIMESTAMP DEFAULT now()
);
```

4. Click **Run**
5. Refresh browser

### Issue 2: Table "bookings" Not Found

**Error Message:**
```
❌ Table "bookings" not found
```

**Fix:**
1. Go to Supabase **SQL Editor**
2. Paste this SQL:

```sql
CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    ticket_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    pickup TEXT NOT NULL,
    drop_location TEXT NOT NULL,
    bus_number TEXT NOT NULL,
    journey_date TEXT,
    seats TEXT[],
    fare INTEGER,
    age INTEGER,
    gender TEXT,
    created_at TIMESTAMP DEFAULT now()
);
```

3. Click **Run**
4. Refresh browser

### Issue 3: Permission Denied / Row Level Security

**Error Message:**
```
❌ Permission denied or Row Level Security policy
```

**Fix:**
1. Go to Supabase Dashboard
2. Click **Authentication** → **Policies**
3. For `users` table, make sure these policies exist:
   - `ENABLE INSERT` - Allow anyone to insert
   - `ENABLE SELECT` - Allow SELECT

4. For `bookings` table, allow INSERT and SELECT

---

## How to Get Your Supabase Credentials

### Your Project URL:
1. Go to Supabase Dashboard
2. Click **Settings** → **API**
3. Copy `Project URL`
   - Format: `https://your-project-id.supabase.co`

### Your Public/Anon Key (NOT Service Role Key):
1. Go to Supabase Dashboard
2. Click **Settings** → **API**
3. Under **Project API keys**, copy the **"anon public"** key
   - Starts with `sb_anon_...`
   - NOT the service role key

### Update in Code:
Edit `/rr/config.js`:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'sb_anon_...your-key-here...';
```

---

## Verify Everything Works

### Test Registration:
1. Refresh browser
2. Click **📝 Register**
3. Fill form and submit
4. Open Console (F12)
5. Look for: `✅ User successfully saved to database!`

If you see error, scroll up in console to find the ❌ message.

### Test Booking:
1. Search for buses
2. Select seat
3. Fill passenger details
4. Click **Buy Ticket**
5. Fill payment form
6. Look for: `✅ Booking saved successfully!`

---

## Manual Database Test

In browser console, paste this to test connection:

```javascript
// Test if Supabase is connected
console.log('Supabase client:', window.supabaseClient ? '✅' : '❌');

// Try to fetch users
const { data: users, error: userErr } = await window.supabaseClient.from('users').select('*').limit(1);
console.log('Users table test:', userErr ? '❌ ' + userErr.message : '✅ Found ' + users.length + ' users');

// Try to fetch bookings  
const { data: bookings, error: bookErr } = await window.supabaseClient.from('bookings').select('*').limit(1);
console.log('Bookings table test:', bookErr ? '❌ ' + bookErr.message : '✅ Found ' + bookings.length + ' bookings');
```

---

## If Still Not Working

Provide this information:

1. **Screenshot of Console Errors** (F12 → Console tab)
2. **Your Supabase Project URL**
3. **Confirm tables exist in Supabase**
4. **Are you using Public/Anon key?** (NOT service role key)

Then I can help fix it.

---

## Summary

✅ Make sure:
1. Supabase tables exist (users, bookings)
2. Using **Public/Anon key** in config.js (NOT service role key)
3. Supabase project URL is correct
4. Row Level Security allows INSERT on both tables

❌ Don't:
1. Put Service Role Key in client-side code
2. Use wrong API key
3. Skip table creation in SQL
4. Mix up the keys
