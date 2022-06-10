<template>
  <!-- top-level buttons, and separators in dropdown -->
  <MenuActionLink
    v-if="isAction(menuData)"
    :isTopLevel="true"
    :menuData="menuData"
  />
  <li v-else class="nav-item dropdown">
    <a
      class="nav-link dropdown-toggle"
      data-bs-auto-close="outside"
      href="#"
      id="navbarDropdown"
      role="button"
      data-bs-toggle="dropdown"
      aria-expanded="false"
    >
      {{ menuData.text }}
    </a>
    <ul class="dropdown-menu" aria-labelledby="navbarDropdown">
      <span v-for="(item, idx) in menuItemsWithSeparators" v-bind:key="idx">
        <li v-if="isSeparator(item)"><hr class="dropdown-divider" /></li>
        <MenuLevel2 v-else :menuData="item" />
      </span>
    </ul>
  </li>
</template>

<script lang="ts">
/* eslint-disable */

import { Options } from "vue-class-component";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/collapse";
import MenuActionLink from "./MenuActionLink.vue";
import MenuLevel2 from "./MenuLevel2.vue";
import {
  IMenuAction,
  IMenuSeparator,
  IMenuSubmenu,
  MenuItemType,
  MenuLevelParent,
} from "./Menu";

@Options({
  props: {
    menuData: Object,
  },
  components: {
    MenuActionLink,
    MenuLevel2,
  },
})
export default class MenuLevel1 extends MenuLevelParent {
  menuData!: IMenuAction | IMenuSubmenu;

  get menuItemsWithSeparators(): (
    | IMenuAction
    | IMenuSubmenu
    | IMenuSeparator
  )[] {
    // Adds separators
    let newMenuItemsWithSeparator: (
      | IMenuAction
      | IMenuSubmenu
      | IMenuSeparator
    )[] = [];

    let items: (IMenuAction | IMenuSubmenu)[] = (this.menuData as IMenuSubmenu)
      .items;
    if (!items) {
      return newMenuItemsWithSeparator;
    }

    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      let nextItem = items[i + 1];
      // Add the original item
      newMenuItemsWithSeparator.push(item);

      // Consider adding separator
      if (
        item.type === MenuItemType.SUBMENU ||
        (nextItem &&
          item.type === MenuItemType.ACTION &&
          nextItem.type === MenuItemType.SUBMENU)
      ) {
        // Always add separator after submenu.
        // Also after action if next item is submenu.
        newMenuItemsWithSeparator.push({
          type: MenuItemType.SEPARATOR,
        } as IMenuSeparator);
      }
    }

    // Remove last item if it is a separator.
    if (newMenuItemsWithSeparator.length > 0) {
      let lastItem =
        newMenuItemsWithSeparator[newMenuItemsWithSeparator.length - 1];
      if (lastItem.type === MenuItemType.SEPARATOR) {
        newMenuItemsWithSeparator.pop();
      }
    }
    return newMenuItemsWithSeparator;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
