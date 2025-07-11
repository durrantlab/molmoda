<template>
  <!-- top-level buttons, and separators in dropdown -->
  <MenuActionLink
    v-if="isAction(menuData)"
    :isTopLevel="true"
    :menuData="menuData"
  />
  <li v-else class="nav-item dropdown">
    <!-- dropdown-toggle -->
    <!-- This is the top-level menu (across top of screen) -->
    <a
      class="nav-link top-level-menu-item"
      data-bs-auto-close="outside"
      :id="'menu1-' + idSlug"
      role="button"
      data-bs-toggle="dropdown"
      aria-expanded="false"
    >
      {{ menuData.text }}
    </a>
    <ul class="dropdown-menu" :aria-labelledby="'menu1-' + idSlug" style="min-width:180px;">
      <span v-for="(item, idx) in menuItemsWithSeparators" v-bind:key="idx">
        <li v-if="isSeparator(item)"><hr class="dropdown-divider" /></li>
        <MenuLevel2 v-else :menuData="item" />
      </span>
    </ul>
  </li>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import MenuActionLink from "./MenuActionLink.vue";
import MenuLevel2 from "./MenuLevel2.vue";
import {
  IMenuEntry,
  IMenuSeparator,
  IMenuSubmenu,
  menuDataSorted,
  MenuItemType,
  MenuLevelParent,
} from "./Menu";
import { slugify } from "@/Core/Utils/StringUtils";

/**
 * MenuLevel1 component
 */
@Options({
  components: {
    MenuActionLink,
    MenuLevel2,
  },
})
export default class MenuLevel1 extends MenuLevelParent {
  @Prop() menuData!: IMenuEntry;

  /**
   * Gets a slug for the menu text.
   * 
   * @returns {string}  The slug.
   */
  get idSlug(): string {
    return slugify(this.menuData.text as string);
  }

  /**
   * Gets the menu items with separators added.
   *
   * @returns {(IMenuEntry | IMenuSeparator)[]}  The menu items with separators.
   */
  get menuItemsWithSeparators(): (IMenuEntry | IMenuSeparator)[] {
    // Adds separators
    let newMenuItemsWithSeparator: (IMenuEntry | IMenuSeparator)[] = [];

    let items: IMenuEntry[] = (this.menuData as IMenuSubmenu).items;
    if (!items) {
      return newMenuItemsWithSeparator;
    }

    // Sort the items by rank
    menuDataSorted(items);

    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      let nextItem = items[i + 1];
      // Add the original item
      newMenuItemsWithSeparator.push(item);

      // Consider adding separator
      if (
        item.type === MenuItemType.Submenu ||
        (nextItem &&
          item.type === MenuItemType.Action &&
          nextItem.type === MenuItemType.Submenu)
      ) {
        // Always add separator after submenu.
        // Also after action if next item is submenu.
        newMenuItemsWithSeparator.push({
          type: MenuItemType.Separator,
        } as IMenuSeparator);
      }
    }

    // Remove last item if a separator.
    if (newMenuItemsWithSeparator.length > 0) {
      let lastItem =
        newMenuItemsWithSeparator[newMenuItemsWithSeparator.length - 1];
      if (lastItem.type === MenuItemType.Separator) {
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
