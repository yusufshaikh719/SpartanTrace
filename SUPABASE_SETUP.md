# Connecting SpartanTrace to Supabase Free Tier

Follow these 4 simple steps to connect SpartanTrace directly to your live Supabase database.

---

### Step 1: Create a Supabase Project (1 minute)
1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **"New Project"**.
3. Choose a name (e.g. `SpartanTrace`), set a database password, and select a region close to you (e.g., `US West - Northern California`).
4. Select the **Free Plan** and click **"Create new project"**.

---

### Step 2: Run the Database Schema (30 seconds)
1. In your new Supabase dashboard, click the **SQL Editor** tab on the left sidebar (icon looks like `>_`).
2. Click **"New query"**.
3. Open the file [`supabase/schema.sql`](./supabase/schema.sql) in this repository, copy its entire contents, and paste them into the SQL editor query box.
4. Click **"Run"** (green button at bottom right).
   *You will see: `Success. No rows returned`.* All tables (`profiles`, `listings`, `claims`, `conversations`, `messages`, `lost_item_alerts`, `notifications`, `reports`, `admin_audit_logs`) and indexes are now created!

---

### Step 3: Get Your API Credentials
1. In the Supabase sidebar, click the gear icon (**Project Settings**).
2. Select **"API"** under Project Settings.
3. Find:
   - **Project URL** (e.g. `https://abcdefghijklm.supabase.co`)
   - **Project API Keys ➔ `anon` `public`** key (starts with `eyJ...`)

---

### Step 4: Configure SpartanTrace
Open the file [`.env`](./.env) in the project root and paste your values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Save the file and run:
```bash
npm run dev
```

*Tip: You can also enter or update these credentials at any time directly in the app by clicking your user profile avatar in the top right and selecting **"Database Connection"**.*
