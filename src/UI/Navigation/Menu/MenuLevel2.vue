<template>
  <!-- direct action in main dropdown -->
  <MenuActionLink v-if="isAction(menuData)" :isTopLevel="false" :menuData="menuData" />
  <span v-else>
    <!-- It's a submenu. still in main dropdown, but grouped -->
    <li><span class="dropdown-item-text text-muted pt-0">{{menuData._text}}</span></li>
    <span v-for="item in getItems(menuData)" v-bind:key="item._text">
      <MenuActionLink v-if="isAction(item)" :isTopLevel="false" :menuData="item" />
      <MenuLevel3 v-else :menuData="item"></MenuLevel3>
    </span>
  </span>
</template>

<script lang="ts">

import { Options } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/collapse";
import MenuActionLink from "./MenuActionLink.vue";
import { IMenuEntry, MenuLevelParent } from "./Menu";
import MenuLevel3 from "./MenuLevel3.vue";

/**
 * MenuLevel2 component
 */
@Options({
  components: {
    MenuActionLink,
    MenuLevel3
  },
})
export default class MenuLevel2 extends MenuLevelParent {
  @Prop() menuData!: IMenuEntry;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

