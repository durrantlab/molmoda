<template>
  <li v-if="isTopLevel" class="nav-item">
    <a class="nav-link" @click="runFunction(menuData)" href="#">{{
      menuData.text
    }}</a>
  </li>
  <li v-else>
    <a class="dropdown-item" @click="runFunction(menuData)" href="#">{{
      menuData.text
    }}</a>
  </li>
</template>

<script lang="ts">
/* eslint-disable */

import { Options, Vue } from "vue-class-component";

// @ts-ignore
import * as Dropdown from "bootstrap/js/dist/dropdown";

import "bootstrap/js/dist/collapse";
import { IMenuAction } from "./Menu";

// var $ = require("jquery");

@Options({
  props: {
    menuData: Object,
    isTopLevel: {
      type: Boolean,
      default: false,
    },
  },
  components: {},
})
export default class MenuActionLink extends Vue {
  menuData!: IMenuAction;
  isTopLevel!: boolean;

  runFunction(item: IMenuAction): void {
    if (item.function) {
      // Hide all toggles
      const dropdownElementList = document.querySelectorAll(".dropdown-toggle");
      const dropdownList = [...dropdownElementList].map((dropdownToggleEl) =>
        new Dropdown(dropdownToggleEl).hide()
      );

      // Run the function
      item.function();
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

