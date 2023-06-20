/* eslint-disable @typescript-eslint/ban-types */

// Arrays of functions to call.
export const allHooks = {
    onMoleculesChanged: [] as Function[]
}

export const hooksApi = {
    /**
     * Adds a function to the onMoleculesChanged hook.
     * 
     * @param  {Function} func  The function to add.
     */
    onMoleculesChanged(func: Function) {
        allHooks.onMoleculesChanged.push(func);
    }
}
