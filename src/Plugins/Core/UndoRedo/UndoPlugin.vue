<template>
  <PluginComponent
    v-model="open"
    title=""
    :userArgs="userArgs"
    :pluginId="pluginId"
  ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import * as api from "@/Api";
import { addToUndoStackAfterUserInaction, undo, undoStack } from "./UndoStack";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/ParentPluginTestFuncs";

/**
 * UndoPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class UndoPlugin extends PluginParentClass {
  // @Prop({ required: true }) softwareCreditsToShow!: ISoftwareCredit[];
  // @Prop({ required: true }) contributorCreditsToShow!: IContributorCredit[];

  menuPath = ["[5] Edit", "[0] Revisions", "[1] Undo"];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "undo";
  noPopup = true;
  userArgs: FormElement[] = [];
  alwaysEnabled = true;
  logJob = false;

  /**
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  checkPluginAllowed(): string | null {
    if (undoStack.length === 0) {
      return "No additional undo is available.";
    }
    return null;
  }

  /**
   * Called when the plugin is mounted.
   */
  onMounted() {
    api.hooks.onMoleculesChanged(addToUndoStackAfterUserInaction);
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   */
  runJobInBrowser() {
    undo(this.$store);
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
      beforePluginOpens: [this.testLoadExampleProtein()],
      // populateUserArgs: [this.testUserArg("filename", "test")],
      closePlugin: [],
      afterPluginCloses: [
        // this.testWaitForRegex("#log", 'Job "undo:.+?" ended'),
        this.testWait(3),
      ],
    };
  }
}
</script>

<style scoped lang="scss"></style>
