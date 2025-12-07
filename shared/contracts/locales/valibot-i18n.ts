import valibotZhTW from './zh_TW';

export function getErrorMessage(
  key: keyof typeof valibotZhTW,
  ...args: number[]
): string {
  const message = valibotZhTW[key];
  if (typeof message === 'function') {
    return (message as (...args: number[]) => string)(...args);
  }
  return message;
}

/**
 * 使用 i18n 的 valibot schema 輔助函數
 */
export const v = {
  // String validations with i18n
  string: (message?: string) => message || getErrorMessage('string'),
  minLength: (min: number, message?: string) =>
    message || getErrorMessage('minLength', min),
  maxLength: (max: number, message?: string) =>
    message || getErrorMessage('maxLength', max),
  email: (message?: string) => message || getErrorMessage('email'),
  url: (message?: string) => message || getErrorMessage('url'),
  uuid: (message?: string) => message || getErrorMessage('uuid'),
  regex: (message?: string) => message || getErrorMessage('regex'),

  // Number validations with i18n
  number: (message?: string) => message || getErrorMessage('number'),
  integer: (message?: string) => message || getErrorMessage('integer'),
  minValue: (min: number, message?: string) =>
    message || getErrorMessage('minValue', min),
  maxValue: (max: number, message?: string) =>
    message || getErrorMessage('maxValue', max),

  // IP validations with i18n
  ip: (message?: string) => message || getErrorMessage('ip'),
  ipv4: (message?: string) => message || getErrorMessage('ipv4'),
  ipv6: (message?: string) => message || getErrorMessage('ipv6'),

  // General
  required: (message?: string) => message || getErrorMessage('required'),
};

export default v;
