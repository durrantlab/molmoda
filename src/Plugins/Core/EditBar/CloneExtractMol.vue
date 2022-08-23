<template>
  <Popup
    :title="extractOrCloneTxt + ' Molecule'"
    v-model="open"
    cancelBtnTxt="Cancel"
    :actionBtnTxt="extractOrCloneTxt"
    @onDone="onPopupDone"
    :actionBtnEnabled="isBtnEnabled"
    :onShown="onPopupOpen"
  >
    <p v-if="intro !== ''" v-html="intro"></p>
    <FormInput
      ref="formInput"
      v-model="newTitle"
      placeHolder="Name of new molecule"
      :filterFunc="filterUserData"
    ></FormInput>
    <FormWrapper cls="border-0 mt-3">
      <FormCheckBox
        id="extract"
        text="Delete original molecule (i.e., extract rather than clone)"
        v-model="doExtract"
        @onChange="onModeChange"
      ></FormCheckBox>
    </FormWrapper>
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

// @ts-ignore
import cloneDeep from "lodash.clonedeep";
import {
  IMolContainer,
  SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { randomID } from "@/Core/Utils";
import FormCheckBox from "@/UI/Forms/FormCheckBox.vue";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import FormInput from "@/UI/Forms/FormInput.vue";
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { getNodeOfId } from "@/UI/Navigation/TreeView/TreeUtils";

const cloneDescription = `The selected molecule will be cloned (copied). Enter the name of the new, cloned molecule.`;
const extractDescription = `The selected molecule will be extracted (moved) from its parent. Enter the new name of the extracted molecule.`;

@Options({
  components: {
    FormInput,
    FormCheckBox,
    FormWrapper,
    Popup,
  },
})
export default class CloneExtractMol extends EditBarPluginParent {
  menuPath = ["Edit", "Molecules", "Clone/Extract"];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "cloneextractmol";
  intro = cloneDescription;
  newTitle = "";
  doExtract = false;

  get extractOrCloneTxt(): string {
    return this.doExtract ? "Extract" : "Clone";
  }

  public onPopupOpen(): void {
    let focusTarget = (this.$refs.formInput as any).$refs
      .inputElem as HTMLInputElement;
    focusTarget.focus();

    this.setNodeToActOn();
    this.doExtract = false;
    this.newTitle = (this.nodeToActOn?.title as string) + " (cloned)";
  }

  onModeChange() {
    if (this.doExtract) {
      this.intro = extractDescription;
      this.newTitle = this.newTitle.replace(/ \(cloned\)$/gm, "");
    } else {
      this.intro = cloneDescription;
      if (!this.newTitle.includes(" (cloned)")) {
        this.newTitle += " (cloned)";
      }
    }
  }

  runJob() {
    if (this.nodeToActOn) {
      let newNode: IMolContainer;
      if (this.doExtract) {
        newNode = this.nodeToActOn;
        // Get the parent node and remove this from it's nodes.
        if (newNode.parentId) {
          const parentNode = getNodeOfId(
            newNode.parentId,
            this.$store.state.molecules
          );

          // Remove this node from the parent's nodes list.
          if (parentNode && parentNode.nodes) {
            parentNode.nodes = parentNode.nodes.filter(
              (n) => n.id !== newNode.id
            );
          }
        }
      } else {
        // Cloning. Make a deep copy of the node.
        newNode = cloneDeep(this.nodeToActOn);
      }

      newNode.title = this.newTitle;
      newNode.selected = SelectedType.FALSE;
      newNode.viewerDirty = true;
      newNode.id = randomID();
      newNode.focused = false;

      delete newNode.parentId;

      this.$store.commit("pushToList", {
        name: "molecules",
        val: newNode,
      });
    }
  }
}
</script>

<style scoped lang="scss"></style>
