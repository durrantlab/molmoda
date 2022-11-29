/* eslint-disable @typescript-eslint/ban-ts-comment */

import { getAllNodesFlattened } from "@/UI/Navigation/TreeView/TreeUtils";
import { createStore, Store } from "vuex";
import { allHooks } from "@/Api/Hooks";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { setStoreIsDirty } from "./LoadAndSaveStore";
import { ILog } from "@/UI/Panels/Log/LogUtils";
import { setupExternalStoreAccess } from "./StoreExternalAccess";
import { NameValPair } from "./StoreInterfaces";

const _commonMutations = {
    /**
     * Sets a state variable.
     * 
     * @param {any}         state    The state.
     * @param {NameValPair} payload  The name and value to set.
     */
    setVar(state: any, payload: NameValPair) {
        if (payload.module) {
            state[payload.module][payload.name] = payload.val;
        } else {
            state[payload.name] = payload.val;
        }
    },

    /**
     * Adds a value to a list in the state.
     * 
     * @param {any}         state    The state.
     * @param {NameValPair} payload  The name and value to push to the list.
     */
    pushToList(state: any, payload: NameValPair) {
        if (Array.isArray(payload.val)) {
            state[payload.name].push(...payload.val);
        } else {
            state[payload.name].push(payload.val);
        }
    },

    /**
     * Adds a property (value) to an object in the state.
     * 
     * @param {any}         state    The state.
     * @param {NameValPair} payload  The name and property (value) to add.
     */
    addToObj(state: any, payload: NameValPair) {
        state[payload.name] = {
            ...state[payload.name],
            ...payload.val,
        };
    },

    /**
     * Updates the molecules in the state.
     * 
     * @param {any}             state  The state.
     * @param {IMolContainer[]} mols   The updated molecules.
     */
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
            "molecules": [] as IMolContainer[],
            "log": [] as ILog[],
            "updateZoom": true,
            "molViewer": "3dmol"
        },
        getters: {},
        mutations: {
            ..._commonMutations,

            /**
             * Clear the molecule that's the focus of the viewer.
             *
             * @param {any}     state         The state.
             * @param {boolean} [updateZoom]  Whether to also update the zoom.
             */
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
        (/* _state: any */) => {
            setStoreIsDirty(true);
        },
        { deep: true }
    );

    setupExternalStoreAccess(store);

    // For debugging
    // @ts-ignore
    window.store = store;

    return store;
}
