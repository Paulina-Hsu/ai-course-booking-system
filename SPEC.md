# SPEC.md - AI Course Booking System v1.0

## 1. 專案目標

- 建立第一版 RWD 網頁版 AI 課程預約系統。
- 讓學員可線上瀏覽課程、選擇課程與時段並送出報名。
- 讓管理員可在後台管理課程、期別、名額、價格、報名名單與狀態。
- 以 Firebase 當作後端：Firestore + Authentication + Security Rules。

## 2. 技術棧

- Frontend: Next.js App Router
- 語言: TypeScript
- CSS: Tailwind CSS
- 後端服務: Firebase
- DB: Firestore
- 帳號: Firebase Authentication
- 部署: Vercel

## 3. 資料集合設計

### 3.1 `courses`

欄位：

- `id` (string)
- `name` (string)
- `slug` (string)
- `description` (string)
- `memberPrice` (number)
- `nonMemberPrice` (number)
- `durationMinutes` (number)  
  - 團班固定 120（2 小時）
  - 1 對 1 固定 60（1 小時）
- `sessionsCount` (number)  
  - 團班固定 4
- `maxCapacity` (number)  
  - 團班固定 18
- `timeSlots` (array<string>)  
  - 團班: `10:00-12:00` 或 `14:00-16:00`
  - 1 對 1: `08:30-09:30`
- `type` (`group` | `oneOnOne`)
- `isActive` (boolean)
- `pricePerHour` (number，可選)
- `createdAt` / `updatedAt` (timestamp string)

### 3.2 `sessions`

- `id` (string)
- `courseId` (string)
- `title` (string)
- `startDate` (string)
- `endDate` (string)
- `startTime` (string)
- `endTime` (string)
- `weekday` (number)
- `maxCapacity` (number, 預設 18)
- `enrolledCount` (number)
- `status` (`open` | `closed`)
- `createdAt` / `updatedAt` (timestamp string)

### 3.3 `bookings`

- `id` (string)
- `courseId` (string)
- `sessionId` (string, 可選)
- `oneOnOneSlotId` (string, 可選)
- `name` (string)
- `phone` (string)
- `email` (string, 可選)
- `isMember` (boolean)
- `amount` (number)
- `status` (`pending` | `confirmed` | `paid` | `cancelled` | `waitlist`)
- `note` (string, 可選)
- `createdAt` (string)

### 3.4 `oneOnOneSlots`

- `id` (string)
- `date` (string)
- `startTime` (string)
- `endTime` (string)
- `durationMinutes` (number, 60)
- `pricePerHour` (number, 1600)
- `maxCapacity` (number, 1)
- `isBooked` (boolean)
- `bookingId` (string, 可選)

### 3.5 `admins`

- `id` (string = Firebase UID)
- `email` (string)
- `role` (`admin`)
- `createdAt` (string)

### 3.6 `settings`

- `id` (`global`)
- `maxCapacityPerGroupSession` (number, 18)
- `groupLessonCount` (number, 4)
- `paymentEnabled` (boolean)
- `allowWaitlist` (boolean)
- `maintenance` (boolean)

## 4. 業務規則

1. 團班每堂 2 小時（120 分鐘）。
2. 團班時段固定 `10:00–12:00`、`14:00–16:00`。
3. 1 對 1 專屬課程時段固定 `08:30–09:30`，每堂 1 小時。
4. 團班每期固定 4 堂，連續 4 週。
5. 每期每班最高 18 人。
6. 支援會員價與非會員價，未登入判斷以表單開關為準（第一版）。
7. 不串接金流（第一版）。
8. 新報名預設狀態為 `pending`（待確認）。
9. 管理員可修改報名狀態：`pending`、`confirmed`、`paid`、`cancelled`、`waitlist`。
10. 同一手機號碼不能重複報名同一期課程（資料層/函式保護，草案待後續加上 Transaction 實作）。
11. 後台可匯出 CSV（第一版先提供 API/邏輯草案）。

## 5. 頁面規格（第一階段）

### 5.1 前台

- `/` 首頁：品牌簡介、課程導覽、快速報名入口。
- `/courses` 課程列表：顯示所有課程與價格（會員/非會員）、時段與按鈕。
- `/courses/[courseId]` 課程詳情：課程資料、期別清單、可報名課表。
- `/courses/[courseId]/booking` 報名表單：姓名、手機、Email、是否會員、時段，提交後顯示成功頁。
- `/booking-success` 報名成功頁：回顯資料摘要。

### 5.2 後台

- `/admin/login` 管理員登入頁：Email/Password。
- `/admin/dashboard` 管理總覽：課程數、期別數、報名筆數統計。
- `/admin/courses` 課程管理：建立/編輯/下架（第一版 UI 草圖）。
- `/admin/sessions` 期別管理：顯示期別列表與名額。
- `/admin/one-on-one` 1 對 1 預約管理：列出時段與預約狀態。
- `/admin/bookings` 報名管理：顯示報名單、狀態變更、可匯出 CSV（草稿按鈕）。

## 6. 安全性

- Firestore rules 先以最小權限設計：
  - 課程、班次、1對1時段對公眾可讀，管理員可寫。
  - `bookings` 需在規則允許下僅限管理員更新狀態，但建立可供前台提交。
  - `admins` 僅管理員可寫。
- Firebase key 全部透過環境變數管理。

## 7. 第一階段限制（已規劃）

- 尚未導入支付流程。
- 尚未實作候補自動轉候補邏輯（資料欄位留好）。
- 同號碼同一期重複檢查以文件型規則草稿為主，正式版以 Function/Transaction 補強。
- 管理員行為（角色驗證）依 2 種模式：UI 權限與 rules 保底。
