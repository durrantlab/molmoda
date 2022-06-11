/* eslint-disable */

import { createStore } from "vuex";

interface NameValPair {
    name: string;
    val: any;
}

let modules: { [key: string]: any } = {};
export function addVueXStoreModule(moduleName: string, vals: any): void {
    modules[moduleName] = {
        namespaced: true,
        state: vals,
        mutations: {
            setVar(state: any, payload: NameValPair) {
                state[payload.name] = payload.val;
            },
        },
    };
}

export var store: any;
export function setupVueXStore() {
    console.log("store");
    let storeVars = {
        state: {
            // menuData: {},
        },
        getters: {},
        mutations: {},
        actions: {},
        modules: modules,
    };

    console.log(storeVars);

    store = createStore(storeVars);

    // For debugging
    // @ts-ignore
    window.store = store;

    return store;
}

// export function setVar(name: string, value: any) {
//   // @ts-ignore
//     store.state[name] = value;
// }
