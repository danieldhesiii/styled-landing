# Go-live setup guide

Click-by-click for turning the switches on and running your first real order. This
is the "how do I actually do it" companion to [pilot-runbook.md](./pilot-runbook.md).

Nothing here touches code — it's accounts, keys, and a few clicks. Expect ~45 min.

> **One rule to remember:** after you change any environment variable in Vercel, you
> must **redeploy** for it to take effect. (Instructions in each part.)

---

## What you'll need
- Access to the **Vercel** project (`styled-landing`).
- An **OpenAI** account with a card on file (for the AI renders).
- A **Resend** account (free tier is fine) for emails.
- Your **admin login** for the site.

---

## Part 1 — Turn on real renders (the hook)  · ~15 min

The render engine is built; it just needs an OpenAI key.

1. **Get an OpenAI API key.** Go to **platform.openai.com → "API keys" → "Create new
   secret key."** Copy it (starts with `sk-...`). Make sure billing is set up under
   **Settings → Billing**.
   - ⚠️ The image model (`gpt-image-1`) often requires you to **verify your
     organisation** first: **Settings → Organization → General → Verify Organization.**
     Do this if renders fail with a "model not available / verification" error.
2. **Add it to Vercel.** **vercel.com → the `styled-landing` project → Settings →
   Environment Variables → Add New.**
   - Name: `OPENAI_API_KEY`
   - Value: your `sk-...` key
   - Environments: tick **Production** (and **Preview**) → **Save.**
3. **Redeploy.** Go to the **Deployments** tab → the latest deployment → the **⋯** menu
   → **Redeploy.** Wait for it to finish (~1–2 min).
4. **Test it — this is the most important check.** Open your site, go to **/design**,
   **upload a real venue photo**, pick a style, and generate. Ask yourself: *does this
   look good enough that a couple would say "I want that"?* That answer decides whether
   the product is ready to show people.

---

## Part 2 — Turn on emails (supplier + couple notifications)  · ~20 min

Without this, the app still works — the emails are just written to the logs instead of
sent. To actually notify people:

1. **Sign up at resend.com.**
2. **Verify your sending domain.** **Domains → Add Domain**, enter your domain (e.g.
   `styled.co.uk`), and add the DNS records it shows you at your domain registrar
   (GoDaddy / Cloudflare / etc.). Wait for it to go "Verified."
   - *Quick test alternative:* you can skip domain verification to try it out, but then
     emails will **only send to your own Resend account email** — fine for a test, not
     for real couples/vendors.
3. **Create an API key.** **API Keys → Create API Key.** Copy it (`re_...`).
4. **Add three variables in Vercel** (same place as Part 1, Production + Preview):
   - `RESEND_API_KEY` = your `re_...` key
   - `NOTIFY_FROM_EMAIL` = `Styled <orders@yourdomain.com>` *(must be on the verified domain)*
   - `NEXT_PUBLIC_SITE_URL` = your live URL (e.g. `https://styled-landing-zeta.vercel.app`
     or your custom domain)
5. **Redeploy** (Deployments → ⋯ → Redeploy). `NEXT_PUBLIC_` values are baked in at build
   time, so a redeploy is essential here.

---

## Part 3 — Get into the admin

1. Go to your site, click **Log in**, and sign in with your **staff account** (the one
   set up earlier, e.g. `admin@styled.test`). After signing in, open your account menu —
   the **"Admin dashboard"** link appears for staff → click it. You're in at `/admin`.
2. **Forgot the password?** Reset it without the terminal: **supabase.com → your project
   ("Wedding Planner") → Authentication → Users →** find the account **→** set a new
   password. Then log in as above.

---

## Part 4 — Swap the demo suppliers for real ones

> The 12 suppliers currently on the site are **fictional demo data.** For a real pilot,
> hide them so couples only see vendors who'll actually fulfil.

1. **Switch the fakes off.** **Admin → Suppliers →** open each demo supplier → untick
   **"Active."** (This hides all their products at once; nothing is deleted — you can turn
   them back on any time for demos.)
2. **Add a real vendor.** Either:
   - They applied via your **/vendors** page → **Admin → Vendors → Accept → "Set up as
     supplier →"** (the form is pre-filled), **or**
   - **Admin → Suppliers → Add supplier** (name, area, logo URL, commission %).
3. **Add their products.** Open the supplier → **Add product** for each piece: category,
   price, unit (e.g. "per table"), quantity rule, **units-per-day capacity** (leave blank
   for made-to-order), lead time, and which styles it suits.
4. **(Optional) Give them a portal login.** Same supplier page → **Portal logins →
   Create login** with their email → send them the one-time password. They sign in at
   **/portal/login** to confirm their own orders. *(You can skip this and relay orders to
   them yourself at first.)*

---

## Part 5 — Walk one test order end to end

1. Open **/design in a fresh private/incognito window** (so you're a "new couple"). Add a
   **wedding date**, pick some real products, and go through **"Reserve this design."**
2. The **vendor is emailed** and sees the order in **/portal** → they **Confirm** their
   items. *(Or you set them in Admin → the order.)*
3. **You confirm the whole order:** **Admin → Orders →** open it → **Confirm** (needs
   every supplier line confirmed first).
4. The **couple gets a confirmation email** with your message + a link to their order.
5. **Take the deposit manually** (invoice / bank transfer — there's no card payment yet)
   and coordinate delivery with the vendor.

That's the entire model working, with only the deposit done by hand.

---

## Quick troubleshooting

| Symptom | Cause / fix |
|---|---|
| Render shows a generic placeholder, not the venue | `OPENAI_API_KEY` not set, or you didn't redeploy |
| Render errors about "verification" | Verify your org on OpenAI (Part 1, step 1) |
| No emails arrive | `RESEND_API_KEY`/sender not set, domain not verified, or not redeployed |
| Emails only reach your own inbox | Domain not verified in Resend (you're on the test sender) |
| A real vendor's items don't show in the shop | The supplier or the product is switched **off** |
| A couple can't book a date | Capacity is used up or the date is blocked (Admin → Availability) |

---

*When renders look great and one test order has gone cleanly through the loop, you're
ready to put it in front of real couples and real vendors — that's the pilot.*
