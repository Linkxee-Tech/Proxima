import { NAVIGATION } from '../../../packages/contracts/src/index.ts';

export const mobileScreens = NAVIGATION.map((item) => ({ name: item.label.replace(/\s+/g, ''), path: item.route }));
export function hasMobileScreen(path: string): boolean { return mobileScreens.some((screen) => screen.path === path); }
