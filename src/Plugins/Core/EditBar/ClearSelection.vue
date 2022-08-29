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
import { checkSomethingSelected } from "./Utils";

@Options({
  components: {},
})
export default class ClearSelection extends PluginParent {
  menuPath = ["Edit", "Molecules", "[7] Clear Selection"];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "clearselection";

  checkUseAllowed(): string | null {
    return checkSomethingSelected(this);
  }

  onPluginStart() {
    this.submitJobs();
  }

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
