import { tourManager } from "@/Plugins/Core/Tour/TourManager";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { pluginsApi } from "@/Api/Plugins";

export const tourApi = {
    /**
     * Starts a tour for a given plugin.
     *
     * @param {PluginParentClass} plugin The plugin to start the tour for.
     * @param {number} [testIndex=0] The index of the test to use for the tour.
     */
    startTour(plugin: PluginParentClass, testIndex = 0) {
  pluginsApi.runPlugin("tourplugin", {
   plugin: plugin,
   testIndex: testIndex,
  });
    },

    /**
     * Checks if a tour is currently running.
     *
     * @returns {boolean} True if a tour is running, false otherwise.
     */
    isTourRunning(): boolean {
        return tourManager.isTourRunning;
    },
};
