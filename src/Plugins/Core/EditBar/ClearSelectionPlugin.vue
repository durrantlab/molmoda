<template>
  <PluginComponent
    v-model="open"
    title=""
    :userInputs="userInputs"
  ></PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options } from "vue-class-component";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { getAllNodesFlattened } from "@/UI/Navigation/TreeView/TreeUtils";
import { SelectedType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { checkAnyMolSelected } from "../CheckUseAllowedUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";

/** ClearSelectionPlugin */
@Options({
  components: {
    PluginComponent
  },
})
export default class ClearSelectionPlugin extends PluginParentClass {
  menuPath = ["Edit", "Molecules", "[7] Clear Selection"];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "clearselection";
  noPopup = true;
  userInputs: FormElement[] = [];
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
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @returns {Promise<undefined>}  A promise that resolves when the job is
   *     done.
   */
   runJob(): Promise<undefined> {
    const allNodes = getAllNodesFlattened(this.$store.state["molecules"]);
    allNodes.forEach((n) => {
      if (n.selected !== SelectedType.FALSE) {
        n.selected = SelectedType.FALSE;
      }
    });
    return Promise.resolve(undefined);
  }
}
</script>

<style scoped lang="scss"></style>
