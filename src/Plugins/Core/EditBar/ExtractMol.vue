<template>
  <PopupOneTextInput
    v-model="open"
    title="Extract Molecule"
    :intro="intro"
    placeHolder="New name of extracted molecule"
    :isActionBtnEnabled="isBtnEnabled"
    :filterFunc="filterUserData"
    actionBtnTxt="Extract"
    @onTextDone="onPopupDone"
    :defaultVal="existingTitle"
  ></PopupOneTextInput>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options } from "vue-class-component";
import PopupOneTextInput from "@/UI/Layout/Popups/PopupOneTextInput.vue";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import EditBarPluginParent from "./EditBarPluginParent";

// @ts-ignore
import cloneDeep from "lodash.clonedeep";
import {
  IMolContainer,
  SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { randomID } from "@/Core/Utils";
import { getNodeOfId } from "@/UI/Navigation/TreeView/TreeUtils";

@Options({
  components: {
    PopupOneTextInput,
  },
})
export default class ExtractMol extends EditBarPluginParent {
  menuPath = "Edit/Molecules/Extract";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "extractmol";
  intro = `The selected molecule will be extracted from its parent and will become its own molecule. Enter the new name of the extracted molecule.`;
  existingTitle = "";

  protected onPopupOpen(): void {
    this.setNodeToActOn();
    this.existingTitle = this.nodeToActOn?.title as string;
  }

  runJob(newName: string) {
    if (this.nodeToActOn) {
      // Get the parent node and remove this from it's nodes.
      if (this.nodeToActOn.parentId) {
        const parentNode = getNodeOfId(
          this.nodeToActOn.parentId,
          this.$store.state.molecules
        );

        // Remove this node from the parent's nodes list.
        if (parentNode && parentNode.nodes) {
          parentNode.nodes = parentNode.nodes.filter(
            (n) => n.id !== (this.nodeToActOn as IMolContainer).id
          );
        }
      }

      // Make a deep copy of the node.  // TODO: code in common
      this.nodeToActOn.title = newName;
      this.nodeToActOn.selected = SelectedType.FALSE;
      this.nodeToActOn.viewerDirty = true;
      this.nodeToActOn.id = randomID();
      this.nodeToActOn.focused = false;

      delete this.nodeToActOn.parentId;

      this.$store.commit("pushToList", {
        name: "molecules",
        val: this.nodeToActOn,
      });
    }
  }
}
</script>

<style scoped lang="scss"></style>
