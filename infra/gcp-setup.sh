#!/usr/bin/env bash
# One-time Google Cloud setup. Run step by step; every command is idempotent-ish and safe to re-run.
# Prerequisites: gcloud CLI, a Free Trial (or paid) billing account linked in the console.
set -euo pipefail

: "${PROJECT_ID:?set PROJECT_ID, e.g. nightlight-tales}"
REGION="${REGION:-us-central1}"            # Always Free storage/egress applies to US regions only
BUCKET="${BUCKET:-${PROJECT_ID}-stories-audio}"
SA_NAME="story-app"
SA="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "STEP 0 — verify the Chirp 3 HD free tier in the console before generating anything:"
echo "        Billing → Pricing → filter 'Cloud Text-to-Speech' → Chirp 3 HD SKU should show a free band up to 1,000,000 characters/month."
read -r -p "Continue? [y/N] " ok; [[ "$ok" == "y" ]] || exit 1

gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1 || gcloud projects create "$PROJECT_ID"
gcloud config set project "$PROJECT_ID"
gcloud services enable texttospeech.googleapis.com storage.googleapis.com billingbudgets.googleapis.com

# Service account: consume project quota + object CRUD on this bucket only.
gcloud iam service-accounts describe "$SA" >/dev/null 2>&1 || gcloud iam service-accounts create "$SA_NAME" --display-name="Story app runtime"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${SA}" --role="roles/serviceusage.serviceUsageConsumer" >/dev/null

# Bucket: uniform access, public read, CORS for Range + Cache API, no lifecycle rules.
gcloud storage buckets describe "gs://${BUCKET}" >/dev/null 2>&1 || \
  gcloud storage buckets create "gs://${BUCKET}" --location="$REGION" --default-storage-class=STANDARD --uniform-bucket-level-access --public-access-prevention=inherited
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" --member=allUsers --role=roles/storage.objectViewer >/dev/null
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" --member="serviceAccount:${SA}" --role=roles/storage.objectAdmin >/dev/null
gcloud storage buckets update "gs://${BUCKET}" --cors-file="$(dirname "$0")/gcs-cors.json"

echo
echo "Create ONE key, paste it into Railway as GCP_SA_KEY_JSON, then delete the file:"
echo "  gcloud iam service-accounts keys create sa.json --iam-account=${SA} && base64 -i sa.json | pbcopy && rm sa.json"
echo
echo "Then in the console:"
echo "  1. IAM & Admin → Quotas → texttospeech.googleapis.com → lower 'Requests per minute for Chirp 3 voices' to ~120."
echo "  2. Billing → Budgets & alerts → \$5 budget with alerts at 20%, 100% and 100% forecast."
echo "  3. Calendar: upgrade the billing account before Free Trial day 90 or the project shuts down."
echo
echo "Railway variables:"
echo "  STORAGE_DRIVER=gcs  GCS_BUCKET=${BUCKET}  PUBLIC_AUDIO_BASE_URL=https://storage.googleapis.com/${BUCKET}  GCP_PROJECT_ID=${PROJECT_ID}  TTS_DRIVER=google"
