/**
 * Valibot 繁體中文錯誤訊息
 * Valibot 沒有內建 locale 系統，錯誤訊息需要在每個 validation 定義時傳入
 */

export const valibotZhTW = {
  // String validations
  string: '必須是字串',
  minLength: (min: number) => `最少需要 ${min} 個字元`,
  maxLength: (max: number) => `最多只能 ${max} 個字元`,
  email: '請輸入有效的電子郵件地址',
  url: '請輸入有效的網址',
  uuid: '請輸入有效的 UUID',
  regex: '格式不正確',

  // Number validations
  number: '必須是數字',
  integer: '必須是整數',
  minValue: (min: number) => `必須大於或等於 ${min}`,
  maxValue: (max: number) => `必須小於或等於 ${max}`,

  // Date validations
  date: '必須是有效的日期',

  // IP validations
  ip: '請輸入有效的 IP 位址',
  ipv4: '請輸入有效的 IPv4 位址',
  ipv6: '請輸入有效的 IPv6 位址',

  // Boolean validations
  boolean: '必須是布林值',

  // General
  required: '此欄位為必填',
  invalid: '資料格式不正確',
} as const;

export default valibotZhTW;
