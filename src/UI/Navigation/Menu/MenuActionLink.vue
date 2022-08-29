<template>
  <li v-if="isTopLevel" class="nav-item">
    <a class="nav-link" @click="runFunction(menuData)" href="#">{{
      menuData._text
    }}</a>
  </li>
  <li v-else>
    <a class="dropdown-item" @click="runFunction(menuData)" href="#">{{
      menuData._text
    }}</a>
  </li>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

// @ts-ignore
import Dropdown from "bootstrap/js/dist/dropdown";
import Collapse from "bootstrap/js/dist/collapse";

import "bootstrap/js/dist/collapse";
import { IMenuItem } from "./Menu";

let collapseHamburger: any;
let hamburgerMenu: HTMLElement;

@Options({
  components: {},
})
export default class MenuActionLink extends Vue {
  @Prop() menuData!: IMenuItem;
  @Prop({ default: false }) isTopLevel!: boolean;

  private closeRegularMenu() {
    // Hide all toggles. This is good for regular menu (not hamburger, bigger
    // screens).
    const dropdownElementList = document.querySelectorAll(
      ".top-level-menu-item"
    );
    dropdownElementList.forEach((dropdownToggleEl) =>
      new Dropdown(dropdownToggleEl).hide()
    );
  }

  private closeHamburgerMenu() {
    // Below is effective if using hamburger menu (smaller screens).
    if (!hamburgerMenu) {
      hamburgerMenu = document.getElementById(
        "hamburger-button"
      ) as HTMLElement;
    }

    if (hamburgerMenu.offsetWidth > 0 && hamburgerMenu.offsetHeight > 0) {
      // Hamburger menu is visible
      if (!collapseHamburger) {
        collapseHamburger = new Collapse(
          document.getElementById("navbarSupportedContent") as HTMLElement
        );
      }

      collapseHamburger.toggle();
    }
  }

  runFunction(item: IMenuItem): void {
    if (item.function) {
      this.closeRegularMenu();
      this.closeHamburgerMenu();

      // Run the function
      item.function();
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

