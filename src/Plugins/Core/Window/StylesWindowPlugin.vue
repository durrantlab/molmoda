<template>
  <PluginComponent
    v-model="open"
    title=""
    :pluginId="pluginId"
    :userArgs="userArgs"
  ></PluginComponent>
</template>
  
  <script lang="ts">
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { ITest, TestWait } from "@/Testing/ParentPluginTestFuncs";
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
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "styleswindow";
  noPopup = true;
  userArgs: FormElement[] = [];
  alwaysEnabled = true;
  logJob = false;

  /**
   * Every plugin runs some job. This is the function that does the job running.
   */
  runJobInBrowser() {
    switchToGoldenLayoutPanel("Styles");
  }

  /**
   * Gets the selenium test commands for the plugin. For advanced use.
   *
   * @gooddefault
   * @document
   * @returns {ITest}  The selenium test commands.
   */
  getTests(): ITest {
    return {
      closePlugin: [],
      afterPluginCloses: [new TestWait(3).cmd],
    };
  }
}
</script>
  
  <style scoped lang="scss"></style>
  