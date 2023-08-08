<template>
  <PluginComponent
    ref="pluginComponent"
    v-model="open"
    :title="title"
    :intro="intro"
    actionBtnTxt="Rename"
    :userArgs="userArgs"
    :pluginId="pluginId"
    @onPopupDone="onPopupDone"
    @onUserArgChanged="onUserArgChanged"
  ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement, IFormText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { getDefaultNodeToActOn, setNodesToActOn } from "./EditBarUtils";
import { checkOneMolSelected } from "../CheckUseAllowedUtils";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";

/**
 * RenameMolPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class RenameMolPlugin extends PluginParentClass {
  menuPath = "[4] Edit/Molecules/[1] Rename...";
  title = "Rename Molecule";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    // {
    //   name: "Jacob D. Durrant",
    //   url: "http://durrantlab.com/",
    // },
  ];
  pluginId = "renamemol";
  intro = `Rename the molecule.`;

  userArgDefaults: FormElement[] = [
    {
      id: "newName",
      label: "",
      val: "",
      placeHolder: "New molecule name",
      description: "The new name for this molecule.",
      validateFunc: (newName: string): boolean => {
        return newName.length > 0;
      },
    } as IFormText,
  ];

  nodesToActOn = new TreeNodeList([getDefaultNodeToActOn()]);
  alwaysEnabled = true;
  logJob = false;

  /**
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  checkPluginAllowed(): string | null {
    return checkOneMolSelected();
  }

  /**
   * Runs before the popup opens. Good for initializing/resenting variables
   * (e.g., clear inputs from previous open).
   */
  onBeforePopupOpen() {
    setNodesToActOn(this);
    this.setUserArg("newName", this.nodesToActOn.get(0).title);
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   */
  runJobInBrowser() {
    if (this.nodesToActOn) {
      this.nodesToActOn.get(0).title = this.getUserArg("newName");
    }
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
        .loadExampleProtein(true)
        .selectMoleculeInTree("Protein").cmds,
      pluginOpen: new TestCmdList()
        .setUserArg("newName", "2", this.pluginId).cmds,
    };
  }
}
</script>

<style scoped lang="scss"></style>
