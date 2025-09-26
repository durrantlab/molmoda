// All calls to the api should go through here. You can associated the actual
// code can with the appropriate files.

// import { menuApi } from "./Menus";
// import { sysApi } from "./Sys";
import { visualizationApi } from "./Visualization";
import { hooksApi } from "./Hooks";
import { fsApi } from "./FS";
import { pluginsApi } from "./Plugins";
import { messagesApi } from "./Messages";
import { layoutApi } from "./Layout";
import { tourApi } from "./Tour";

// export const menus = menuApi;
// export const sys = sysApi;
export const visualization = visualizationApi;
export const hooks = hooksApi;
export const fs = fsApi;
export const plugins = pluginsApi;
export const messages = messagesApi;
export const layout = layoutApi;
export const tour = tourApi;