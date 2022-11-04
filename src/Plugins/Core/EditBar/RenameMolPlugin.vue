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
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getDefaultNodeToActOn, setNodeToActOn } from "./EditBarUtils";
import { checkAnyMolSelected } from "../CheckUseAllowedUtils";
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

  nodeToActOn: IMolContainer = getDefaultNodeToActOn();
  alwaysEnabled = true;
  logJob = false;

  /**
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  checkPluginAllowed(): string | null {
    return checkAnyMolSelected(this as any);
  }

  /**
   * Runs before the popup opens. Good for initializing/resenting variables
   * (e.g., clear inputs from previous open).
   */
  onBeforePopupOpen() {
    setNodeToActOn(this);
    this.updateUserArgs([
      {
        name: "newName",
        val: this.nodeToActOn?.title,
      } as IUserArg,
    ]);
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {IUserArg[]} userArgs  The user arguments.
   * @returns {Promise<undefined>}  A promise that resolves when the job is
   *     done.
   */
  runJobInBrowser(userArgs: IUserArg[]): Promise<undefined> {
    if (this.nodeToActOn) {
      this.nodeToActOn.title = this.userArgsLookup(userArgs, "newName");
    }
    return Promise.resolve(undefined);
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
        ...this.testExpandMoleculesTree("PRO-HEVEIN (4WP4.pdb)"),
        this.testSelectMoleculeInTree("Protein"),
      ],
      populateUserArgs: [this.testUserArg("newName", "2")],
      // closePlugin: [],
      // afterPluginCloses: [],
    };
  }
}
</script>

<style scoped lang="scss"></style>
