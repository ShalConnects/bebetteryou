# Dashboard

Admin only (`ADMIN_EMAIL`). Sign in at `/auth/signin` → `/dashboard`. Other accounts see a welcome and **Browse quotes** only.

**View site** opens the public homepage. **Log out** ends the session. Phone: **Admin section** dropdown. Desktop menu: Overview, Analytics, Quotes, Tags, Print, Subscribers, Practice (if on). Collapsed sections stay that way in this browser.

Scheduled posts run once a day at **14:00 UTC** (~8pm Bangladesh, ~10am US Eastern in summer). Quote email runs at **15:00 UTC**, and only if a social post succeeded that UTC day.

## Overview

1. **Today** — nothing pending, a red failure count (opens Schedules), **Up next**, or **Pending** networks.
2. Counts: total quotes, latest #, next #, social networks **Ready**.
3. **Social** — each network is Ready, Pending, Not configured, or YouTube **Connect** / **Reconnect**. Last line is the latest post (**ok** or **failed**); click it to open the card. A failed YouTube connect needs the callback URL in Google Cloud, then Connect again.

## Quotes

Four blocks: **New quote**, **Week in review**, **Schedules**, **Cards**.

**New card.** Type the quote (over the line limit blocks save). Author optional. Pick tags (mood, hashtags, scripture). Scripture theme: **From tags** or a pin. Preview updates as you type. **Already #…** means the words exist; you can still save. **Generate & save** publishes the card on the site only — no social post, no email.

**Post to social** (after save, or inside a card):

- Check ready networks. Grey = not set up. Hints: posted, failed, pending, setup.
- **Preview Short** does not publish. YouTube needs **Connect YouTube** once. Instagram and Threads need a public site URL.
- **Post now** sends immediately. **Schedule** uses your local time; anything due after today’s 14:00 UTC waits until the next run. **Mark posted** records a manual share (for example X) and does not call the network.
- Result is **Posted** + **Open**, or a red error. **Cancel** under **Scheduled** drops a pending run.

**Email this card** mails up to 100 quote subscribers with no quote mail in 30 days. Failures still use that cooldown. Do not resend the same day to “fix” them.

**Cards.** Search text, author, or #. Filter by tag or **All**. **no text** = words only in the image; not printable. Edit quote, author, tags, scripture theme (blank = from tags), **Pin books** / **Pin posts** (comma-separated slugs, e.g. `atomic-habits, cant-hurt-me`). **Save** keeps the image. **Save & regenerate** redraws it — use that after wording changes. **Delete**, **View on site**, **Close**.

**Schedules.** **Failures** → **Retry failed** (failed networks only) or **Open in Cards**. **Upcoming** → **Cancel**. **Recent** is the last finished runs.

**Week in review** (Friday). Window is Saturday–Thursday. The page says which set loaded: that window, posts from that window, all posted cards, or newest fallback. **Preview (no publish)** builds collage + Short (~30s) and sends nothing. **Publish week in review** once, after preview:

- Collage → Instagram, Facebook, Bluesky, Telegram, Pinterest
- Short → YouTube
- Thread → Threads
- Digest → email

Publishing again sends it again.

## Tags and scripture

**Tags** link quotes, mood, scripture, blog, and hashtags. Add or edit: **Name**, **Mood**, **Theme** (e.g. `perseverance`), **Hashtags**. Each row shows where the name is used. **Delete** strips that name from quotes, books, and passages.

**Scripture** (starts collapsed). **Missing passages** = tradition + tag with no text. **Preview** shows the passage for a quote number, tradition, and translation. Add: tradition, theme, reference, text, optional URL, plus alternate wording when asked. **Edit** / **Delete** change what visitors see.

## Print

Empty until the print shop is on and orders exist. Only cards with a text field can be printed.

Table: order, date, customer, item, status, total. Order number opens the address. **Copy address** copies ship-to. Thumbnail opens the print file. Status words come from Printful (`submit failed`, `awaiting payment`).

- **Mark paid** — only if waiting for payment and no card processor is connected. Confirms outside payment. Does not charge.
- **Retry** — paid or submit failed. Sends to Printful again. Does not refund.

Order page shows the Printful id and any red failure reason. **All orders** goes back.

## Subscribers

Needs the database. A red MongoDB message means the list did not load — fix access or unpause the cluster, then refresh. Do not import or send until it loads.

Quote mail (daily or manual) goes to a **random 100** people opted into quotes with no quote mail in **30 days**. A failed send still counts.

**List.** **All** / **Active** / **Unsubscribed**. Page size 25–200. Click an email to copy. **Unsubscribe** keeps them on the list and stops mail. No delete on this screen.

**Send & import** (starts collapsed):

- **Import** — opted-in addresses only. `email` column or one email per line; optional `quotes`, `blog`, `books`. Confirm opt-in. No welcome mail. Invalid rows are skipped.
- **Send test email** — Welcome, Quote, Blog, or Book to a test address only.
- **Send 6-card digest** — newest 6 cards, same 100-person / 30-day rule as a single card.
- **Notify** — pick a quote, blog post, or book. Quote notify uses the 100 / 30-day rule. Blog and book go to people opted into that type. Read `Sent N of M` before sending again.

**Failed quote sends** — still inside the cooldown. **Bounces & spam** — those addresses are unsubscribed automatically. Do not re-import them.

## Analytics

**Analytics** nav opens the last 30 days (also a collapsible on Overview). Ranges: **7 days**, **30 days**, **90 days**. Admin traffic is excluded.

Visitors, page views, downloads, shares, saves per 100 visits. Practice counts show only if Practice was used. Then trend, **Channels**, **Top pages**, **Traffic sources**, **Most downloaded quotes**, **Shares by destination**. **Not collecting** is a setup problem, not a button on this page.

## Practice

Menu item only when the feature is on. Read-only catalog and monetization switches. Edits are in `data/practice/items.json`, not here.

## Do not mix these up

- **Generate & save** = on the site only. **Post now** and **Publish week in review** go out now. Previews never do.
- **Mark posted** does not post. **Save** does not redraw; **Save & regenerate** does.
- Quote **Email**, **digest**, and quote **Notify** share the 30-day cooldown, including failed sends.
- Deleting a tag clears it everywhere it was used.
- **Mark paid** does not charge. Print **Retry** does not refund.
- Import only confirmed opt-ins. Leave bounced addresses unsubscribed.
