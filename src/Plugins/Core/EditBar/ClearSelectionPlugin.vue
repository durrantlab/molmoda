<template>
  <span></span>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options } from "vue-class-component";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { PluginParent } from "@/Plugins/PluginParent";
import { getAllNodesFlattened } from "@/UI/Navigation/TreeView/TreeUtils";
import { SelectedType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { checkAnyMolSelected } from "../CheckUseAllowedUtils";

/** ClearSelectionPlugin */
@Options({
  components: {},
})
export default class ClearSelectionPlugin extends PluginParent {
  menuPath = ["Edit", "Molecules", "[7] Clear Selection"];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "clearselection";

  /**
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  checkUseAllowed(): string | null {
    return checkAnyMolSelected(this);
  }

  /**
   * Runs when the user first starts the plugin.
   */
  onPluginStart() {
    this.submitJobs();
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   */
  runJob() {
    const allNodes = getAllNodesFlattened(this.$store.state["molecules"]);
    allNodes.forEach((n) => {
      if (n.selected !== SelectedType.FALSE) {
        n.selected = SelectedType.FALSE;
      }
    });
  }
}
</script>

<style scoped lang="scss"></style>
