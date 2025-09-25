# CloudTown Admin Panel

一個基於 Nuxt 4、TypeScript、Drizzle ORM 的現代化管理後台，支援多語系、權限控管、伺服器管理、會員審核等功能。

## 專案目標

- 提供安全、現代化的伺服器與會員管理後台
- 支援多語系、細緻權限控管、審核與審計流程
- 整合 Discord、Email 等外部服務，提升自動化與協作效率
- 方便擴充、易於維護，適合社群型 Minecraft 伺服器或類似應用

## 主要功能

- 會員註冊、審核、登入、登出
- 權限與角色管理（多層級）
- 伺服器狀態監控、代理、白名單管理
- 操作日誌、審核日誌查詢
- API 金鑰、Email、整合設定
- 多語系（繁中、簡中、英文）

## TODO List

- [ ] 會員審核流程優化
- [ ] 伺服器狀態即時推播
- [ ] Discord bot 事件通知整合
- [ ] 操作日誌搜尋與篩選強化
- [ ] API 金鑰權限細分
- [ ] 前端 UI/UX 優化與行動裝置支援
- [ ] 自動化測試覆蓋率提升

## 技術棧

- Nuxt 4 (Vue 3)
- TypeScript
- Drizzle ORM
- Vitest (單元/基準測試)
- ESLint

## 安裝與啟動

```bash
yarn install
yarn dev
```

## 打包正式

```bash
yarn build
```

## 資料庫遷移

```bash
yarn db:migrate
```

## 測試

單元測試：

```bash
yarn test
```

基準測試：

```bash
yarn test:bench
```

覆蓋率：

```bash
yarn coverage
```

## 專案結構

- `app/`：前端頁面、元件、i18n、middleware、佈局
- `server/`：API 路由、資料庫 schema/migration、伺服器邏輯
- `shared/`：型別、API 契約、語系共用
- `public/`：靜態資源
- `tests/`：Vitest 測試

## 重要慣例

- API 路由檔案即路由，型別集中於 `shared/contracts/`
- 資料庫 schema 於 `server/database/schema/`，遷移於 `server/database/migrations/`
- 權限控管於 `app/middleware/auth.global.ts`、`server/utils/permission.ts`

## 授權

GPL-3.0 license
