<template>
    <Section title="Custom Styles">
      <div v-if="customStylesForDisplay.length === 0" class="pb-0">
        <p style="font-size: 14px">No custom styles defined.</p>
        <!-- TODO: Add a way to create new custom styles in the future -->
      </div>
      <div v-else>
        <div
          v-for="[name] in customStylesForDisplay"
          :key="name"
          class="d-flex justify-content-between align-items-center mb-1 p-1 ps-2 border rounded"
        >
        <span
          class="flex-grow-1"
          style="font-size: 0.875rem;"
    :class="{ 'text-muted': !isCustomStyleEnabled(name) }"
        >
          {{ name }}
        </span>
          <div class="d-flex">
            <IconSwitcher
              :useFirst="isCustomStyleEnabled(name)"
              :iconID1="['far', 'eye']"
              :iconID2="['far', 'eye-slash']"
              :icon2Style="{ color: 'lightgray' }"
              :width="22"
              @click="handleToggleCustomStyle(name)"
              title="Toggle Style"
              class="me-2 clickable"
            />
            <IconSwitcher
              :useFirst="true"
              :iconID1="['far', 'rectangle-xmark']"
              :iconID2="['far', 'rectangle-xmark']"
              :width="22"
              @click="handleDeleteCustomStyle(name)"
              title="Delete Style"
              class="clickable"
            />
          </div>
        </div>
      </div>
    </Section>
  </template>
  <script lang="ts">
  import { Options, Vue } from "vue-class-component";
  import Section from "@/UI/Layout/Section.vue";
  import IconSwitcher from "@/UI/Navigation/TitleBar/IconBar/IconSwitcher.vue";
  import * as StyleManager from "@/Core/Styling/StyleManager";
  import { ISelAndStyle } from "@/Core/Styling/SelAndStyleInterfaces";
  /**
   * StylesCustom component for managing and displaying custom styles.
   */
  @Options({
    components: {
      Section,
      IconSwitcher,
    },
  })
  export default class StylesCustom extends Vue {
  // private updateTrigger = 0; // Reactive property to force updates -- Removed
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
   // this.updateTrigger++; // Force re-render -- Removed
    }
    /**
     * Handles the deletion of a custom style.
     *
     * @param {string} name The name of the custom style to delete.
     */
    handleDeleteCustomStyle(name: string): void {
      StyleManager.deleteCustomStyle(name);
   // this.updateTrigger++; // Force re-render -- Removed
    }
  }
  </script>
  <style scoped lang="scss">
  .clickable {
    cursor: pointer;
  }
  </style>