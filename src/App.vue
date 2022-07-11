<template>
  <div class="full-screen" style="display:flex;flex-direction:column;">
    <div style="flex-grow: 5;">
      <Menu />
    </div>
    <div style="flex-grow: 5;">
      <GoldLayout />
    </div>
    <AboutPlugin />
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import GoldLayout from "@/UI/Layout/GoldenLayout/GoldLayout.vue";
import Menu from "@/UI/Navigation/Menu/Menu.vue";
import * as api from "@/Api";
import AboutPlugin from "@/Plugins/Core/About/About.vue";

@Options({
  components: {
    GoldLayout,
    Menu,
    AboutPlugin
  },
})
export default class App extends Vue {
  mounted() {
    // Close enough to rendered, I think.
    api.sys.loadStatus.vueRendered =true;
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
