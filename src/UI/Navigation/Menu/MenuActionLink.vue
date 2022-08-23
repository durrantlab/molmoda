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
import Dropdown from 'bootstrap/js/dist/dropdown';

import "bootstrap/js/dist/collapse";
import { IMenuItem } from "./Menu";

@Options({
  components: {},
})
export default class MenuActionLink extends Vue {
  @Prop() menuData!: IMenuItem;
  @Prop({ default: false }) isTopLevel!: boolean;

  runFunction(item: IMenuItem): void {
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

