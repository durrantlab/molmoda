/* eslint-disable @typescript-eslint/ban-ts-comment */

import { createStore, Store } from "vuex";
import { allHooks } from "@/Api/Hooks";
import { setStoreIsDirty } from "./LoadAndSaveStore";
import { ILog } from "@/UI/Panels/Log/LogUtils";
import { setupExternalStoreAccess } from "./StoreExternalAccess";
import { NameValPair } from "./StoreInterfaces";
import type { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import type { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { newTreeNodeList } from "@/TreeNodes/TreeNodeMakers";

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
        // If payload.val is an instance of TreeNodeList, then we need to
        // use pushToMolecules instead.
        if (payload.val.nodes) {
            // It's TreeNodeList
            (this as any).commit("pushToMolecules", payload.val);
            return;
        }

        if (Array.isArray(payload.val)) {
            state[payload.name].push(...payload.val);
        } else {
            state[payload.name].push(payload.val);
        }
    },

    /**
     * Adds a value to a list in the state.
     *
     * @param {any}          state  The state.
     * @param {TreeNodeList} mols   The name and value to push to the list.
     */
    pushToMolecules(state: any, mols: TreeNodeList | TreeNode) {
        // @ts-ignore
        if (mols.title) {
            // It's a tree node
            (state.molecules as TreeNodeList).push(mols as TreeNode);
        } else {
            // It's TreeNodeList

            (state.molecules as TreeNodeList).extend(mols as TreeNodeList);
        }

        // Since it's an object, need to trigger reactivity. TODO: No way to do
        // this via deep?
        state.molecules = (state.molecules as TreeNodeList).copy.shallow;
    },

    /**
     * Adds a property (value) to an object in the state.
     *
     * @param {any}         state    The state.
     * @param {NameValPair} payload  The name and property (value) to add.
     */
    // addToObj(state: any, payload: NameValPair) {
    //     state[payload.name] = {
    //         ...state[payload.name],
    //         ...payload.val,
    //     };
    // },

    /**
     * Updates the molecules in the state.
     *
     * @param {any}             state  The state.
     * @param {TreeNodeList} mols   The updated molecules.
     */
    updateMolecules(state: any, mols: TreeNodeList) {
        // state.molecules = mols;

        // remove entries in state.molecules
        while (state.molecules.length > 0) {
            state.molecules.pop();
        }

        // Add in new items
        state.molecules.extend(mols);
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
            molecules: newTreeNodeList([
                // {
                //     title: "Shape group",
                //     id: "test",
                //     treeExpanded: true,
                //     visible: true,
                //     selected: SelectedType.False,
                //     focused: true,
                //     viewerDirty: true,
                //     nodes: [
                //         {
                //             title: "Shapes",
                //             id: "regions",
                //             parentId: "test",
                //             treeExpanded: true,
                //             visible: true,
                //             selected: SelectedType.False,
                //             focused: true,
                //             viewerDirty: true,
                //             nodes: [
                //                 {
                //                     title: "Shapes2",
                //                     id: "shapes2",
                //                     parentId: "regions",
                //                     treeExpanded: true,
                //                     visible: true,
                //                     selected: SelectedType.False,
                //                     focused: true,
                //                     viewerDirty: true,
                //                     shape: {
                //                         type: ShapeType.Sphere,
                //                         id: "My shape",
                //                         center: [0, 0, 0],
                //                         radius: 10,
                //                         opacity: 0.2,
                //                         movable: true
                //                     } as ISphere,
                //                 },
                //                 {
                //                     title: "Shapes3",
                //                     id: "shapes3",
                //                     parentId: "regions",
                //                     treeExpanded: true,
                //                     visible: true,
                //                     selected: SelectedType.False,
                //                     focused: true,
                //                     viewerDirty: true,
                //                     shape: {
                //                         type: ShapeType.Box,
                //                         center: [0, 0, 0],
                //                         dimensions: [30, 10, 10],
                //                         color: "green",
                //                         opacity: 0.5,
                //                         movable: true
                //                     } as IBox,
                //                 },
                //                 {
                //                     title: "Shapes4",
                //                     id: "shapes4",
                //                     parentId: "regions",
                //                     treeExpanded: true,
                //                     visible: true,
                //                     selected: SelectedType.False,
                //                     focused: true,
                //                     viewerDirty: true,
                //                     shape: {
                //                         type: ShapeType.Arrow,
                //                         center: [0, 5, 0],
                //                         endPt: [10, 10, 10],
                //                         color: "green",
                //                         opacity: 0.5,
                //                         movable: false
                //                     } as IArrow,
                //                 },
                //                 {
                //                     title: "Shapes5",
                //                     id: "shapes5",
                //                     parentId: "regions",
                //                     treeExpanded: true,
                //                     visible: true,
                //                     selected: SelectedType.False,
                //                     focused: true,
                //                     viewerDirty: true,
                //                     shape: {
                //                         type: ShapeType.Cylinder,
                //                         center: [5, 0, 0],
                //                         endPt: [-10, 10, 10],
                //                         color: "green",
                //                         opacity: 0.5,
                //                         movable: false
                //                     } as ICylinder,
                //                 },
                //             ],
                //         },
                //     ],
                // },
            ]),
            log: [] as ILog[],
            updateZoom: true,
            molViewer: "3dmol",
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
                (state["molecules"] as TreeNodeList).flattened.forEach(
                    (node: TreeNode) => {
                        node.focused = false;
                    }
                );
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
