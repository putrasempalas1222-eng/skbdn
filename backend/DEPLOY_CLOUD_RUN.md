# Deploy Backend SKBDN ke Cloud Run

Service Cloud Run memakai nama teknis lowercase:

```bash
akses-skbdn
```

> Cloud Run tidak menerima nama service uppercase, jadi `AKSES-SKBDN` dipakai sebagai nama tampilan/konsep, sedangkan service ID-nya `akses-skbdn`.

## 1. Install dan login gcloud

Install Google Cloud CLI, lalu login:

```bash
gcloud auth login
gcloud config set project play-integrity-2adpr7x4a8xhyex
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

Region yang disarankan untuk Indonesia:

```bash
asia-southeast2
```

## 2. Siapkan env Cloud Run

Backend butuh env berikut di Cloud Run:

```text
FIREBASE_DATABASE_URL
FIREBASE_SERVICE_ACCOUNT_JSON
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
SMTP_SECURE
CORS_ORIGINS
GOOGLE_CLOUD_PROJECT
GOOGLE_CLOUD_LOCATION
PROXY_HEADER
```

Untuk `FIREBASE_SERVICE_ACCOUNT_JSON`, isi dengan JSON service account Firebase Admin dalam satu baris. Jangan masukkan file JSON ke Docker image.

## 3. Deploy dari folder backend

Jalankan dari folder `skbdn/backend`:

```bash
gcloud run deploy akses-skbdn ^
  --source . ^
  --region asia-southeast2 ^
  --allow-unauthenticated ^
  --set-env-vars FIREBASE_DATABASE_URL="https://play-integrity-2adpr7x4a8xhyex-default-rtdb.firebaseio.com",CORS_ORIGINS="https://skbdn.vercel.app,http://localhost:5173,http://127.0.0.1:5173",GOOGLE_CLOUD_PROJECT="play-integrity-2adpr7x4a8xhyex",GOOGLE_CLOUD_LOCATION="global"
```

Tambahkan env SMTP dan Firebase Admin lewat Cloud Run Console agar tidak menempel di terminal history:

Cloud Run -> `akses-skbdn` -> Edit & deploy new revision -> Variables & Secrets.

## 4. Cek backend

Setelah deploy, buka:

```text
https://URL-CLOUD-RUN/healthz
```

Response sukses:

```json
{
  "ok": true,
  "service": "AKSES-SKBDN"
}
```

## 5. Arahkan frontend ke Cloud Run

Di Vercel frontend, tambahkan environment variable:

```text
VITE_API_BASE_URL=https://URL-CLOUD-RUN
```

Lalu redeploy frontend.

