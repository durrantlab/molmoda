export let pluginToTest = "";
export let pluginTestIndex: number | undefined = undefined;

export function setPluginToTest(plugin: string, index?: number) {
    pluginToTest = plugin;
    if (index !== undefined) {
        pluginTestIndex = index;
    }
}