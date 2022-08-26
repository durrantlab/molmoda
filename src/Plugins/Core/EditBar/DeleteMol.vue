<template>
  <Popup
    title="Delete Molecule"
    v-model="open"
    cancelBtnTxt="Cancel"
    actionBtnTxt="Delete"
    @onDone="onPopupDone"
    :actionBtnEnabled="true"
    :onShown="onPopupOpen"
  >
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

@Options({
  components: {
    Popup,
  },
})
export default class DeleteMol extends EditBarPluginParent {
  menuPath = ["Edit", "Molecules", "[3] Delete"];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "deletemol";
  intro = "Delete mol...";

  public onPopupOpen(): void {
    this.setNodeToActOn();
  }

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
