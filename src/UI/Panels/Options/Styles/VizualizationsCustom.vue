<template>
  <Section title="Custom Visualizations">
    <div v-if="customStylesForDisplay.length === 0" class="pb-0">
      <p style="font-size: 14px" class="mb-0">No custom visualizations defined.</p>
    </div>
    <div v-else>
      <div v-for="[name] in customStylesForDisplay" :key="name"
        class="d-flex justify-content-between align-items-center mb-1 p-1 ps-2 border rounded">
        <span class="flex-grow-1" style="font-size: 0.875rem;" :class="{ 'text-muted': !isCustomStyleEnabled(name) }">
          {{ name }}
        </span>
        <div class="d-flex">
          <IconSwitcher :useFirst="isCustomStyleEnabled(name)" :iconID1="['far', 'eye']" :iconID2="['far', 'eye-slash']"
            :icon2Style="{ color: 'lightgray' }" :width="22" @click="handleToggleCustomStyle(name)"
            title="Toggle Visualization" class="me-2 clickable" />
          <IconSwitcher :useFirst="true" :iconID1="['far', 'rectangle-xmark']" :iconID2="['far', 'rectangle-xmark']"
            :width="22" @click="handleDeleteCustomStyle(name)" title="Delete Visualization" class="clickable" />
        </div>
      </div>
    </div>
    <div class="text-end mt-2" style="padding-right: 11px;">
      <span @click="openAddNewVisualizationPlugin" role="button" tabindex="0" title="Add New Visualization"
        class="clickable" style="font-size: 1.1rem; text-decoration: none;">
        <Icon :icon="['fas', 'plus']" />
      </span>
    </div>
  </Section>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import Section from "@/UI/Layout/Section.vue";
import IconSwitcher from "@/UI/Navigation/TitleBar/IconBar/IconSwitcher.vue";
import * as StyleManager from "@/Core/Styling/StyleManager";
import { ISelAndStyle } from "@/Core/Styling/SelAndStyleInterfaces";
import { pluginsApi } from "@/Api/Plugins";
import Icon from "@/UI/Components/Icon.vue";

/**
 * VizualizationsCustom component for managing and displaying custom styles.
 */
@Options({
  components: {
    Section,
    IconSwitcher,
    Icon,
  },
})
export default class VizualizationsCustom extends Vue {
  /**
   * Gets the custom styles for display in the template.
   * This computed property ensures reactivity when styles are added or removed.
   *
   * @returns {any} An array of [name, styleObject] pairs.
   */
  get customStylesForDisplay(): Array<[string, ISelAndStyle]> {
    return Object.entries(StyleManager.customSelsAndStyles);
  }

  /**
   * Checks if a custom style is enabled.
   *
   * @param {string} name The name of the custom style.
   * @returns {boolean} True if enabled, false otherwise.
   */
  isCustomStyleEnabled(name: string): boolean {
    return StyleManager.isCustomStyleEnabled(name);
  }

  /**
   * Handles the toggling of a custom style's visibility (enabled/disabled state).
   *
   * @param {string} name The name of the custom style to toggle.
   */
  handleToggleCustomStyle(name: string): void {
    StyleManager.toggleCustomStyle(name);
  }

  /**
   * Handles the deletion of a custom style.
   *
   * @param {string} name The name of the custom style to delete.
   */
  handleDeleteCustomStyle(name: string): void {
    StyleManager.deleteCustomStyle(name);
  }

  /**
   * Opens the "Add New Visualization" plugin.
   */
  openAddNewVisualizationPlugin(): void {
    pluginsApi.runPlugin("addnewvisualization");
  }
}
</script>

<style scoped lang="scss">
.clickable {
  cursor: pointer;
}
</style>