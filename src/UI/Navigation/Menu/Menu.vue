<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-light">
    <div class="container-fluid">
      <!-- <a class="navbar-brand" href="#">Navbar</a> -->
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarSupportedContent"
        aria-controls="navbarSupportedContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <!-- iterate over menuData -->
          <MenuLevel1
            v-for="menuDatum in getMenuData"
            v-bind:key="menuDatum.text"
            :menuData="menuDatum"
          />
        </ul>
      </div>
    </div>
  </nav>
</template>

<script lang="ts">
/* eslint-disable */

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/collapse";
import MenuLevel1 from "./MenuLevel1.vue";
import { IMenuItem, IMenuSubmenu, menuData } from "./Menu";

@Options({
  components: {
    MenuLevel1,
  },
})
export default class Menu extends Vue {
  get getMenuData(): (IMenuItem | IMenuSubmenu)[] {
    return menuData;
  }

  // mounted() {
  //   setVar("menuData", );
  // }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

