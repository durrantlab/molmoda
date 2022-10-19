export let pluginToTest = "";
export let pluginTestIndex: number | undefined = undefined;

/**
 * Sets the plugin to test. Used with the selenium test system.
 *
 * @param  {string} plugin   The id of the plugin to test.
 * @param  {number} [index]  The index of the plugin test, if there are multiple
 *                           for the specified plugin.
 */
export function setPluginToTest(plugin: string, index?: number) {
    pluginToTest = plugin;
    if (index !== undefined) {
        pluginTestIndex = index;
    }
}