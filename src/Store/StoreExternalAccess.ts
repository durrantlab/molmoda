import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { NameValPair } from "./StoreInterfaces";

let store: any;

/**
 * Sets up external access to the vuex store.
 *
 * @param  {any} _store  The vuex store.
 */
export function setupExternalStoreAccess(_store: any) {
    store = _store;
}

/**
 * Sets a state variable.
 *
 * @param  {string} name         The name of the variable to set.
 * @param  {any}    value        The value to set.
 * @param  {string} [module=""]  The module. Optional.
 */
export function setStoreVar(name: string, value: any, module = "") {
    if (module === "") {
        store.commit("setVar", { name: name, val: value } as NameValPair);
    } else {
        store.commit("setVar", {
            name: name,
            val: value,
            module: module,
        } as NameValPair);
    }
}

/**
 * Adds a value to a list in the state.
 *
 * @param  {string} name   The name of the list to add to.
 * @param  {any}    value  The value to push to the list.
 */
export function pushToStoreList(name: string, value: any) {
    store.commit("pushToList", { name: name, val: value } as NameValPair);
}

/**
 * Gets a store.state variable.
 *
 * @param  {string} name         The name of the variable to get.
 * @param  {string} [module=""]  The module. Optional.
 * @returns {any}  The value of the variable.
 */
function getStoreVar(name: string, module = ""): any {
    if (module === "") {
        return store.state[name];
    } else {
        return store.state[module][name];
    }
}

/**
 * Gets the molecules from the store. Doing it this way so it will be typed.
 * 
 * @returns {TreeNodeList}  The molecules in the store.
 */
export function getMoleculesFromStore(): TreeNodeList {
    return getStoreVar("molecules") as TreeNodeList;
}
