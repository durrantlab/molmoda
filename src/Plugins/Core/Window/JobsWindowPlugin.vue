<template>
  <PluginComponent
    v-model="open"
    :title="title"
    :pluginId="pluginId"
    :userArgs="userArgs"
    :intro="intro"
    @onUserArgChanged="onUserArgChanged"
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
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { Options } from "vue-class-component";
import { switchToGoldenLayoutPanel } from "./Common";

/**
 * JobsWindowPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class JobsWindowPlugin extends PluginParentClass {
  menuPath = ["[9] Window", "Records", "Jobs"];
  title = "";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    // {
    //   name: "Jacob D. Durrant",
    //   url: "http://durrantlab.com/",
    // },
  ];
  pluginId = "jobswindow";
  noPopup = true;
  userArgDefaults: UserArg[] = [];
  alwaysEnabled = true;
  logJob = false;
  intro = `Switch to the jobs panel.`;

  /**
   * Every plugin runs some job. This is the function that does the job running.
   */
  runJobInBrowser() {
    switchToGoldenLayoutPanel("Jobs");
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
  