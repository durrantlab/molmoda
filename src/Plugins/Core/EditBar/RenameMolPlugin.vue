<template>
  <PluginComponent
    ref="pluginComponent"
    v-model:modelValue="open"
    title="Rename Molecule"
    :intro="intro"
    actionBtnTxt="Rename"
    :userArgs="userArgs"
    :pluginId="pluginId"
    @onPopupDone="onPopupDone"
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
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { ITest } from "@/Testing/ParentPluginTestFuncs";

/**
 * RenameMolPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class RenameMolPlugin extends PluginParentClass {
  menuPath = "Edit/Molecules/[1] Rename...";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "renamemol";
  intro = `Enter the new name for this molecule.`;

  userArgs: FormElement[] = [
    {
      id: "newName",
      label: "",
      val: "",
      placeHolder: "New molecule name",
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
    this.updateUserArgs([
      {
        name: "newName",
        val: this.nodesToActOn.get(0).title,
      } as IUserArg,
    ]);
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {IUserArg[]} userArgs  The user arguments.
   */
  runJobInBrowser(userArgs: IUserArg[]) {
    if (this.nodesToActOn) {
      this.nodesToActOn.get(0).title = this.getArg(userArgs, "newName");
    }
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
      beforePluginOpens: [
        this.testLoadExampleProtein(),
        ...this.testExpandMoleculesTree("4WP4"),
        this.testSelectMoleculeInTree("Protein"),
      ],
      pluginOpen: [this.testSetUserArg("newName", "2")],
      // closePlugin: [],
      // afterPluginCloses: [],
    };
  }
}
</script>

<style scoped lang="scss"></style>
