# AI Course Booking System (MVP)

這是一套第一版 **AI 課程預約系統**，使用 Next.js + TypeScript + Tailwind CSS + Firebase。

## 功能（第一階段）

- 前台
  - 首頁
  - 課程列表頁
  - 課程詳情頁
  - 報名表單頁
  - 報名成功頁
- 後台
  - 管理員登入
  - Dashboard
  - 課程管理
  - 期別管理
  - 1 對 1 預約管理
  - 報名管理
- Firebase
  - Firestore 型別定義
  - Firebase config 檔案（環境變數）
  - Firestore Security Rules 草稿
  - Seed script 草稿（可用於初始化測試資料）
- Vercel
  - `vercel.json` 建置設定

## 專案目錄

```
ai-course-booking-system
├─ src
│  ├─ app
│  │  ├─ admin
│  │  │  ├─ login
│  │  │  ├─ dashboard
│  │  │  ├─ courses
│  │  │  ├─ sessions
│  │  │  ├─ one-on-one
│  │  │  └─ bookings
│  │  ├─ booking-success
│  │  ├─ courses
│  │  │  └─ [courseId]
│  │  └─ ...
│  ├─ components
│  │  └─ SiteHeader.tsx
│  ├─ data
│  │  └─ courses.ts
│  ├─ lib
│  │  ├─ firestoreTypes.ts
│  │  └─ firebase.ts
├─ scripts
│  └─ seed.ts
├─ firestore.rules
├─ .env.local.example
├─ vercel.json
└─ SPEC.md
```

## 1) 安裝

```bash
cd C:\My GitHub\ai-course-booking-system
npm install
```

## 2) 啟動本機開發

```bash
npm run dev
```

瀏覽器開啟 [http://localhost:3000](http://localhost:3000)

## 3) 填寫 Firebase env

在專案根目錄新增 `.env.local`，可參考 `.env.local.example`：

```bash
cp .env.local.example .env.local
```

並填入：

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON`（JSON 字串）

> 這些值請從 Firebase Console 取得；不要把金鑰直接寫死在程式碼中。

## 4) 執行 seed

```bash
npm run seed
```

`scripts/seed.ts` 會讀取環境變數 `FIREBASE_SERVICE_ACCOUNT_JSON` 或
`GOOGLE_APPLICATION_CREDENTIALS`。

## 5) 部署到 Vercel

```bash
npm run build
```

然後在 Vercel 上建立專案（New Project），匯入 GitHub Repository 後直接 Deploy。

## 6) 設定 Vercel Environment Variables

在 Vercel Project Settings → Environment Variables，加入與 `.env.local.example` 相同的 `NEXT_PUBLIC_*` 值。

## 7) 建立 Firebase Authentication 管理員

1. 打開 Firebase Console → Authentication → Users。
2. 建立管理員帳號（Email/Password）。
3. 登入 Firebase Console Firestore → Rules，將該使用者 UID 記到 `admins/{uid}`。
4. 後台登入頁使用同一組憑證登入。

## 8) 部署 Firestore rules

```bash
firebase deploy --only firestore:rules
```

若有 Firestore Database 尚未建立，先建立再部署規則。

## 常用指令

```bash
npm run dev       # 本機開發
npm run build     # 建置測試
npm run start     # 啟動 production 模式
npm run lint      # ESLint
npm run seed      # Seed 模擬資料
```

## 注意事項

- 這個版本是第一版 MVP，尚未接上正式金流。
- 報名資料流程與管理操作的 Firebase 寫入邏輯為後續里程碑主軸。
- 現階段 `seed` 僅為草稿腳本，請依你的 Firebase 權限與環境變數完成實際導入。
