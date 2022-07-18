<template>
  <div class="full-screen" style="display:flex;flex-direction:column;">
    <div style="flex-grow: 5;">
      <Menu :menuData="menuData" />
    </div>
    <div style="flex-grow: 5;">
      <GoldLayout />
    </div>
    <AllPlugins @onPluginSetup="onPluginSetup" :credits="credits"/>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import GoldLayout from "@/UI/Layout/GoldenLayout/GoldLayout.vue";
import Menu from "@/UI/Navigation/Menu/Menu.vue";
import * as api from "@/Api";
import AllPlugins from "../Plugins/AllPlugins.vue";
import { addMenuItem, IMenuItem, IMenuSubmenu } from "../UI/Navigation/Menu/Menu";
import { ICredit, Licenses } from "../Plugins/PluginInterfaces";
import { globalCredits } from "./GlobalCredits";
import { IPluginSetupInfo } from "@/Plugins/PluginParent";

@Options({
  components: {
    GoldLayout,
    Menu,
    AllPlugins
  },
})
export default class App extends Vue {
  menuData: (IMenuItem | IMenuSubmenu)[] = [];

  credits: ICredit[] = globalCredits;

  onPluginSetup(pluginSetupInfo: IPluginSetupInfo) {
    this.menuData = addMenuItem(pluginSetupInfo.menuData, this.menuData);
    this.credits = [...this.credits, ...pluginSetupInfo.credits];
  }

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
