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
          class="dropdown-item dropdown-toggle"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          style="cursor: pointer"
        >
          <!-- <div style="width:100px; float:left;">{{menuData.text}}</div> -->
          {{ menuData.text }}&nbsp;
        </a>
        <ul class="dropdown-menu">
          <MenuActionLink
            v-for="item in getItems(menuData)"
            v-bind:key="item.text"
            :isTopLevel="false"
            :menuData="item"
          />
        </ul>
      </div>
    </li>
  </span>
</template>

<script lang="ts">
/* eslint-disable */

import { Options } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/collapse";
import MenuActionLink from "./MenuActionLink.vue";
import { IMenuItem, IMenuSubmenu, MenuLevelParent } from "./Menu";

@Options({
  components: {
    MenuActionLink,
  },
})
export default class MenuLevel3 extends MenuLevelParent {
  @Prop() menuData!: IMenuItem | IMenuSubmenu;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

