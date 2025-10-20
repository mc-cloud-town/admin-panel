export const safeConversionToNumber = (
  value: string | number | undefined,
  defaultValue = 0
): number => {
  if (value === undefined) return defaultValue;

  const numberValue = typeof value === 'number' ? value : parseInt(value, 10);

  return isNaN(numberValue) ? defaultValue : numberValue;
};
