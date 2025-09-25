import { zhTW } from 'zod/locales';
import type { $ZodConfig } from 'zod/v4/core';

// export const zh_TW: $ZodConfig = {
//   customError: (ies) => {},
//   ...zhTW(),
// };
export const zh_TW: $ZodConfig = zhTW();

export default zh_TW;
