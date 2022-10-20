<template>
  <nav class="navbar navbar-expand-md navbar-light bg-light">
    <div class="container-fluid">
      <!-- <a class="navbar-brand" href="#">Navbar</a> -->
      <!-- below is hamburger icon for small screens -->
      <button
        id="hamburger-button"
        class="navbar-toggler"
        type="button"
        aria-controls="navbarSupportedContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
        data-bs-toggle="collapse"
        data-bs-target="#navbarSupportedContent"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- here is the menu itself -->
      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">

          <!-- iterate over menuData -->
          <MenuLevel1
            v-for="menuDatum in menuDataSorted"
            v-bind:key="menuDatum._text"
            :menuData="menuDatum"
          />
        </ul>
      </div>
    </div>
  </nav>
</template>

<script lang="ts">

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/collapse";
import MenuLevel1 from "./MenuLevel1.vue";
import { IMenuEntry, menuDataSorted } from "./Menu";

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
    return this.menuData;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.navbar-expand-md {
  padding-bottom:0;
}
</style>

