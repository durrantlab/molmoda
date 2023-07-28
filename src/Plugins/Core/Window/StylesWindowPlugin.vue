<template>
  <PluginComponent
    v-model="open"
    :title="title"
    :pluginId="pluginId"
    :userArgs="userArgs"
    :intro="intro"
  ></PluginComponent>
</template>
  
  <script lang="ts">
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { Options } from "vue-class-component";
import { switchToGoldenLayoutPanel } from "./Common";

/**
 * StylesWindowPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class StylesWindowPlugin extends PluginParentClass {
  menuPath = ["[9] Window", "Molecules", "[5] Styles"];
  title = "";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    // {
    //   name: "Jacob D. Durrant",
    //   url: "http://durrantlab.com/",
    // },
  ];
  pluginId = "styleswindow";
  noPopup = true;
  userArgs: FormElement[] = [];
  alwaysEnabled = true;
  logJob = false;
  intro = `Switch to the styles panel.`;

  /**
   * Every plugin runs some job. This is the function that does the job running.
   */
  runJobInBrowser() {
    switchToGoldenLayoutPanel("Styles");
    return;
  }

  /**
   * Gets the test commands for the plugin. For advanced use.
   *
   * @gooddefault
   * @document
   * @returns {ITest}  The selenium test commands.
   */
  getTests(): ITest {
    return {
      closePlugin: [],
      afterPluginCloses: new TestCmdList()
        .wait(3).cmds
    };
  }
}
</script>
  
  <style scoped lang="scss"></style>
  