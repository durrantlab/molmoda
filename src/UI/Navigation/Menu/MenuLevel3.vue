<template>
  <!-- direct action in main-dropdown group -->
  <MenuActionLink
    v-if="isAction(menuData)"
    :isTopLevel="false"
    :menuData="menuData"
  />
  <span v-else>
    <!-- It's a submenu dropdown that opens to the right -->
    <li>
      <div class="dropend">
        <a
          class="dropdown-item dropdown-toggle pt-0"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          style="cursor: pointer; padding-bottom:2px;"
          :id="'menu2-' + idSlug"
        >
          <!-- <div style="width:100px; float:left;">{{menuData.text}}</div> -->
          {{ menuData._text }}&nbsp;
        </a>
        <ul class="dropdown-menu">
          <MenuActionLink
            v-for="item in getItems(menuData)"
            v-bind:key="item._text"
            :isTopLevel="false"
            :menuData="item"
          />
        </ul>
      </div>
    </li>
  </span>
</template>

<script lang="ts">

import { Options } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/collapse";
import MenuActionLink from "./MenuActionLink.vue";
import { IMenuEntry, MenuLevelParent } from "./Menu";
import { slugify } from "@/Core/Utils";

/**
 * MenuLevel3 component
 */
@Options({
  components: {
    MenuActionLink,
  },
})
export default class MenuLevel3 extends MenuLevelParent {
  @Prop() menuData!: IMenuEntry;

  /**
   * Gets a slug for the menu text.
   * 
   * @returns {string}  The slug.
   */
   get idSlug(): string {
    return slugify(this.menuData._text as string);
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

