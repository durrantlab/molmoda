<template>
  <Popup
    title="Delete Molecule"
    v-model="open"
    cancelBtnTxt="Cancel"
    actionBtnTxt="Delete"
    @onDone="onPopupDone"
    :isActionBtnEnabled="true"
  >
    <!-- :onShown="onPopupOpen" -->
    <p v-if="intro !== ''" v-html="intro"></p>
  </Popup>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options } from "vue-class-component";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import EditBarPluginParent from "./EditBarPluginParent";

import Popup from "@/UI/Layout/Popups/Popup.vue";
import { getNodeOfId } from "@/UI/Navigation/TreeView/TreeUtils";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";

/**
 * DeleteMolPlugin
 */
@Options({
  components: {
    Popup,
  },
})
export default class DeleteMolPlugin extends EditBarPluginParent {
  menuPath = ["Edit", "Molecules", "[3] Delete"];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "deletemol";
  intro = "Delete the selected molecule.";

  /**
   * Runs before the popup opens. Will almost always need this, so requiring
   * children to define it.
   */
  beforePopupOpen(): void {
    this.setNodeToActOn();
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   */
  runJob() {
    if (this.nodeToActOn) {
      // Get the parent node and remove this from it's nodes.
      if (this.nodeToActOn.parentId) {
        const parentNode = getNodeOfId(
          this.nodeToActOn.parentId,
          this.$store.state.molecules
        );

        if (parentNode) {
          parentNode.viewerDirty = true;

          // Remove this node from the parent's nodes list.
          if (parentNode.nodes) {
            parentNode.nodes = parentNode.nodes.filter(
              (n) => n.id !== this.nodeToActOn?.id
            );
          }
        }
      } else {
        // It's a root node, without a parent id.
        let molecules = this.$store.state.molecules;
        molecules = molecules.filter((n: IMolContainer) => n.id !== this.nodeToActOn?.id);
        this.$store.commit("updateMolecules", molecules);
      }

      // newNode.title = this.newTitle;
      // newNode.selected = SelectedType.FALSE;
      // newNode.viewerDirty = true;
      // newNode.id = randomID();
      // newNode.focused = false;

      // delete newNode.parentId;

      // this.$store.commit("pushToList", {
      //   name: "molecules",
      //   val: newNode,
      // });
    }
  }
}
</script>

<style scoped lang="scss"></style>
