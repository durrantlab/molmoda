/* eslint-disable */

import 'mutationobserver-shim'
import { createApp } from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import { setupVueXStore } from './Store'
import * as api from './Api';
import { addMenuItem, MenuItemType } from './UI/Menu/Menu'
import { loadFontAwesomeFonts } from './UI/FontAwesome'

// import { test } from './test_parser'

api.sys.loadStatus.started(true);

loadFontAwesomeFonts();

api.sys.loadStatus.pluginsLoaded(true);

addMenuItem(
    {text: "hi", type: MenuItemType.ACTION, function: () => {console.log("moo")}},
    "moose"
);
addMenuItem(
    {text: "hi2", type: MenuItemType.ACTION, function: () => {console.log("moo")}},
    "moose"
);
addMenuItem(
    {text: "hi3", type: MenuItemType.ACTION, function: () => {console.log("moo")}},
    "moose", "moose2"
);
addMenuItem(
    {text: "hi5", type: MenuItemType.ACTION, function: () => {console.log("moo")}},
    "moose", "moose2", "moose3"
);
addMenuItem(
    {text: "hi4", type: MenuItemType.ACTION, function: () => {console.log("moo")}},
    "moose", "moose2"
);
addMenuItem(
    {text: "hi6", type: MenuItemType.ACTION, function: () => {console.log("moo")}},
    "moose"
);

api.sys.loadStatus.menuFinalized(true);

let store = setupVueXStore();
createApp(App).use(store).mount('#app');

// loadMolecularModelFromText("molText", "mol2");

// const worker = new Worker(new URL('./worker', import.meta.url));
// runWorker(
//     worker, 
//     'The Answer to the Ultimate Question of Life, The Universe, and Everything.'
// ).then(resp => {
//     debugger
// });

// test();