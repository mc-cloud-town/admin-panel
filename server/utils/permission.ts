/* eslint-disable @typescript-eslint/prefer-literal-enum-member */

/**
 * @enum Permissions
 * @description 系統權限枚舉，使用 Bitwise 方式儲存。
 *
 * 權限分為多個群組：
 * - 白名單管理
 * - 成員管理
 * - 角色管理
 * - 審核管理
 * - 日誌查詢
 * - API Token 管理
 * - Minecraft 伺服器操作
 * - WorldEdit Schematics 管理
 * - Server Replay 管理
 */
export enum Permissions {
  /* ======================
   * 白名單管理
   * ====================== */
  /** 查看白名單列表及狀態 */
  WHITELIST_VIEW = 1 << 2, // 0x00000004
  /** 管理白名單成員，新增/移除/更新 */
  WHITELIST_MEMBER_ADMIN = 1 << 3, // 0x00000008
  /** 管理白名單角色設定，指定角色可進入伺服器 */
  WHITELIST_ROLE_ADMIN = 1 << 4, // 0x00000010

  /* ======================
   * 成員管理
   * ====================== */
  /** 查看成員資料（基本資料） */
  MEMBER_VIEW = 1 << 5, // 0x00000020
  /** 編輯成員基本資料（名稱、Email 等，不含角色與狀態） */
  MEMBER_BASE_EDIT = 1 << 6, // 0x00000040
  /** 編輯成員角色（角色分配/撤銷） */
  MEMBER_ROLE_EDIT = 1 << 7, // 0x00000080
  /** 完整成員管理（含新增、刪除、角色修改、狀態變更） */
  MEMBER_ADMIN = 1 << 8, // 0x00000100

  /* ======================
   * 角色管理
   * ====================== */
  /** 查看角色列表、名稱及描述 */
  ROLE_VIEW = 1 << 9, // 0x00000200
  /** 編輯角色名稱、描述、權限 */
  ROLE_EDIT = 1 << 10, // 0x00000400
  /** 完整角色管理（新增、刪除、編輯角色） */
  ROLE_ADMIN = 1 << 11, // 0x00000800

  /* ======================
   * 審核管理
   * ====================== */
  /** 查看審核紀錄 */
  REVIEW_VIEW = 1 << 12, // 0x00001000
  /** 批准/拒絕成員申請（審核人員操作） */
  REVIEW_MEMBER_APPROVE = 1 << 13, // 0x00002000

  /* ======================
   * 日誌查詢
   * ====================== */
  /** 查看系統與操作日誌，包括成員、伺服器、API 等操作紀錄 */
  LOG_VIEW = 1 << 14, // 0x00004000

  /* ======================
   * API Token 管理
   * ====================== */
  /** 管理所有 API Token，包含別人創建的 */
  API_TOKEN_ADMIN = 1 << 15, // 0x00008000
  /** 創建與管理自己創建的 API Token */
  API_TOKEN_CREATE = 1 << 16, // 0x00010000

  /* ======================
   * Minecraft 伺服器操作
   * ====================== */
  /** 伺服器管理，新增/編輯/刪除伺服器 */
  MC_SERVER_ADMIN = 1 << 17, // 0x00020000
  /** 啟動伺服器 */
  MC_SERVER_START = 1 << 18, // 0x00040000
  /** 關閉伺服器 */
  MC_SERVER_STOP = 1 << 19, // 0x00080000
  /** 重啟伺服器（含強制重啟） */
  MC_SERVER_RESTART = 1 << 20, // 0x00100000
  /** 查看伺服器狀態 */
  MC_SERVER_STATUS_VIEW = 1 << 21, // 0x00200000
  /** 查看玩家連線紀錄（基本資料） */
  MC_SESSION_VIEW = 1 << 22, // 0x00400000
  /** 查看玩家連線紀錄（含 IP、代理等敏感資訊） */
  MC_SESSION_ADVANCED_VIEW = 1 << 23, // 0x00800000

  /* ======================
   * WorldEdit Schematics 管理
   * ====================== */
  /** 查看檔案列表與基本資訊 */
  WORLD_EDIT_SCHEMATIC_VIEW = 1 << 24, // 0x01000000
  /** 上傳新的 WorldEdit Schematics */
  WORLD_EDIT_SCHEMATIC_UPLOAD = 1 << 25, // 0x02000000
  /** 刪除 Schematics */
  WORLD_EDIT_SCHEMATIC_DELETE = 1 << 26, // 0x04000000
  /** 管理 Schematics（含查看、上傳、刪除、註解） */
  WORLD_EDIT_SCHEMATIC_ADMIN = 1 << 27, // 0x08000000

  /* ======================
   * Server Replay 管理
   * ====================== */
  /** 查看 Replay 檔案列表與基本資訊 */
  SERVER_REPLAY_VIEW = 1 << 28, // 0x10000000
  /** 上傳新的 Replay 檔案 */
  SERVER_REPLAY_UPLOAD = 1 << 29, // 0x20000000
  /** 刪除 Replay 檔案 */
  SERVER_REPLAY_DELETE = 1 << 30, // 0x40000000
  /** 管理 Replay 檔案（含查看、上傳、刪除、註解） */
  SERVER_REPLAY_ADMIN = 1 << 31, // 0x80000000
}
