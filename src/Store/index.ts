/* eslint-disable @typescript-eslint/ban-ts-comment */

import { getAllNodesFlattened } from "@/UI/Navigation/TreeView/TreeUtils";
import { createStore } from "vuex";

interface NameValPair {
    name: string;
    val: any;
}

const commonMutations = {
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
            ...payload.val,
        };
    },
};

const modules: { [key: string]: any } = {};
export function addVueXStoreModule(moduleName: string, vals: any): void {
    modules[moduleName] = {
        namespaced: true,
        state: vals,
        mutations: commonMutations,
    };
}

export let store: any;
export function setupVueXStore() {
    const storeVars = {
        state: {
            molecules: [],
            updateZoom: true,
        },
        getters: {},
        mutations: {
            ...commonMutations,
            clearFocusedMolecule(state: any, updateZoom = true) {
                if (!updateZoom) {
                    state["updateZoom"] = false;
                }
                for (const node of getAllNodesFlattened(state["molecules"])) {
                    node.focused = false;
                }
                // Revert updateZoom after rerender
                if (!updateZoom) {
                    setTimeout(() => {
                        state["updateZoom"] = true;
                    }, 0);
                }
            },
        },
        actions: {},
        modules: modules,
    };

    store = createStore(storeVars);

    store.watch(
        // When the returned result changes...
        function (state: any) {
            return state;
        },
        // Run this callback
        (state: any) => {
            console.log("something changed somewhere in the state!");
        },
        {"deep": true}
    );

    // For debugging
    // @ts-ignore
    window.store = store;

    return store;
}

// export function setVar(name: string, value: any) {
//   // @ts-ignore
//     store.state[name] = value;
// }
