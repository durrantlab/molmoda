// All calls to the api should go through here. Actual code can be associated
// with appropriate files.

// import { menuApi } from "./Menus";
// import { sysApi } from "./Sys";
import { visualizationApi } from "./Visualization";
import { hooksApi } from "./Hooks";
import { fsApi } from "./FS";
import { pluginsApi } from "./Plugins";
import { messagesApi } from "./Messages";

// export const menus = menuApi;
// export const sys = sysApi;
export const visualization = visualizationApi;
export const hooks = hooksApi;
export const fs = fsApi;
export const plugins = pluginsApi;
export const messages = messagesApi;