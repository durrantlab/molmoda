<template>
  <div class="full-screen" style="display:flex;flex-direction:column;">
    <div style="flex-grow: 5;">
      <Menu />
    </div>
    <div style="flex-grow: 5;">
      <GoldLayout />
    </div>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import GoldLayout from "./UI/GoldenLayout/GoldLayout.vue";
import Menu from "./UI/Menu/Menu.vue";
import * as api from "./Api";

@Options({
  components: {
    GoldLayout,
    Menu,
  },
})
export default class App extends Vue {
  mounted() {
    // Close enough to rendered, I think.
    api.sys.loadStatus.vueRendered(true);
  }
}
</script>

<style lang="scss">
// Global

@import "bootstrap/dist/css/bootstrap.min.css";
// @import "bootstrap/scss/bootstrap.scss";
// @import "bootstrap/scss/bootstrap";

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  /* Takes up whole screen */
  position: absolute;
  width: 100%;
  height: 100%;
}

.full-screen {
  /* Takes up whole screen */
  position: absolute;
  width: 100%;
  height: 100%;
}
</style>
