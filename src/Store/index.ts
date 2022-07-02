/* eslint-disable */

import { getAllNodesFlattened } from "@/UI/Navigation/TreeView/TreeUtils";
import { Vue } from "vue-class-component";
import { createStore } from "vuex";

interface NameValPair {
    name: string;
    val: any;
}

let commonMutations = {
    setVar(state: any, payload: NameValPair) {
        state[payload.name] = payload.val;
    },
    pushToList(state: any, payload: NameValPair) {
        if (Array.isArray(payload.val)) {
            state[payload.name].push(...payload.val);
        } else {
            state[payload.name].push(payload.val);
        }
    },
    addToObj(state: any, payload: NameValPair) {
        state[payload.name] = {
            ...state[payload.name],
            ...payload.val
        };
    }
}

let modules: { [key: string]: any } = {};
export function addVueXStoreModule(moduleName: string, vals: any): void {
    modules[moduleName] = {
        namespaced: true,
        state: vals,
        mutations: commonMutations
    };
}

export var store: any;
export function setupVueXStore() {
    let storeVars = {
        state: {
            "molecules": [],
            "updateZoom": true
        },
        getters: {},
        mutations: {
            ...commonMutations,
            clearFocusedMolecule(state: any, updateZoom = true) {
                if (!updateZoom) { state["updateZoom"] = false; }
                for (let node of getAllNodesFlattened(state["molecules"])) {
                    node.focused = false;
                }
                // Revert updateZoom after rerender
                if (!updateZoom) { 
                    setTimeout(() => { state["updateZoom"] = true; }, 0);
                }
            }
        },
        actions: {},
        modules: modules,
    };

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
