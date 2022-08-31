/* eslint-disable @typescript-eslint/ban-ts-comment */

import { getAllNodesFlattened } from "@/UI/Navigation/TreeView/TreeUtils";
import { createStore, Store } from "vuex";
import { allHooks } from "@/Api/Hooks";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { setStoreIsDirty } from "./LoadAndSaveStore";

interface NameValPair {
    name: string;
    val: any;
}

const _commonMutations = {
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
    updateMolecules(state: any, mols: IMolContainer[]) {
        // state.molecules = mols;

        // remove entries in state.molecules
        while (state.molecules.length > 0) {
            state.molecules.pop();
        }

        // Add in new items
        state.molecules.push(...mols);
    },
};

const _modules: { [key: string]: any } = {};

/**
 * Add a module to the store.
 *
 * @param  {string} moduleName The name of the module to add to the vuex store.
 * @param  {any}    vals       The state variables to include in this module.
 */
export function addVueXStoreModule(moduleName: string, vals: any) {
    _modules[moduleName] = {
        namespaced: true,
        state: vals,
        mutations: _commonMutations,
    };
}

export let store: any;

/**
 * Sets up the vuex store.
 * 
 * @returns {Store} The vuex store.
 */
export function setupVueXStore(): Store<any> {
    const storeVars = {
        state: {
            molecules: [],
            updateZoom: true,
        },
        getters: {},
        mutations: {
            ..._commonMutations,
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
        modules: _modules,
    };

    store = createStore(storeVars);

    store.watch(
        // When the returned result changes...
        function (state: any) {
            return state.molecules;
        },
        // Run this callback
        (molecules: any) => {
            // saveState(state);
            allHooks.onMoleculesChanged.forEach((func) => {
                func(molecules);
            });
        },
        { deep: true }
    );

    store.watch(
        function (state: any) {
            return state;
        },
        (_state: any) => {
            setStoreIsDirty(true);
        },
        { deep: true }
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
