// All calls to the api should go through here. Actual code can be associated
// with appropriate files.

import { menuApi } from "./menus";
import { sysApi } from "./sys";
import { viewerApi } from "./viewer";

export const menus = menuApi;
export const sys = sysApi;
export const viewer = viewerApi;