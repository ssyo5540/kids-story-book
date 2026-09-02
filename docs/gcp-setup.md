# Google Cloud setup (zero-spend launch)

Run `infra/gcp-setup.sh` (it prompts before anything is created), or follow these steps by hand.

## 0. Verify the free tier first
Console → **Billing → Pricing** → filter "Cloud Text-to-Speech" → find the **Chirp 3 HD** SKU. It should show a
free band up to **1,000,000 characters per month** and about $0.00003 per character above that (third-party
sources report this; confirm it yourself). If there is no free band, keep `TTS_MONTHLY_CHAR_BUDGET=0` and pick a
cheaper voice family in `content/voices/voices.yaml` before generating anything.

Billing counts **characters**; API limits count **bytes** (Indic scripts are 3 bytes per character).

## 1. Project and APIs
```bash
export PROJECT_ID=nightlight-tales
gcloud projects create $PROJECT_ID && gcloud config set project $PROJECT_ID
# link the billing account in the console, then:
gcloud services enable texttospeech.googleapis.com storage.googleapis.com billingbudgets.googleapis.com
```
Free Trial: $300 for 90 days, **no automatic upgrade**. When the trial ends the billing account closes and the
bucket and API stop (30-day grace). Put a reminder in your calendar to upgrade before day 90. Always Free tiers
apply during and after the trial.

## 2. Service account (least privilege)
- `roles/serviceusage.serviceUsageConsumer` on the project (lets the app call the TTS API with project quota).
- `roles/storage.objectAdmin` on the bucket only.
- Create one key, paste it into Railway as `GCP_SA_KEY_JSON` (raw JSON or base64), delete the local file, rotate
  every 90 days. Local development uses `gcloud auth application-default login` instead of a key.

## 3. Bucket
`us-central1` (Always Free: 5 GB storage and 100 GB North-America egress per month apply to US regions only;
Mumbai has no free tier). Uniform access, `allUsers → roles/storage.objectViewer`, CORS from
`infra/gcs-cors.json` (needed for `<audio>` Range requests and the service worker's Cache API). No lifecycle
rules — `pnpm audio:gc` prunes superseded objects.

## 4. Quotas (burst limiter)
IAM & Admin → Quotas → `texttospeech.googleapis.com` → lower **Requests per minute for Chirp 3 voices** from 200
to about 120. Decreases apply immediately. There is no monthly-character quota; the app ledger is the real stop.

## 5. Budget alerts (notification only)
Billing → Budgets & alerts → create a **$5** budget with alerts at 20 %, 100 % and 100 % forecast.

## 6. First real audio
```bash
# .env.local: TTS_DRIVER=google STORAGE_DRIVER=gcs GCS_BUCKET=... PUBLIC_AUDIO_BASE_URL=https://storage.googleapis.com/... GCP_PROJECT_ID=...
pnpm audio:previews --dry-run && pnpm audio:previews --verify-voices     # ~11k characters
pnpm audio:generate --story arjuna-and-the-birds-eye --locale en-IN --dry-run
pnpm audio:generate --story arjuna-and-the-birds-eye --locale en-IN
```
Open the story in Safari and Chrome: check `audio.duration`, seeking, chunk seams and loudness before batch runs.

## 7. Monthly check
Billing → Reports grouped by SKU (characters) vs `pnpm audio:status` / `GET /api/admin/usage`.
