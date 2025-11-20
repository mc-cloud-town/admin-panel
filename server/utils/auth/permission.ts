/**
 * 檢查是否擁有指定的權限
 * @param permissions 目前擁有的權限
 * @param requiredPermissions 需要的權限, 若為陣列則表示其中一項即可，若為數字則表示必須擁有該權限
 * @returns
 */
export const hasPermission = (
  permissions: number,
  requiredPermissions: number | number[]
) => {
  if (Array.isArray(requiredPermissions)) {
    return requiredPermissions.some((perm) => (permissions & perm) === perm);
  }

  return (permissions & requiredPermissions) === requiredPermissions;
};
