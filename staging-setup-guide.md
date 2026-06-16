# Hướng dẫn: Tách môi trường Staging/Production trên Cloudflare Workers

## Tổng quan

Mục tiêu: Push lên branch nào → tự động deploy đúng domain đó.

> **Lưu ý quan trọng:** Dùng file `wrangler.toml` (không phải `wrangler.jsonc`) vì Wrangler 3.x chỉ đọc environments từ `.toml`.

| Branch | Domain |
|--------|--------|
| `main` | `everything.rellia.org` |
| `staging` | `everything-staging.rellia.org` |

---

## PHẦN 1 – Làm 1 lần duy nhất (Setup ban đầu)

### Bước 1 – Lấy Cloudflare API Token

1. Vào [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Mục **API token templates** → tìm **"Edit Cloudflare Workers"** → click **"Use template"**
3. Đặt tên token (ví dụ: `github-actions-deploy`)
4. Kéo xuống → **"Continue to summary"** → **"Create Token"**
5. **Copy token ngay** – chỉ hiện 1 lần!

> ⚠️ Nếu sau này cần deploy domain tự động (custom_domain), cần thêm quyền:
> Vào **Edit token** → thêm: `Zone → DNS → Edit` và `Zone → Zone → Read`

---

### Bước 2 – Lấy Cloudflare Account ID

1. Vào [dash.cloudflare.com](https://dash.cloudflare.com) (trang chủ)
2. Nhìn vào **sidebar phải** → mục **Account ID** → copy

---

### Bước 3 – Thêm 2 Secrets vào GitHub

1. Vào GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"** → thêm lần lượt:

| Name | Value |
|------|-------|
| `CLOUDFLARE_API_TOKEN` | Token vừa copy ở Bước 1 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID vừa copy ở Bước 2 |

---

### Bước 4 – Tạo file GitHub Actions

Tạo file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches:
      - main
      - staging

jobs:
  deploy-production:
    name: Deploy → Production (everything.rellia.org)
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Production
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  deploy-staging:
    name: Deploy → Staging (everything-staging.rellia.org)
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Staging
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env staging
```

---

### Bước 5 – Tạo file `wrangler.toml`

> ⚠️ Dùng `wrangler.toml` (không phải `wrangler.jsonc`) – Wrangler 3.x không đọc được `env` từ `.jsonc`.
> Nếu đang có `wrangler.jsonc`, xóa nó đi trước: `Remove-Item wrangler.jsonc`

Tạo file `wrangler.toml`:

```toml
name = "apieverything"
main = "worker.js"
compatibility_date = "2026-06-10"
compatibility_flags = ["nodejs_compat"]

[observability]
enabled = true

[assets]
directory = "."
binding = "ASSETS"

[vars]
SUPABASE_URL = "https://kavodsarpdvzmaqrkunv.supabase.co"

[env.staging]
name = "apieverything-staging"

[env.staging.vars]
SUPABASE_URL = "https://kavodsarpdvzmaqrkunv.supabase.co"
```

---

### Bước 6 – Deploy thủ công lần đầu (tạo worker staging)

```powershell
npx wrangler deploy --env staging
```

> Bước này tạo ra worker `apieverything-staging` trên Cloudflare.
> Chỉ cần làm 1 lần, sau đó GitHub Actions sẽ tự deploy.

---

### Bước 7 – Gắn domain vào staging worker

> ⚠️ Nếu lệnh deploy báo lỗi domain (Error 522 hoặc domain conflict):

1. Vào **Cloudflare → rellia.org → DNS**
2. Tìm và **xóa** CNAME record của `everything-staging` (nếu có)
3. Vào **Workers & Pages → `apieverything-staging` → Domains**
4. Click **"+ Add Domain"** → nhập `everything-staging.rellia.org` → Confirm

---

### Bước 8 – Add secrets cho staging worker

```powershell
npx wrangler secret put SUPABASE_KEY --env staging
npx wrangler secret put AQICN_TOKEN --env staging
npx wrangler secret put GOLD_API_KEY --env staging
npx wrangler secret put OWM_API_KEY --env staging
```

> Mỗi lệnh sẽ hỏi bạn nhập giá trị. Lấy key ở đâu:
> - `GOLD_API_KEY` → [goldapi.io/dashboard](https://www.goldapi.io/dashboard)
> - `OWM_API_KEY` → [home.openweathermap.org/api_keys](https://home.openweathermap.org/api_keys)
> - `AQICN_TOKEN` → [aqicn.org/data-platform/token](https://aqicn.org/data-platform/token/)

---

### Bước 9 – Push code lên GitHub

```powershell
# Push lên main trước
git add .
git commit -m "chore: add staging environment and deploy workflow"
git push origin main

# Sau đó merge sang staging và push
git checkout staging
git merge main
git push origin staging
```

---

## PHẦN 2 – Thêm branch mới (lặp lại mỗi khi cần)

Ví dụ thêm branch `dev` → domain `everything-dev.rellia.org`:

### B1. Thêm vào `wrangler.toml`

```toml
# Giữ nguyên phần staging, thêm env mới bên dưới:

[env.dev]
name = "apieverything-dev"

[env.dev.vars]
SUPABASE_URL = "https://kavodsarpdvzmaqrkunv.supabase.co"
```

### B2. Thêm vào `deploy.yml`

```yaml
on:
  push:
    branches:
      - main
      - staging
      - dev        # ← thêm dòng này

jobs:
  # ... giữ nguyên các job cũ ...

  deploy-dev:       # ← thêm job mới
    name: Deploy → Dev (everything-dev.rellia.org)
    if: github.ref == 'refs/heads/dev'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Dev
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env dev
```

### B3. Deploy thủ công lần đầu

```powershell
npx wrangler deploy --env dev
```

### B4. Gắn domain (nếu lỗi conflict DNS)

Cloudflare → Workers & Pages → `apieverything-dev` → Domains → Add Domain

### B5. Add secrets

```powershell
npx wrangler secret put SUPABASE_KEY --env dev
npx wrangler secret put AQICN_TOKEN --env dev
npx wrangler secret put GOLD_API_KEY --env dev
npx wrangler secret put OWM_API_KEY --env dev
```

### B6. Push code

```powershell
git add .
git commit -m "chore: add dev environment"
git push origin main

git checkout dev
git merge main
git push origin dev
```

---

## Tóm tắt nhanh

| Việc | Tần suất |
|------|----------|
| Tạo Cloudflare API Token | 1 lần |
| Thêm GitHub Secrets (CF_TOKEN, CF_ACCOUNT_ID) | 1 lần |
| Thêm env vào `wrangler.jsonc` | Mỗi branch mới |
| Thêm job vào `deploy.yml` | Mỗi branch mới |
| `wrangler deploy --env xxx` | Mỗi branch mới (lần đầu) |
| Gắn domain trên Cloudflare dashboard | Mỗi branch mới |
| Add secrets worker | Mỗi branch mới |
