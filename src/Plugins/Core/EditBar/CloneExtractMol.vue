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
import { getAllNodesFlattened, getNodeOfId } from "@/UI/Navigation/TreeView/TreeUtils";
import {
  atomsToModels,
  modelsToAtoms,
} from "@/FileSystem/LoadSaveMolModels/MolsToFromJSON";

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

  get allowExtract(): boolean {
    if (this.nodeToActOn === undefined || this.nodeToActOn === null) {
      return false;
    }
    if (this.nodeToActOn.parentId) {
      return true;
    }
    return false;
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

      convertedNode.then((node) => {
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
      });
    }
  }
}
</script>

<style scoped lang="scss"></style>
