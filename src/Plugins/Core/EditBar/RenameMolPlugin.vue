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
import {
  FormElement,
  IFormText,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getDefaultNodeToActOn, setNodeToActOn } from "./EditBarUtils";
import { checkAnyMolSelected } from "../CheckUseAllowedUtils";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";

/**
 * RenameMolPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class RenameMolPlugin extends PluginParentClass {
  menuPath = "Edit/Molecules/[1] Rename";
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
  runJob(userArgs: IUserArg[]): Promise<undefined> {
    if (this.nodeToActOn) {
      this.nodeToActOn.title = userArgs[0].val;
    }
    return Promise.resolve(undefined);
  }
}
</script>

<style scoped lang="scss"></style>
