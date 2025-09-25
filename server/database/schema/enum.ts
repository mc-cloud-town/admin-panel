import { pgEnum } from 'drizzle-orm/pg-core';
// export const MemberStatusEnum = pgEnum('member_status_enum', [
//   'FORM_SUBMITTED', // 表單已提交
//   'FORM_APPROVED', // 一審通過
//   'SECOND_REVIEW_SCHEDULED', // 二審安排中（語音審核）
//   'SECOND_REVIEW_PASSED', // 二審通過（語音 + 導覽）
//   'GAME_REVIEWING', // 遊戲內審核中
//   'OFFICIAL_MEMBER', // 正式成員
//   'VISITOR', // 參訪身份
// ]);

// Minecraft 伺服器狀態
export const MinecraftServerStatusEnum = pgEnum('minecraft_server_status', [
  'STARTING',
  'RUNNING',
  'STOPPING',
  'STOPPED',
]);

// 活動狀態
export const EventStatusEnum = pgEnum('event_status_enum', [
  'ACTIVE',
  'INACTIVE',
  'COMPLETED',
]);
