# Yatri Entry – Shri Shankheshwar Parshwanath Bafna Jain Tirth

A small mobile-first web app that replaces the paper slips for **Nashta, Bhojan and Stay**.
Yatris scan a QR code, fill a short form and get a token. Counter staff see the entries
live, and trustees see totals for any date range. Hindi by default, with an English switch on
every page. After submitting, the yatri sends the details to the trust's WhatsApp with one tap,
and every entry is also copied to a Google Sheet that management can open, free of cost.

| Screen | Address | Who | Login |
|---|---|---|---|
| Yatri form | `/` | Yatri (or staff for a yatri without a phone) | none |
| Token page | `/token/<random id>` | Yatri | none |
| Staff counter | `/staff` | Counter staff | `STAFF_PIN` |
| Admin dashboard | `/admin` | Admin / trustees | `ADMIN_PASSWORD` |
| QR poster | `/admin/qr` | Admin | `ADMIN_PASSWORD` |

The admin password also opens the staff counter.

## How it behaves

- **No payments in the app.** Payment is taken manually at the counter. The app only records
  entries, and staff can cancel an entry with a reason. Nothing is ever deleted.
- **Token numbers** (#0001, #0002 …) come from a database sequence and are never reused.
- **Token page links are random**, so nobody can open other yatris' tokens by changing a
  number in the address.
- **ID numbers are never stored in full.** Only the last 4 characters are kept
  (e.g. `XXXX-XXXX-1234`). For Aadhaar, the typed number never even leaves the phone.
- **ID photo (optional)**: for a stay, the yatri can add a photo of the ID below the ID number.
  The phone shrinks it to a small JPEG first. A masked Aadhaar is suggested. The photo is never
  shown on the token page; staff and admin open it from the entry, and with the Google Sheet
  connected it is saved in the trust's Google Drive and linked in the sheet (and then removed
  from the database).
- **Dates on the yatri form**: nashta / bhojan is for today or tomorrow. For a stay, the yatri
  taps **आज** (today) or picks the arrival day on the calendar below it, up to 30 days ahead
  (`STAY_ADVANCE_DAYS`); the nights of the stay are shaded on the calendar. Staff entries may
  use any date within ±30 days.
- **Sending the form twice** (double tap, weak network) returns the same token instead of
  creating a second entry.
- **Google Sheet for management** (once connected, see below): right after submit, every entry
  is written to a Google Sheet, one tab per month, with the same columns as the Excel download.
  A cancellation updates the same row.
- **Details to the trust's WhatsApp, free**: right after submit, the token page's green button
  opens WhatsApp with the yatri's details (token, name, city, seva, people, dates) already written to the
  trust number `TRUST_WHATSAPP` (92160 57565); the yatri presses Send. It goes from the yatri's
  own WhatsApp, so there is no fee, and the yatri keeps a copy in the chat.
- **Automatic WhatsApp** (no tap needed) is built in but **off**, because WhatsApp charges
  businesses per message. See "Optional: automatic WhatsApp" if the trust ever wants it.
- **Download and share buttons** on the token page work without any setup: one downloads the
  coupon photo, the other (on phones) opens the share sheet.
- **All dates and times are India time** (Asia/Kolkata), whatever the server's timezone.

### How the admin numbers are counted

- Cancelled entries are left out of every number except the "Cancelled" count.
- Entries and yatri are counted on the day the form was filled.
- Nashta / Bhojan people use "how many people" from the meal section.
- "Staying now" = active stay entries where check-in ≤ today ≤ check-out.
- The Excel (CSV) download contains every entry in the chosen date range, including cancelled ones.

## Run it on your computer

Needs Node.js 20.19 or newer.

```bash
npm install                 # also generates the database client
npm run db:local            # starts a local Postgres in the background (no Docker needed)
cp .env.example .env        # then fill in the values (see below)
npm run db:migrate          # creates the tables
npm run dev                 # http://localhost:3000
```

For the local database use these two lines in `.env` (they are also in `.env.example`):
`DATABASE_URL=postgres://postgres:postgres@localhost:51214/template1?sslmode=disable` and
`SHADOW_DATABASE_URL=postgres://postgres:postgres@localhost:51215/template1?sslmode=disable`.

**Testing on a phone on the same Wi-Fi:** dev mode only allows `localhost`, so use
production mode instead: `npm run build && npm start`, then open `http://<computer's IP>:3000`
on the phone.

## Settings (`.env`)

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Postgres connection string the app uses (on a hosted database: the **pooled** one) |
| `DIRECT_URL` | Direct (non-pooled) connection string, used only by migrations. Optional |
| `SHADOW_DATABASE_URL` | Local development only (scratch database for `npm run db:migrate`) |
| `STAFF_PIN` | Counter staff PIN (use 6+ digits; 10 wrong tries from one network locks logins there for 15 minutes) |
| `ADMIN_PASSWORD` | Admin password |
| `SESSION_SECRET` | Random string, 32+ characters, used to sign login cookies |
| `TRUST_WHATSAPP` | Trust WhatsApp number with country code, e.g. `919216057565` |
| `APP_URL` | Public address of the app, used for the printed QR code |
| `WHATSAPP_TOKEN` | Optional, paid: Meta access token for automatic WhatsApp. Leave empty (off) |
| `WHATSAPP_PHONE_NUMBER_ID` | "Phone number ID" of the sending number, from WhatsApp Manager |
| `WHATSAPP_TEAM_NUMBERS` | Representative number(s) that get every new entry, comma-separated. Empty = `TRUST_WHATSAPP` |
| `WHATSAPP_YATRI_TEMPLATE` / `WHATSAPP_TEAM_TEMPLATE` | Template names, if different from `yatri_token` / `yatri_entry_alert` |
| `WHATSAPP_DAILY_LIMIT` | At most this many entries a day get WhatsApp messages (default 2000), to protect the bill if someone spams the form |
| `GOOGLE_SCRIPT_URL` | Web app address of the Apps Script in the Google Sheet (ends in `/exec`). Empty = Google Sheet copy off |
| `GOOGLE_SCRIPT_SECRET` | Long random text, the same as `SECRET` in the Apps Script (16+ characters) |
| `GOOGLE_SHEET_ID` | Optional: ID of the Google Sheet, only for the "open sheet" link on the admin screen |

Changing `STAFF_PIN` or `ADMIN_PASSWORD` logs everyone with that role out. Logins last 12 hours.

## Database

**PostgreSQL**, on purpose. The entries are structured records that need totals by day, a
token sequence that never repeats, and a strict "never delete" rule. That is what a relational
database does best, and Postgres is the standard, free, widely hosted choice.

**How big it gets** (measured with 300,000 test entries, search indexes included):
about **0.36 KB per entry**. The table below plans with 0.5 KB per entry, to leave room for the
indexes growing in everyday use:

| Entries per day | Per year | After 10 years |
|---|---|---|
| 300 | ~110,000 entries ≈ 55 MB | ≈ 0.55 GB |
| 1,000 | ~365,000 entries ≈ 180 MB | ≈ 1.8 GB |
| 3,000 (festival-level every day) | ~1.1 million ≈ 0.55 GB | ≈ 5.5 GB |

Even the busiest row fits in the 8 GB that the recommended host includes. Postgres handles
hundreds of millions of rows, so this is small for it. With those 300,000 entries loaded, the
database work for a full-year dashboard took about 0.4 s, and the staff list, token lookup and
searches each took under 5 ms, even on the slow local test database. The app is written to stay
fast as the table grows:

- every screen reads through an index (entry time, token number, mobile, check-out date);
- dashboard totals and the per-day chart are summed inside the database, not in the app;
- name and mobile search use trigram indexes (`pg_trgm`), so "contains" search stays fast;
- the staff list shows at most the newest 200 entries (search finds the rest);
- the Excel (CSV) download streams 1,000 rows at a time, so even a year downloads fine.

### Where to host it

**Recommended: [Supabase](https://supabase.com) Pro, region South Asia (Mumbai, `ap-south-1`).**
About $25/month, 8 GB disk included (grows automatically when needed), daily backups kept for
7 days, and a built-in connection pooler. Being in Mumbai keeps the app fast for yatris and staff.

Alternatives: DigitalOcean Managed PostgreSQL in Bangalore (from about $15/month), or Neon
(no India region; Singapore is nearest; the free plan holds only 0.5 GB). Free plans are fine
for trying the app, but don't keep the trust's real records on them: their backups are minimal.

**Backups:** besides the host's daily backups, download the previous month's Excel (CSV) from
the admin screen at the start of every month and keep it in the trust's Google Drive.

## Put it online (Supabase Mumbai + Vercel)

1. In Supabase, create a project with region **South Asia (Mumbai)** and a strong database
   password.
2. Open **Connect** and copy two connection strings:
   - **Transaction pooler** (port 6543) → `DATABASE_URL`
   - **Session pooler** (port 5432) → `DIRECT_URL` (works on home internet without IPv6)
3. From this folder, with those two values in `.env`, run `npm run db:deploy`. This creates the
   tables and search indexes. Run it again after any future change to `prisma/schema.prisma`.
   **Then lock Supabase's public Data API** (it would otherwise let anyone holding the
   project's public key read the tables). In Supabase → SQL Editor, run:
   ```sql
   do $$ declare t text; begin
     for t in select tablename from pg_tables where schemaname = 'public' loop
       execute format('alter table public.%I enable row level security', t);
     end loop;
   end $$;
   revoke all on all tables in schema public from anon, authenticated;
   revoke all on all sequences in schema public from anon, authenticated;
   revoke all on all functions in schema public from anon, authenticated;
   alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
   alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
   alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
   revoke usage on schema public from anon, authenticated;
   ```
   The app is not affected: it connects as the table owner, not through the Data API.
4. Push this folder to a GitHub repository and import it in [Vercel](https://vercel.com), or
   upload it straight from this folder with `npx vercel deploy --prod` (no GitHub needed;
   `.vercelignore` keeps the `.env` files out of the upload). `vercel.json` already runs the
   app in Vercel's Mumbai region (`bom1`), next to the database.
5. In Vercel → Settings → Environment Variables, add `DATABASE_URL`, `DIRECT_URL`, `STAFF_PIN`,
   `ADMIN_PASSWORD`, `SESSION_SECRET`, `TRUST_WHATSAPP` and `APP_URL` (the Vercel address or
   your own domain), plus the WhatsApp and Google Sheet settings once you have them (next
   section; the app works without them).
6. Deploy, log in at `/admin`, open **QR print**, and print the A4 poster for the counter and
   the entrance.

Any host that runs Node.js also works: `npm install`, `npm run db:deploy`, `npm run build`,
`npm start`.

## Google Sheet for management (free)

Right after the yatri gets the token, the entry is also copied to the trust's Google Sheet: one
tab per month (`2026-10`, `2026-11` …), one row per entry, with the same columns as the Excel
download, including the **ID फोटो** (link to the ID photo in Google Drive, if one was added).
When staff cancel an entry, its row is updated. Share the sheet with management and they see
every entry as it arrives. It costs nothing.

The app talks to the sheet through a small Google Apps Script that lives inside the sheet
([google-apps-script/Code.gs](google-apps-script/Code.gs)): no Google Cloud project or key file
is needed, and the ID photos are saved in the sheet owner's Google Drive (15 GB free). A secret
shared by the app and the script stops anyone else from writing to the sheet.

The admin dashboard has a **Google Sheet** card that shows whether it is connected, links to the
sheet, and lists any rows that failed, with a **फिर से भेजें** (retry) button.

How it works: the row is saved together with the entry and written right after the yatri gets
the token, so the form never waits for Google. If Google is down, the app retries after 1, 5,
15, 60 and 180 minutes, and again whenever new entries come in or you press retry. A retry never
adds a second row: the script finds the token's row and rewrites it.

Size: one spreadsheet holds up to 10 million cells, about 370,000 entries. Before it fills up
(about a year at 1,000 entries a day), make a new spreadsheet with the same script. The database
always keeps everything anyway.

### Google Sheet setup (about 5 minutes)

1. Open the Google Sheet (signed in as its owner) and choose **Extensions → Apps Script**.
2. Delete what is in the editor and paste the whole of
   [google-apps-script/Code.gs](google-apps-script/Code.gs).
3. In the line `const SECRET = "PASTE-YOUR-SECRET-HERE";` put a long random text (the same text
   goes into the app as `GOOGLE_SCRIPT_SECRET`). Make one with
   `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`. Save.
4. **Deploy → New deployment**, type **Web app**. *Execute as*: **Me**. *Who has access*:
   **Anyone**. Deploy and allow the access Google asks for. Google may warn "Google hasn't
   verified this app": it is your own script, so choose **Advanced → Go to … (unsafe)**.
5. Copy the **Web app URL** (ends in `/exec`) into `GOOGLE_SCRIPT_URL`, put the secret in
   `GOOGLE_SCRIPT_SECRET`, and the sheet's ID (the long part of its address) in
   `GOOGLE_SHEET_ID`. In Vercel, redeploy.
6. **Sharing:** in the sheet's **Share** button, set *General access* to **Restricted**
   (not "Anyone with the link"; the sheet holds yatris' names and mobile numbers), then add
   each management person's Google account as **Viewer**. ID photos go to the Drive folder
   **Tirth ID photos**; share that folder with the people who need to see them.

New entries then appear in a tab named after the month, created automatically. Only entries
made after the setup are copied; for older ones use the Excel download. Don't rename the tabs or
move the token column away from column A: cancellations find their row by token number. If you
change the script later, use **Deploy → Manage deployments → Edit → Version: New version** so the
address stays the same.

## Optional: automatic WhatsApp (paid, currently off)

The app can also send the coupon photo to the yatri's WhatsApp, and an alert to the trust's
representative, automatically. WhatsApp charges businesses for every such message, so this is
**off**, and stays off while `WHATSAPP_TOKEN` is empty. Without it, the yatri can still share
the coupon on WhatsApp or download it from the token page for free.

When it is on: messages are saved with the entry, sent right after it and retried like the
sheet rows. Messages more than 24 hours late are skipped, and a mobile number gets at most 3
token messages a day, so nobody can use the form to flood a number.

**Cost:** Meta charges per message. In India a "utility" message costs about ₹0.115
([Meta pricing](https://developers.facebook.com/docs/whatsapp/pricing)). Each entry sends 2
(yatri + representative), so 300 entries a day is about ₹70 a day, or roughly ₹2,100 a month.

### WhatsApp setup (Meta WhatsApp Business Platform)

1. **Pick the sending number.** Use a number that is *not* the representative's
   (`9216057565` receives the alerts, and a number can't message itself). It must not be in use
   on the normal WhatsApp app; a new SIM is simplest. Yatris will see messages from this number,
   with the trust's name.
2. At [business.facebook.com](https://business.facebook.com), create a business account for the
   trust. At [developers.facebook.com](https://developers.facebook.com), create an app of type
   **Business** and add the **WhatsApp** product.
3. In **WhatsApp Manager**, add the sending number, verify it by SMS, and set the display name
   (e.g. "Bafna Jain Tirth"). Meta reviews the name. Add a payment method. Until Meta verifies
   the business (trust registration papers, under Business settings → Security centre), a new
   number can message only about 250 people a day.
4. In **Business settings → System users**, create a system user, give it the WhatsApp account
   with full control, and generate a token with the permissions `whatsapp_business_messaging`
   and `whatsapp_business_management`. This token is `WHATSAPP_TOKEN` (it does not expire).
   In WhatsApp Manager → Phone numbers, copy the **Phone number ID**: that is
   `WHATSAPP_PHONE_NUMBER_ID`.
5. In **WhatsApp Manager → Message templates**, create these templates with category
   **Utility**, header type **Image** (upload any token photo downloaded from the app as the
   sample) and exactly this body text. Meta asks for sample values; use the examples shown.

   **`yatri_token`, language Hindi**
   ```
   जय जिनेन्द्र {{1}} जी 🙏

   श्री शंखेश्वर पार्श्वनाथ बाफना जैन तीर्थ में आपकी एंट्री हो गई है।
   टोकन नंबर: *{{2}}*
   सेवा: {{3}}
   तिथि: {{4}}
   यात्री: {{5}}

   कृपया काउंटर पर यह टोकन दिखाएँ।
   ```
   Samples: `रमेश जैन`, `#0427`, `नाश्ता, भोजन`, `भोजन तिथि 12-10-2026`, `4 (पुरुष 2, महिला 1, बच्चे 1)`

   **`yatri_token`, language English** (add it as a second language of the same template)
   ```
   Jai Jinendra {{1}} ji 🙏

   Your entry at Shri Shankheshwar Parshwanath Bafna Jain Tirth is confirmed.
   Token number: *{{2}}*
   Seva: {{3}}
   Date: {{4}}
   Yatri: {{5}}

   Please show this token at the counter.
   ```
   Samples: `Ramesh Jain`, `#0427`, `Nashta, Bhojan`, `Meal date 12-10-2026`, `4 (Men 2, Women 1, Children 1)`.
   Yatris who filled the form in English get this one. Until it is approved, they get the Hindi
   one.

   **`yatri_entry_alert`, language Hindi** (for the representative)
   ```
   नई यात्री एंट्री – टोकन *{{1}}*
   नाम: {{2}}
   मोबाइल: {{3}}
   शहर: {{4}}
   सेवा: {{5}}
   यात्री: {{6}}
   तिथि: {{7}}
   किसने भरी: {{8}}

   पूरी जानकारी एडमिन पैनल में है।
   ```
   Samples: `#0427`, `रमेश जैन`, `98765 43210`, `सूरत`, `नाश्ता, भोजन`, `4 (पुरुष 2, महिला 1, बच्चे 1)`, `भोजन तिथि 12-10-2026`, `यात्री`
6. Once the templates are approved, add `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` (and
   `WHATSAPP_TEAM_NUMBERS` if the alerts should go to a number other than `TRUST_WHATSAPP`) in
   Vercel, redeploy, and make a test entry with your own number.

## Code map

- `src/app/page.tsx`: yatri form page (`src/components/yatri-form.tsx`)
- `src/app/token/[id]`: token page; its card data comes from `src/lib/token-card.ts`
- `src/lib/token-paint.ts`: draws that card as a photo. The browser uses it for the share and
  download buttons (`src/components/token-share.tsx`, `src/lib/token-image.ts`), and the server
  uses it for the WhatsApp photo (`src/lib/token-photo.ts`, with the font files in
  `assets/fonts`, so Hindi letters join correctly everywhere)
- `src/lib/jobs.ts`: Google Sheet rows (and the optional automatic WhatsApp): saved with the
  entry, retried until they succeed (`src/lib/google-sheet.ts`, `src/lib/whatsapp.ts`)
- `google-apps-script/Code.gs`: the script that goes into the Google Sheet
- `src/lib/trust-message.ts`: the free WhatsApp message to the trust (token page button)
- `src/lib/id-photo.ts`: shrinks the ID photo on the phone; `src/app/admin/id-photo`: opens it
  for staff and admin
- `src/app/staff`: staff counter, PIN login
- `src/app/admin`: dashboard, QR poster, CSV export (`admin/export/route.ts`); the CSV and the
  Google Sheet share their columns (`src/lib/entry-columns.ts`)
- `src/app/actions`: server actions (save / cancel entry, login / logout, retry messages)
- `src/lib/entry-rules.ts`: validation and ID masking (shared by phone and server)
- `src/lib/i18n.ts`: every Hindi and English text
- `src/lib/queries.ts`: database queries and the dashboard counting rules
- `prisma/schema.prisma`: database tables

## Not included (by design)

Payment tracking, room allotment, payment gateway, OTP / yatri login, and
mobile apps.
