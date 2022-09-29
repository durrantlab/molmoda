<template>
  <Popup
    :title="extractOrCloneTxt + ' Molecule'"
    v-model="open"
    cancelBtnTxt="Cancel"
    :actionBtnTxt="extractOrCloneTxt"
    @onDone="onPopupDone"
    :isActionBtnEnabled="isBtnEnabled(newTitle)"
    :onShown="onPopupOpen"
    :beforeShown="beforePopupOpen"
  >
    <p v-if="intro !== ''" v-html="intro"></p>
    <FormInput
      ref="formInput"
      v-model="newTitle"
      placeHolder="Name of new molecule"
      :filterFunc="filterUserData"
    ></FormInput>
    <FormWrapper cls="border-0 mt-3" v-if="allowExtract">
      <FormCheckBox
        id="extract"
        text="Delete original molecule (extract rather than clone)"
        v-model="doExtract"
        @onChange="onModeChange"
      ></FormCheckBox>
    </FormWrapper>
  </Popup>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import EditBarPluginParent from "./EditBarPluginParent";

import {
  IMolContainer,
  SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { randomID } from "@/Core/Utils";
import FormCheckBox from "@/UI/Forms/FormCheckBox.vue";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import FormInput from "@/UI/Forms/FormInput.vue";
import Popup from "@/UI/Layout/Popups/Popup.vue";
import {
  getAllNodesFlattened,
  getNodeOfId,
} from "@/UI/Navigation/TreeView/TreeUtils";
import {
  atomsToModels,
  modelsToAtoms,
} from "@/FileSystem/LoadSaveMolModels/MolsToFromJSON";
import { RunJobReturn } from "@/Plugins/Parents/PluginParent/PluginParent";

const cloneDescription = `The selected molecule will be cloned (copied). Enter the name of the new, cloned molecule.`;
const extractDescription = `The selected molecule will be extracted (moved) from its parent. Enter the new name of the extracted molecule.`;

/** CloneExtractMolPlugin */
@Options({
  components: {
    FormInput,
    FormCheckBox,
    FormWrapper,
    Popup,
  },
})
export default class CloneExtractMolPlugin extends EditBarPluginParent {
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

  /**
   * Returns text appropriate for the mode.
   * 
   * @returns {string} The text, either "Extract" or "Clone".
   */
  get extractOrCloneTxt(): string {
    return this.doExtract ? "Extract" : "Clone";
  }

  /**
   * Whether to allow the user to select extract instead of clone (default).
   *
   * @returns {boolean} True if the user can select extract, false otherwise.
   */
  get allowExtract(): boolean {
    if (this.nodeToActOn === undefined || this.nodeToActOn === null) {
      return false;
    }
    return this.nodeToActOn.parentId !== undefined;
  }

  /**
   * Runs before the popup opens. Good for initializing/resenting variables
   * (e.g., clear inputs from previous open).
   */
  public beforePopupOpen(): void {
    this.setNodeToActOn();
    this.doExtract = false;
    this.newTitle = this.nodeToActOn?.title + " (cloned)";
  }

  /**
   * Runs after the popup opens. Good for setting focus in text elements.
   */
  onPopupOpen(): void {
    let focusTarget = (this.$refs.formInput as any).$refs
      .inputElem as HTMLInputElement;
    focusTarget.focus();
  }

  /**
   * Runs when the mode changes (between clone and extract).
   */
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

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @returns {RunJobReturn}  A promise that resolves when the job is done.
   */
  runJob(): RunJobReturn {
    if (this.nodeToActOn) {
      let newerNode: IMolContainer;
      let convertedNode: Promise<IMolContainer>;
      if (this.doExtract) {
        // You're going to extract the molecule.

        newerNode = this.nodeToActOn;
        convertedNode = Promise.resolve(newerNode);

        // Get the parent node and remove this from it's nodes.
        if (newerNode.parentId) {
          const parentNode = getNodeOfId(
            newerNode.parentId,
            this.$store.state.molecules
          );

          // Remove this node from the parent's nodes list.
          if (parentNode && parentNode.nodes) {
            parentNode.nodes = parentNode.nodes.filter(
              (n) => n.id !== newerNode.id
            );
          }
        }
      } else {
        // Cloning the molecule. Make a deep copy of the node.
        newerNode = modelsToAtoms(this.nodeToActOn);
        convertedNode = atomsToModels(newerNode).then((newestNode) => {
          return newestNode;
        });
      }

      return convertedNode
        .then((node) => {
          node.title = this.newTitle;

          let subNodes = getAllNodesFlattened([node]);
          subNodes.forEach((n) => {
            n.id = randomID();
            n.selected = SelectedType.FALSE;
            n.viewerDirty = true;
            n.focused = false;
          });

          delete node.parentId;

          this.$store.commit("pushToList", {
            name: "molecules",
            val: node,
          });

          return undefined;
        })
        .catch((err: any) => {
          console.log(err);
          return undefined;
        });
    }

    return Promise.resolve(undefined);
  }
}
</script>

<style scoped lang="scss"></style>
