# Environment Variables Vercel

Untuk OTP email:

```text
SMTP_USER=putrasempalas1222@gmail.com
SMTP_PASS=app-password-gmail-16-digit
```

Untuk hapus Buyer dari Firebase Auth + Database, pilih salah satu cara.

## Cara Paling Aman: Base64 Service Account

Encode isi file service account JSON menjadi base64, lalu pasang:

```text
FIREBASE_SERVICE_ACCOUNT_BASE64=hasil_base64_json
FIREBASE_DATABASE_URL=https://play-integrity-2adpr7x4a8xhyex-default-rtdb.firebaseio.com
```

Di PowerShell:

```powershell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Content -Raw "C:\3D POSTER\skbdn\backend\play-integrity-2adpr7x4a8xhyex-firebase-adminsdk-fbsvc-97f87b6629.json")))
```

## Cara Alternatif: JSON Langsung

```text
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
FIREBASE_DATABASE_URL=https://play-integrity-2adpr7x4a8xhyex-default-rtdb.firebaseio.com
```

Setelah mengubah env di Vercel, wajib redeploy project.

## Kalau Masih Muncul Pesan Lama

Jika browser masih menampilkan:

```text
Set FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_DATABASE_URL in Vercel Environment Variables.
```

artinya deployment Vercel masih memakai kode lama. Jalankan redeploy dari dashboard Vercel:

```text
Deployments -> pilih deployment terbaru -> Redeploy
```

Pastikan environment variable dipasang untuk scope `Production`.

## Penting

Jika private key service account pernah terlihat di chat, generate key baru di Firebase Console:

```text
Firebase Console -> Project Settings -> Service accounts -> Generate new private key
```

Lalu hapus key lama di Google Cloud IAM.
