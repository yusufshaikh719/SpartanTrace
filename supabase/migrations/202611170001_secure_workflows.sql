-- Applies to both the original SpartanTrace schema and new installations.
BEGIN;
-- Earlier deployments used UUID columns; the application API also supports
-- legacy text identifiers. Normalize only application tables, preserving values,
-- defaults and foreign-key definitions. Never cascade into unrelated tables.
SET LOCAL search_path = '';
DO $$
DECLARE
 app_tables text[] := ARRAY['profiles','listings','claims','conversations','messages','lost_item_alerts','notifications','reports','admin_audit_logs'];
 p record; col record; fk record; saved_fks jsonb;
BEGIN
 -- Policies can depend on UUID operators and must be replaced before conversion.
 FOR p IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename=ANY(app_tables) LOOP
  EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename);
 END LOOP;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY(app_tables) AND data_type='uuid') THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('table',t.relname,'name',c.conname,'definition',pg_get_constraintdef(c.oid))),'[]'::jsonb)
  INTO saved_fks FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace ns ON ns.oid=t.relnamespace
  WHERE c.contype='f' AND ns.nspname='public' AND t.relname=ANY(app_tables);
  FOR fk IN SELECT * FROM jsonb_to_recordset(saved_fks) AS x("table" text,name text,definition text) LOOP
   EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I',fk."table",fk.name);
  END LOOP;
  FOR col IN SELECT table_name,column_name,column_default FROM information_schema.columns
   WHERE table_schema='public' AND table_name=ANY(app_tables) AND data_type='uuid' LOOP
   EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT',col.table_name,col.column_name);
   EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE text USING %I::text',col.table_name,col.column_name,col.column_name);
   IF col.column_default IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT (%s)::text',col.table_name,col.column_name,col.column_default);
   END IF;
  END LOOP;
  FOR fk IN SELECT * FROM jsonb_to_recordset(saved_fks) AS x("table" text,name text,definition text) LOOP
   EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s',fk."table",fk.name,fk.definition);
  END LOOP;
 END IF;
END $$;
SET LOCAL search_path = public;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_content_type_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_content_type_check CHECK (content_type IN ('listing','message','user'));
ALTER TABLE public.lost_item_alerts ADD COLUMN IF NOT EXISTS date_lost date;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe ON public.notifications(dedupe_key);
-- Do not silently discard historical duplicates when upgrading an existing project.
CREATE UNIQUE INDEX IF NOT EXISTS claims_one_active ON public.claims(listing_id,claimant_id) WHERE status <> 'Rejected';
CREATE UNIQUE INDEX IF NOT EXISTS claims_one_accepted ON public.claims(listing_id) WHERE status = 'Accepted';
CREATE UNIQUE INDEX IF NOT EXISTS conversations_claim ON public.conversations(claim_id);
CREATE INDEX IF NOT EXISTS listings_finder ON public.listings(finder_id);
CREATE INDEX IF NOT EXISTS claims_claimant ON public.claims(claimant_id);
CREATE INDEX IF NOT EXISTS messages_conversation ON public.messages(conversation_id,created_at);
CREATE INDEX IF NOT EXISTS notifications_user ON public.notifications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS alerts_user ON public.lost_item_alerts(user_id);
CREATE INDEX IF NOT EXISTS listings_search ON public.listings USING gin(to_tsvector('english',title || ' ' || description));

CREATE TABLE IF NOT EXISTS private.login_attempts (
 user_id text PRIMARY KEY, failures integer NOT NULL DEFAULT 0,
 first_failure timestamptz, locked_until timestamptz
);
CREATE TABLE IF NOT EXISTS private.app_sessions (
 session_id text PRIMARY KEY, user_id text NOT NULL, last_activity timestamptz NOT NULL DEFAULT now()
);

-- Only confirmed SJSU identities create profiles. User metadata never grants roles.
CREATE OR REPLACE FUNCTION private.sync_auth_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.email IS NULL OR NEW.email !~* '^[^[:space:]@]+@sjsu[.]edu$' THEN
   RAISE EXCEPTION 'A valid @sjsu.edu email is required';
 END IF;
 IF NEW.email_confirmed_at IS NOT NULL THEN
   INSERT INTO public.profiles(id,email,name)
   VALUES (NEW.id::text,lower(NEW.email),coalesce(nullif(btrim(NEW.raw_user_meta_data->>'full_name'),''),split_part(NEW.email,'@',1)))
   ON CONFLICT (id) DO UPDATE SET email=excluded.email;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS spartantrace_auth_profile ON auth.users;
CREATE TRIGGER spartantrace_auth_profile AFTER INSERT OR UPDATE OF email_confirmed_at,email ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.sync_auth_profile();
INSERT INTO public.profiles(id,email,name)
SELECT id::text,lower(email),coalesce(nullif(btrim(raw_user_meta_data->>'full_name'),''),split_part(email,'@',1))
FROM auth.users WHERE email ~* '^[^[:space:]@]+@sjsu[.]edu$' AND email_confirmed_at IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- The public Auth API verifies passwords; only this server-side gateway can
-- grant an application session. Direct Auth tokens do not bypass app lockout.
ALTER TABLE private.login_attempts ADD COLUMN IF NOT EXISTS attempt_id text;
ALTER TABLE private.login_attempts ADD COLUMN IF NOT EXISTS attempt_until timestamptz;

CREATE OR REPLACE FUNCTION public.login_begin(email_address text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid text; a private.login_attempts; ticket text:=gen_random_uuid()::text;
BEGIN
 SELECT id::text INTO uid FROM auth.users WHERE lower(email)=lower(btrim(email_address)) AND email_confirmed_at IS NOT NULL;
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=uid AND NOT is_suspended) THEN
  RETURN jsonb_build_object('error','Invalid credentials, unverified email, or suspended account.');
 END IF;
 INSERT INTO private.login_attempts(user_id) VALUES(uid) ON CONFLICT DO NOTHING;
 SELECT * INTO a FROM private.login_attempts WHERE user_id=uid FOR UPDATE;
 IF a.locked_until>now() THEN RETURN jsonb_build_object('error','Account locked for 15 minutes after five failed attempts.'); END IF;
 IF a.locked_until IS NOT NULL OR a.first_failure<now()-interval '15 minutes' THEN
  a.failures:=0; a.first_failure:=NULL; a.locked_until:=NULL;
 END IF;
 IF a.attempt_until>now() THEN RETURN jsonb_build_object('error','A sign-in is in progress. Please wait a moment.'); END IF;
 -- Count abandoned attempts as failures when their lease expires.
 IF a.attempt_id IS NOT NULL THEN a.failures:=a.failures+1; a.first_failure:=coalesce(a.first_failure,now()); END IF;
 IF a.failures>=5 THEN
  UPDATE private.login_attempts SET failures=a.failures,first_failure=a.first_failure,locked_until=now()+interval '15 minutes',attempt_id=NULL,attempt_until=NULL WHERE user_id=uid;
  RETURN jsonb_build_object('error','Account locked for 15 minutes after five failed attempts.');
 END IF;
 UPDATE private.login_attempts SET failures=a.failures,first_failure=a.first_failure,locked_until=NULL,attempt_id=ticket,attempt_until=now()+interval '60 seconds' WHERE user_id=uid;
 RETURN jsonb_build_object('user_id',uid,'attempt_id',ticket);
END $$;
CREATE OR REPLACE FUNCTION public.login_finish(user_id text, attempt text, succeeded boolean, session_id text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a private.login_attempts;
BEGIN
 SELECT * INTO a FROM private.login_attempts x WHERE x.user_id=login_finish.user_id FOR UPDATE;
 IF a.attempt_id IS DISTINCT FROM attempt OR a.attempt_until<now() OR a.user_id IS NULL THEN RAISE EXCEPTION 'Sign-in attempt expired'; END IF;
 IF succeeded THEN
  IF NOT EXISTS(SELECT 1 FROM auth.sessions s JOIN public.profiles p ON p.id=s.user_id::text
   WHERE s.id::text=login_finish.session_id AND s.user_id::text=login_finish.user_id AND NOT p.is_suspended AND s.created_at>=a.attempt_until-interval '60 seconds') THEN RAISE EXCEPTION 'Invalid sign-in session'; END IF;
  INSERT INTO private.app_sessions(session_id,user_id) VALUES(login_finish.session_id,login_finish.user_id);
  UPDATE private.login_attempts x SET failures=0,first_failure=NULL,locked_until=NULL,attempt_id=NULL,attempt_until=NULL WHERE x.user_id=login_finish.user_id;
  RETURN '{}'::jsonb;
 END IF;
 UPDATE private.login_attempts x SET failures=a.failures+1,first_failure=coalesce(a.first_failure,now()),
 locked_until=CASE WHEN a.failures+1>=5 THEN now()+interval '15 minutes' ELSE NULL END,attempt_id=NULL,attempt_until=NULL
 WHERE x.user_id=login_finish.user_id;
 RETURN jsonb_build_object('error',CASE WHEN a.failures+1>=5 THEN 'Account locked for 15 minutes after five failed attempts.' ELSE 'Invalid login credentials.' END);
END $$;
REVOKE ALL ON FUNCTION public.login_begin(text),public.login_finish(text,text,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.login_begin(text),public.login_finish(text,text,boolean,text) TO service_role;

-- Infrastructure errors release their lease without counting as bad passwords.
CREATE OR REPLACE FUNCTION public.login_cancel(user_id text, attempt text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE private.login_attempts x SET attempt_id=NULL,attempt_until=NULL
 WHERE x.user_id=login_cancel.user_id AND x.attempt_id=attempt;
$$;
REVOKE ALL ON FUNCTION public.login_cancel(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.login_cancel(text,text) TO service_role;

CREATE OR REPLACE FUNCTION private.active_user() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id::text=p.id
 WHERE p.id=auth.uid()::text AND NOT p.is_suspended AND u.email_confirmed_at IS NOT NULL
 AND u.email ~* '^[^[:space:]@]+@sjsu[.]edu$'
 AND EXISTS (SELECT 1 FROM auth.sessions s JOIN private.app_sessions a ON a.session_id=s.id::text
 WHERE s.id::text=auth.jwt()->>'session_id' AND s.user_id=u.id
 AND a.last_activity>now()-interval '30 minutes'));
$$;
CREATE OR REPLACE FUNCTION private.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT private.active_user() AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid()::text AND is_admin);
$$;
CREATE OR REPLACE FUNCTION private.can_read_listing(target text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.listings l WHERE l.id=target AND
 (private.is_admin() OR (NOT l.is_removed AND (l.status<>'Returned' OR
 (private.active_user() AND (l.finder_id=auth.uid()::text OR EXISTS
 (SELECT 1 FROM public.claims c WHERE c.listing_id=l.id AND c.claimant_id=auth.uid()::text)))))));
$$;
CREATE OR REPLACE FUNCTION private.can_read_conversation(target text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT private.active_user() AND EXISTS(SELECT 1 FROM public.conversations c
 WHERE c.id=target AND (c.finder_id=auth.uid()::text OR c.claimant_id=auth.uid()::text OR private.is_admin()));
$$;

-- Replace every legacy permissive policy, including policies from earlier installs.
DO $$ DECLARE p record; t text; BEGIN
 FOR p IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN
 ('profiles','listings','claims','conversations','messages','lost_item_alerts','notifications','reports','admin_audit_logs') LOOP
  EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['profiles','listings','claims','conversations','messages','lost_item_alerts','notifications','reports','admin_audit_logs'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 END LOOP;
END $$;
GRANT USAGE ON SCHEMA private TO anon,authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA private FROM anon,authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.active_user(),private.is_admin(),private.can_read_listing(text),private.can_read_conversation(text) TO anon,authenticated;
REVOKE SELECT ON public.listings FROM authenticated;
GRANT SELECT(id,finder_id,finder_name,title,description,photo_url,category,location_found,date_found,status,return_date,is_removed,moderation_reason,created_at,updated_at) ON public.listings TO anon,authenticated;
CREATE POLICY listing_read ON public.listings FOR SELECT USING (private.can_read_listing(id));
CREATE POLICY profile_read ON public.profiles FOR SELECT TO authenticated USING
 (private.is_admin() OR (private.active_user() AND id=auth.uid()::text));
CREATE POLICY claim_read ON public.claims FOR SELECT TO authenticated USING
 (private.active_user() AND (claimant_id=auth.uid()::text OR EXISTS
 (SELECT 1 FROM public.listings l WHERE l.id=listing_id AND l.finder_id=auth.uid()::text) OR private.is_admin()));
CREATE POLICY conversation_read ON public.conversations FOR SELECT TO authenticated USING (private.can_read_conversation(id));
CREATE POLICY message_read ON public.messages FOR SELECT TO authenticated USING
 (private.can_read_conversation(conversation_id) AND (NOT is_removed OR private.is_admin()));
CREATE POLICY alert_read ON public.lost_item_alerts FOR SELECT TO authenticated USING (private.active_user() AND user_id=auth.uid()::text);
CREATE POLICY notification_read ON public.notifications FOR SELECT TO authenticated USING (private.active_user() AND user_id=auth.uid()::text);
CREATE POLICY report_read ON public.reports FOR SELECT TO authenticated USING (private.is_admin());
CREATE POLICY audit_read ON public.admin_audit_logs FOR SELECT TO authenticated USING (private.is_admin());

CREATE OR REPLACE FUNCTION private.notify(recipient text, kind text, heading text, body text, link_kind text, link text, dedupe text DEFAULT NULL) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
 INSERT INTO public.notifications(id,user_id,type,title,message,link_type,link_id,dedupe_key)
 VALUES(gen_random_uuid()::text,recipient,kind,heading,body,link_kind,link,dedupe) ON CONFLICT(dedupe_key) DO NOTHING;
$$;
CREATE OR REPLACE FUNCTION private.match_alerts(target text DEFAULT NULL, alert_target text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE pair record;
BEGIN
 FOR pair IN SELECT l.id,l.title,a.id AS alert_id,a.user_id FROM public.listings l CROSS JOIN public.lost_item_alerts a
 JOIN public.profiles p ON p.id=a.user_id AND NOT p.is_suspended
 WHERE l.status='Available' AND NOT l.is_removed AND a.is_active AND l.finder_id<>a.user_id
 AND (a.date_lost IS NULL OR l.date_found>=a.date_lost)
 AND (target IS NULL OR l.id=target) AND (alert_target IS NULL OR a.id=alert_target)
 AND (nullif(btrim(a.category),'') IS NULL OR a.category=l.category)
 AND (nullif(btrim(a.location),'') IS NULL OR lower(a.location)=lower(l.location_found))
 AND (nullif(btrim(a.keywords),'') IS NULL OR EXISTS
 (SELECT 1 FROM regexp_split_to_table(lower(btrim(a.keywords)),'[[:space:],]+') word
 WHERE word<>'' AND position(word IN lower(l.title || ' ' || l.description))>0)) LOOP
 PERFORM private.notify(pair.user_id,'alert_match','Possible item match',pair.title,'listing',pair.id,pair.alert_id || ':' || pair.id);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION private.listing_inserted() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN PERFORM private.match_alerts(NEW.id); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS spartantrace_listing_match ON public.listings;
CREATE TRIGGER spartantrace_listing_match AFTER INSERT ON public.listings FOR EACH ROW EXECUTE FUNCTION private.listing_inserted();

-- All writes go through one transactional API. Identities are always taken from Auth.
CREATE OR REPLACE FUNCTION public.app_action(action text, payload jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 me public.profiles; l public.listings; c public.claims; v public.conversations; m public.messages;
 a public.lost_item_alerts; r public.reports; target_user public.profiles; n public.notifications;
 target text:=payload->>'id'; result jsonb; v_reason text:=btrim(payload->>'reason'); stamp timestamptz:=clock_timestamp();
 new_status text:=payload->>'status'; new_id text:=gen_random_uuid()::text; content_type text:=payload->>'contentType';
 owner_id text; owner_name text; snippet text; related text;
BEGIN
 -- A signed-in identity may revoke its own app grant even after expiry or suspension.
 IF action='logout' THEN
  UPDATE private.app_sessions SET last_activity='epoch'
  WHERE session_id=auth.jwt()->>'session_id' AND user_id=auth.uid()::text;
  RETURN '{}'::jsonb;
 END IF;
 IF NOT private.active_user() THEN RAISE EXCEPTION 'Sign in with an active, verified SJSU account. Your session may have expired.' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT me FROM public.profiles WHERE id=auth.uid()::text;
 IF action='session' THEN
  INSERT INTO private.app_sessions(session_id,user_id,last_activity) VALUES(auth.jwt()->>'session_id',me.id,stamp)
  ON CONFLICT(session_id) DO UPDATE SET last_activity=excluded.last_activity;
  RETURN to_jsonb(me);
 END IF;
 IF action IN ('resolve_report','remove_listing','remove_message','suspend_user','report_context') AND NOT me.is_admin THEN
  RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501';
 END IF;
 IF action IN ('create_listing','update_listing') THEN
  IF length(btrim(payload->>'title'))<4 OR length(btrim(payload->>'description'))<10
  OR coalesce(btrim(payload->>'title'),'')='' OR coalesce(btrim(payload->>'description'),'')=''
  OR coalesce(btrim(payload->>'photoUrl'),'')='' OR coalesce(btrim(payload->>'locationFound'),'')=''
  OR coalesce(payload->>'category','') NOT IN ('Electronics','Keys','IDs & Cards','Clothing & Apparel','Accessories','Books & Supplies','Bags & Backpacks','Other')
  OR coalesce(payload->>'dateFound','') !~ '^\d{4}-\d{2}-\d{2}$' THEN
   RAISE EXCEPTION 'Provide a title (4+ characters), description (10+), photo, category, location, and valid date';
  END IF;
  IF (payload->>'dateFound')::date > (now() AT TIME ZONE 'America/Los_Angeles')::date THEN RAISE EXCEPTION 'Date found cannot be in the future'; END IF;
  IF (payload->>'photoUrl') !~ '^(https?://|data:image/(png|jpeg|webp|gif);base64,)' THEN RAISE EXCEPTION 'Use an image URL or upload a PNG, JPEG, WebP, or GIF'; END IF;
  IF length(payload->>'photoUrl')>7000000 THEN RAISE EXCEPTION 'Photo must be smaller than 5 MB'; END IF;
  IF action='create_listing' THEN
   INSERT INTO public.listings(id,finder_id,finder_name,finder_email,title,description,photo_url,category,location_found,date_found)
   VALUES(new_id,me.id,me.name,me.email,btrim(payload->>'title'),btrim(payload->>'description'),payload->>'photoUrl',payload->>'category',btrim(payload->>'locationFound'),(payload->>'dateFound')::date) RETURNING * INTO l;
  ELSE
   SELECT * INTO l FROM public.listings WHERE id=target FOR UPDATE;
   IF l.id IS NULL OR l.finder_id<>me.id OR l.is_removed OR l.status='Returned' THEN RAISE EXCEPTION 'Only the Finder can edit an active listing'; END IF;
   UPDATE public.listings SET title=btrim(payload->>'title'),description=btrim(payload->>'description'),photo_url=payload->>'photoUrl',category=payload->>'category',location_found=btrim(payload->>'locationFound'),date_found=(payload->>'dateFound')::date,updated_at=stamp WHERE id=target RETURNING * INTO l;
  END IF;
  RETURN to_jsonb(l);
 ELSIF action='listing_status' THEN
  SELECT * INTO l FROM public.listings WHERE id=target FOR UPDATE;
  IF l.id IS NULL OR l.finder_id<>me.id OR l.is_removed THEN RAISE EXCEPTION 'Only the Finder can change this listing'; END IF;
  IF NOT ((l.status='Available' AND new_status='Pending' AND EXISTS(SELECT 1 FROM public.claims WHERE listing_id=l.id AND status='Pending'))
   OR (l.status='Pending' AND new_status='Available' AND NOT EXISTS(SELECT 1 FROM public.claims WHERE listing_id=l.id AND status='Accepted'))
   OR (l.status='Claimed' AND new_status='Returned' AND coalesce((payload->>'confirmed')::boolean,false))) THEN
   RAISE EXCEPTION 'Review claims before accepting; only a Claimed item can be confirmed Returned';
  END IF;
  UPDATE public.listings SET status=new_status,return_date=CASE WHEN new_status='Returned' THEN stamp ELSE return_date END,updated_at=stamp WHERE id=target RETURNING * INTO l;
  IF new_status='Returned' THEN
   FOR c IN SELECT * FROM public.claims WHERE listing_id=target AND status='Accepted' LOOP
    PERFORM private.notify(c.claimant_id,'item_returned','Item return completed',l.title,'listing',l.id);
   END LOOP;
  END IF;
  RETURN to_jsonb(l);
 ELSIF action='create_claim' THEN
  SELECT * INTO l FROM public.listings WHERE id=payload->>'listingId' FOR UPDATE;
  IF l.id IS NULL OR l.is_removed OR l.status<>'Available' OR l.finder_id=me.id THEN RAISE EXCEPTION 'You can claim only another Finder''s Available item'; END IF;
  IF length(btrim(coalesce(payload->>'proofDescription','')))<10 THEN RAISE EXCEPTION 'Provide at least 10 characters of ownership evidence'; END IF;
  IF EXISTS(SELECT 1 FROM public.claims WHERE listing_id=l.id AND claimant_id=me.id AND status<>'Rejected') THEN RAISE EXCEPTION 'You already have an active claim for this item'; END IF;
  INSERT INTO public.claims(id,listing_id,claimant_id,claimant_name,claimant_email,proof_description) VALUES(new_id,l.id,me.id,me.name,me.email,btrim(payload->>'proofDescription')) RETURNING * INTO c;
  INSERT INTO public.conversations(id,claim_id,listing_id,finder_id,claimant_id) VALUES(gen_random_uuid()::text,c.id,l.id,l.finder_id,me.id) RETURNING * INTO v;
  INSERT INTO public.messages(id,conversation_id,sender_id,sender_name,content) VALUES(gen_random_uuid()::text,v.id,me.id,me.name,'Ownership evidence: ' || c.proof_description);
  PERFORM private.notify(l.finder_id,'claim_received','New ownership claim',me.name || ' submitted a claim for ' || l.title,'conversation',v.id);
  RETURN jsonb_build_object('claim',to_jsonb(c),'conversation',to_jsonb(v));
 ELSIF action='claim_status' THEN
  -- Lock listing before claim consistently to serialize competing acceptances.
  SELECT * INTO l FROM public.listings WHERE id=(SELECT listing_id FROM public.claims WHERE id=target) FOR UPDATE;
  SELECT * INTO c FROM public.claims WHERE id=target FOR UPDATE;
  IF c.id IS NULL OR l.finder_id<>me.id OR l.is_removed OR l.status NOT IN ('Available','Pending') OR c.status<>'Pending' OR new_status NOT IN ('Accepted','Rejected') THEN RAISE EXCEPTION 'This claim cannot be changed'; END IF;
  IF new_status='Accepted' AND l.status<>'Pending' THEN RAISE EXCEPTION 'Set the listing to Pending while reviewing before accepting a claimant'; END IF;
  UPDATE public.claims SET status=new_status,updated_at=stamp WHERE id=target RETURNING * INTO c;
  SELECT * INTO v FROM public.conversations WHERE claim_id=c.id;
  PERFORM private.notify(c.claimant_id,CASE WHEN new_status='Accepted' THEN 'claim_accepted' ELSE 'claim_rejected' END,'Claim ' || lower(new_status),l.title,'conversation',v.id);
  IF new_status='Accepted' THEN
   FOR target_user IN SELECT p.* FROM public.profiles p JOIN public.claims other ON other.claimant_id=p.id WHERE other.listing_id=l.id AND other.status='Pending' LOOP
    PERFORM private.notify(target_user.id,'claim_rejected','Another claimant was accepted',l.title,'listing',l.id);
   END LOOP;
   UPDATE public.claims SET status='Rejected',updated_at=stamp WHERE listing_id=l.id AND id<>c.id AND status='Pending';
   UPDATE public.listings SET status='Claimed',updated_at=stamp WHERE id=l.id;
  END IF;
  RETURN to_jsonb(c);
 ELSIF action='conversations' THEN
  SELECT coalesce(jsonb_agg(row_to_json(q) ORDER BY q.updated_at DESC),'[]') INTO result FROM
  (SELECT qconv.*,CASE WHEN qlisting.is_removed AND NOT me.is_admin THEN 'Listing removed' ELSE qlisting.title END AS listing_title,
   CASE WHEN qlisting.is_removed AND NOT me.is_admin THEN NULL ELSE qlisting.photo_url END AS listing_photo,qlisting.finder_name,qclaim.claimant_name,
   (qlisting.is_removed OR qlisting.status='Returned' OR me.id NOT IN (qconv.finder_id,qconv.claimant_id)) AS is_read_only,
   (SELECT content FROM public.messages qmsg WHERE qmsg.conversation_id=qconv.id AND NOT qmsg.is_removed ORDER BY created_at DESC LIMIT 1) AS last_message
   FROM public.conversations qconv JOIN public.listings qlisting ON qlisting.id=qconv.listing_id JOIN public.claims qclaim ON qclaim.id=qconv.claim_id
   WHERE qconv.finder_id=me.id OR qconv.claimant_id=me.id OR me.is_admin) q;
  RETURN result;
 ELSIF action='send_message' THEN
  SELECT * INTO v FROM public.conversations WHERE id=target;
  IF v.id IS NULL OR me.id NOT IN (v.finder_id,v.claimant_id) THEN RAISE EXCEPTION 'Only conversation participants can send messages'; END IF;
  SELECT * INTO l FROM public.listings WHERE id=v.listing_id FOR UPDATE;
  IF l.is_removed OR l.status='Returned' THEN RAISE EXCEPTION 'This conversation is read-only'; END IF;
  IF length(btrim(coalesce(payload->>'content','')))=0 OR length(payload->>'content')>5000 THEN RAISE EXCEPTION 'Messages must contain 1–5000 characters'; END IF;
  INSERT INTO public.messages(id,conversation_id,sender_id,sender_name,content) VALUES(new_id,v.id,me.id,me.name,btrim(payload->>'content')) RETURNING * INTO m;
  UPDATE public.conversations SET updated_at=stamp WHERE id=v.id;
  PERFORM private.notify(CASE WHEN me.id=v.finder_id THEN v.claimant_id ELSE v.finder_id END,'new_message','New message from ' || me.name,left(m.content,160),'conversation',v.id);
  RETURN to_jsonb(m);
 ELSIF action='create_alert' THEN
  IF coalesce(btrim(payload->>'keywords'),'')='' AND coalesce(btrim(payload->>'category'),'')='' AND coalesce(btrim(payload->>'location'),'')='' THEN RAISE EXCEPTION 'At least one alert criterion is required'; END IF;
  IF nullif(payload->>'dateLost','')::date > (now() AT TIME ZONE 'America/Los_Angeles')::date THEN RAISE EXCEPTION 'Date lost cannot be in the future'; END IF;
  INSERT INTO public.lost_item_alerts(id,user_id,keywords,category,location,date_lost) VALUES(new_id,me.id,btrim(coalesce(payload->>'keywords','')),nullif(btrim(payload->>'category'),''),nullif(btrim(payload->>'location'),''),nullif(payload->>'dateLost','')::date) RETURNING * INTO a;
  PERFORM private.match_alerts(NULL,a.id);
  RETURN to_jsonb(a);
 ELSIF action='delete_alert' THEN
  DELETE FROM public.lost_item_alerts WHERE id=target AND user_id=me.id RETURNING * INTO a;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Alert not found'; END IF;
 ELSIF action='read_notification' THEN
  UPDATE public.notifications SET is_read=true WHERE id=target AND user_id=me.id RETURNING * INTO n;
  IF n.id IS NULL THEN RAISE EXCEPTION 'Notification not found'; END IF;
 ELSIF action='read_all_notifications' THEN
  UPDATE public.notifications SET is_read=true WHERE user_id=me.id;
 ELSIF action='create_report' THEN
  IF coalesce(v_reason,'')='' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  target:=payload->>'contentId';
  IF content_type='listing' THEN
   SELECT * INTO l FROM public.listings WHERE id=target AND NOT is_removed;
   IF l.id IS NULL OR NOT private.can_read_listing(l.id) THEN RAISE EXCEPTION 'Listing unavailable'; END IF;
   owner_id:=l.finder_id; owner_name:=l.finder_name; snippet:=l.title || E'\n' || l.description;
  ELSIF content_type='message' THEN
   SELECT * INTO m FROM public.messages WHERE id=target AND NOT is_removed;
   IF m.id IS NULL OR NOT private.can_read_conversation(m.conversation_id) THEN RAISE EXCEPTION 'Message unavailable'; END IF;
   owner_id:=m.sender_id; owner_name:=m.sender_name; snippet:=m.content;
  ELSIF content_type='user' THEN
   SELECT * INTO target_user FROM public.profiles WHERE id=target;
   IF target_user.id IS NULL THEN RAISE EXCEPTION 'Account not found'; END IF;
   owner_id:=target_user.id; owner_name:=target_user.name; snippet:=target_user.name;
  ELSE RAISE EXCEPTION 'Invalid report type'; END IF;
  INSERT INTO public.reports(id,reporter_id,reporter_name,content_type,content_id,owner_id,owner_name,reason,content_snippet)
  VALUES(new_id,me.id,me.name,content_type,target,owner_id,owner_name,v_reason,snippet) RETURNING * INTO r;
  RETURN to_jsonb(r);
 ELSIF action='report_context' THEN
  SELECT * INTO r FROM public.reports WHERE id=target;
  IF r.content_type='message' THEN
   SELECT to_jsonb(qmsg) || jsonb_build_object('conversation',to_jsonb(qconv),'listing',to_jsonb(qlisting)) INTO result
   FROM public.messages qmsg JOIN public.conversations qconv ON qconv.id=qmsg.conversation_id JOIN public.listings qlisting ON qlisting.id=qconv.listing_id WHERE qmsg.id=r.content_id;
  ELSIF r.content_type='listing' THEN SELECT to_jsonb(qlisting) INTO result FROM public.listings qlisting WHERE id=r.content_id;
  ELSE SELECT to_jsonb(p) INTO result FROM public.profiles p WHERE id=r.content_id; END IF;
  RETURN coalesce(result,'{}');
 ELSIF action='resolve_report' THEN
  IF coalesce(v_reason,'')='' OR new_status NOT IN ('Dismissed','Confirmed') THEN RAISE EXCEPTION 'Resolution and administrative reason are required'; END IF;
  UPDATE public.reports SET status=new_status,resolved_by=me.id,resolved_at=stamp,admin_notes=v_reason WHERE id=target AND status='Pending' RETURNING * INTO r;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Pending report not found'; END IF;
  INSERT INTO public.admin_audit_logs(id,admin_id,admin_name,action,target_id,target_type,reason)
  VALUES(new_id,me.id,me.name,'RESOLVE_REPORT',target,'report',new_status || ': ' || v_reason);
  RETURN to_jsonb(r);
 ELSIF action IN ('remove_listing','remove_message') THEN
  IF coalesce(v_reason,'')='' THEN RAISE EXCEPTION 'Administrative reason is required'; END IF;
  IF action='remove_listing' THEN
   UPDATE public.listings SET is_removed=true,moderation_reason=v_reason,updated_at=stamp WHERE id=target AND NOT is_removed RETURNING * INTO l;
   IF l.id IS NULL THEN RAISE EXCEPTION 'Active listing not found'; END IF;
   UPDATE public.notifications SET message='This listing was removed.' WHERE link_type='listing' AND link_id=l.id;
   owner_id:=l.finder_id; related:=l.id; content_type:='listing';
  ELSE
   UPDATE public.messages SET is_removed=true WHERE id=target AND NOT is_removed RETURNING * INTO m;
   IF m.id IS NULL THEN RAISE EXCEPTION 'Active message not found'; END IF;
   UPDATE public.notifications SET message='A message in this conversation was removed.' WHERE type='new_message' AND link_id=m.conversation_id AND message=left(m.content,160);
   owner_id:=m.sender_id; related:=m.conversation_id; content_type:='message';
  END IF;
  PERFORM private.notify(owner_id,'content_removed',initcap(content_type) || ' removed','Reason: ' || v_reason,CASE WHEN content_type='listing' THEN 'listing' ELSE 'conversation' END,related);
  INSERT INTO public.admin_audit_logs(id,admin_id,admin_name,action,target_id,target_type,reason)
  VALUES(new_id,me.id,me.name,upper(action),target,content_type,v_reason);
 ELSIF action='suspend_user' THEN
  IF target=me.id OR coalesce(v_reason,'')='' THEN RAISE EXCEPTION 'Provide a reason and select another account'; END IF;
  UPDATE public.profiles SET is_suspended=(payload->>'isSuspended')::boolean WHERE id=target RETURNING * INTO target_user;
  IF target_user.id IS NULL THEN RAISE EXCEPTION 'Account not found'; END IF;
  -- End existing app sessions; restoration requires signing in again.
  IF target_user.is_suspended THEN
   INSERT INTO private.app_sessions(session_id,user_id,last_activity)
   SELECT id::text,user_id::text,'epoch'::timestamptz FROM auth.sessions WHERE user_id::text=target
   ON CONFLICT(session_id) DO UPDATE SET last_activity='epoch';
  END IF;
  INSERT INTO public.admin_audit_logs(id,admin_id,admin_name,action,target_id,target_type,reason)
  VALUES(new_id,me.id,me.name,CASE WHEN target_user.is_suspended THEN 'SUSPEND_USER' ELSE 'RESTORE_USER' END,target,'user',v_reason);
  RETURN to_jsonb(target_user);
 ELSE RAISE EXCEPTION 'Unknown action'; END IF;
 RETURN '{}'::jsonb;
END $$;
REVOKE ALL ON FUNCTION public.app_action(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.app_action(text,jsonb) TO authenticated;
-- Revoke PUBLIC defaults on newly defined private functions as well.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.app_version() RETURNS integer LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT 2 $$;
REVOKE ALL ON FUNCTION public.app_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_version() TO anon,authenticated;

COMMIT;
