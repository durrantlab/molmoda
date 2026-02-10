// Arrays of functions to call.
export const allHooks = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    onMoleculesChanged: [] as Function[]
}

export const hooksApi = {
    /**
     * Adds a function to the onMoleculesChanged hook.
     * @param  {Function} func  The function to add.
     */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    onMoleculesChanged(func: Function) {
        allHooks.onMoleculesChanged.push(func);
    }
}
