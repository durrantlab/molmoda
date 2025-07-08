<template>
  <nav class="navbar navbar-expand-md navbar-light bg-light">
    <div class="container-fluid">
      <!-- <a class="navbar-brand" href="_#">Navbar</a> -->
      <!-- below is hamburger icon for small screens -->
      <button id="hamburger-button" class="navbar-toggler" type="button" aria-controls="navbarSupportedContent"
        aria-expanded="false" aria-label="Toggle navigation" data-bs-toggle="collapse"
        data-bs-target="#navbarSupportedContent">
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- here is the menu itself -->
      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">

          <!-- iterate over menuData -->
          <MenuLevel1 v-for="menuDatum in menuDataSorted" v-bind:key="menuDatum.text" :menuData="menuDatum" />
        </ul>
      </div>
    </div>
  </nav>
</template>

<script lang="ts">

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import MenuLevel1 from "./MenuLevel1.vue";
import { IMenuEntry, menuDataSorted } from "./Menu";
import { setAllMenuData } from "@/Plugins/LoadedPlugins";
import { setupElectronMenu } from "@/Core/Electron/ElectronMenu";
import { dynamicImports } from "@/Core/DynamicImports";

/**
 * Menu component
 */
@Options({
  components: {
    MenuLevel1,
  },
})
export default class Menu extends Vue {
  @Prop({ required: true }) menuData!: IMenuEntry[];

  /**
   * Gets the sorted menu data.
   * 
   * @returns {IMenuEntry[]}  The sorted menu data.
   */
  get menuDataSorted(): IMenuEntry[] {
    menuDataSorted(this.menuData);

    // Make the menu data available outside this component.
    setAllMenuData(this.menuData);

    // Set menu in electron if needed.
    setupElectronMenu(this.menuData);

    return this.menuData;
  }

  /**
   * Dynamically loads necessary Bootstrap JavaScript modules after the
   * component has mounted. This moves these scripts out of the initial
   * bundle.
   */
  async mounted() {
    // Dynamically load Bootstrap components needed for the menu
    await dynamicImports.bootstrapDropdown.module;
    await dynamicImports.bootstrapCollapse.module;
  }

  // mounted() {
  //   setTimeout(() => {
  //     // Need to set the electron menu after the menu is mounted.
  //     setupElectronMenu(this.menuDataSorted);
  //   }, 2000);
  // }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.navbar-expand-md {
  padding-bottom: 0;
  padding-top: 9px;
  border: 0;
}
</style>
