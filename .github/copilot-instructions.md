# Copilot Instructions for CloudTown Admin Panel

## 架構與分層

- Nuxt 4 + TypeScript 全端專案，分層明確：
  - `app/`：前端頁面、元件、i18n、middleware、佈局
  - `server/`：API（Nuxt server routes）、資料庫 schema/migration、伺服器邏輯
  - `shared/`：型別、API 契約、語系共用
  - `public/`：靜態資源
  - `tests/`：Vitest 單元/基準測試

## 關鍵開發流程

- 安裝依賴：`yarn install`
- 啟動開發：`yarn dev`
- 打包正式：`yarn build`
- 資料庫遷移：`yarn db:migrate`（Drizzle ORM）
- 單元測試：`yarn test`，基準測試：`yarn test:bench`，覆蓋率：`yarn coverage`

## 專案慣例

- API 路由檔案命名如 `index.get.ts`、`index.post.ts`，自動對應 HTTP method
- 共用型別、API 契約集中於 `shared/contracts/`，前後端直接 import
- 資料庫表、enum 皆以 `export const` 於 `server/database/schema/` 定義，集中 re-export 於 `index.ts`
- 權限 enum、驗證邏輯於 `server/utils/permission.ts`，middleware 驗證於 `app/middleware/auth.global.ts`
- 測試檔案以 `.test.ts`、基準測試以 `.bench.ts` 結尾，測試工具於 `tests/utils/`

## 整合與跨層溝通

- 前端呼叫 API 皆用 Nuxt useFetch/useAsyncData，型別來自 `shared/contracts/`
- 權限控管與登入狀態由 middleware 與 server/utils 雙層驗證
- Email、Discord 等外部服務整合於 `server/utils/email.ts`、`server/utils/discord/`

## 其他注意事項

- 請遵循現有目錄結構與命名規則，新增 API 請同步更新型別於 `shared/contracts/`
- 重要設定檔：`nuxt.config.ts`、`drizzle.config.ts`、`vitest.config.ts`
- 新增資料表請於 `server/database/schema/` 定義並執行遷移

---

如有疑問，請參考目錄範例或詢問專案維護者。
