<template>
  <li v-if="isTopLevel" class="nav-item">
    <a class="nav-link" @click="runFunction(menuData)" href="#">{{
      menuData._text
    }}</a>
  </li>
  <li v-else>
    <a
      class="dropdown-item"
      @click="runFunction(menuData)"
      href="#"
      :id="'menu-plugin-' + idSlug"
      >{{ menuData._text }}</a
    >
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
import { slugify } from "@/Core/Utils";

let collapseHamburger: any;
let hamburgerMenu: HTMLElement;

/**
 * MenuActionLink component
 */
@Options({
  components: {},
})
export default class MenuActionLink extends Vue {
  @Prop() menuData!: IMenuItem;
  @Prop({ default: false }) isTopLevel!: boolean;

  /**
   * Gets a slug for the menu text.
   * 
   * @returns {string}  The slug.
   */
   get idSlug(): string {
    return slugify(this.menuData._text as string);
  }
  
  /**
   * Hide all toggles. This is good for regular menu (not hamburger, bigger
   * screens).
   */
  private closeRegularMenu() {
    const dropdownElementList = document.querySelectorAll(
      ".top-level-menu-item"
    );
    dropdownElementList.forEach((dropdownToggleEl) =>
      new Dropdown(dropdownToggleEl).hide()
    );
  }

  /**
   * Close the menu. Effective if using hamburger menu (smaller screens).
   */
  private closeHamburgerMenu() {
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

  /**
   * Run the function of the menu item.
   *
   * @param {IMenuItem} item  The menu item.
   */
  runFunction(item: IMenuItem) {
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

