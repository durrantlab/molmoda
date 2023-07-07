<template>
  <PluginComponent
    v-model="open"
    title=""
    :pluginId="pluginId"
    :userArgs="userArgs"
    :intro="intro"
  ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import { redo, redoStack } from "./UndoStack";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";

/**
 * RedoPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class RedoPlugin extends PluginParentClass {
  // @Prop({ required: true }) softwareCreditsToShow!: ISoftwareCredit[];
  // @Prop({ required: true }) contributorCreditsToShow!: IContributorCredit[];

  menuPath = ["Edit", "Revisions", "[2] Redo"];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "redo";
  noPopup = true;
  userArgs: FormElement[] = [];
  alwaysEnabled = true;
  logJob = false;
  hotkey = "y"
  intro = "Redo the last undo."

  /**
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  checkPluginAllowed(): string | null {
    if (redoStack.length === 0) {
      return "No additional redo is available.";
    }
    return null;
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   */
  runJobInBrowser() {
    redo(this.$store);
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
      beforePluginOpens: new TestCmdList()
        .loadExampleProtein()
        .click("#menu1-edit")
        .click("#menu-plugin-undo")
        .wait(3).cmds,
      closePlugin: [],      
      afterPluginCloses: new TestCmdList()
        .wait(3).cmds
    };
  }
}
</script>

<style scoped lang="scss"></style>
