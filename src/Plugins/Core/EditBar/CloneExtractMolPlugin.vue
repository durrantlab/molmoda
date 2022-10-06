<template>
  <PluginComponent
    ref="pluginComponent"
    v-model:modelValue="open"
    :title="extractOrCloneTxt + ' Molecule'"
    :intro="intro"
    :actionBtnTxt="extractOrCloneTxt"
    :userInputs="userInputs"
    @onPopupDone="onPopupDone"
    @onDataChanged="onDataChanged"
  ></PluginComponent>

  <!-- <PopupPluginParent
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
  </PopupPluginParent> -->
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";

import {
  IMolContainer,
  SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { randomID } from "@/Core/Utils";
import FormCheckBox from "@/UI/Forms/FormCheckBox.vue";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import FormInput from "@/UI/Forms/FormInput.vue";
import {
  getAllNodesFlattened,
  getNodeOfId,
} from "@/UI/Navigation/TreeView/TreeUtils";
import {
  atomsToModels,
  modelsToAtoms,
} from "@/FileSystem/LoadSaveMolModels/MolsToFromJSON";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass, RunJobReturn } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { getDefaultNodeToActOn, setNodeToActOn } from "./EditBarUtils";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import {
  FormElement,
  FormElemType,
  IFormCheckbox,
  IFormText,
IGenericFormElement,
} from "@/UI/Forms/FormFull/FormFullInterfaces";

const cloneDescription = `The selected molecule will be cloned (copied). Enter the name of the new, cloned molecule.`;
const extractDescription = `The selected molecule will be extracted (moved) from its parent. Enter the new name of the extracted molecule.`;

/** CloneExtractMolPlugin */
@Options({
  components: {
    FormInput,
    FormCheckBox,
    FormWrapper,
    PluginComponent,
  },
})
export default class CloneExtractMolPlugin extends PluginParentClass {
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

  userInputs: FormElement[] = [
    {
      id: "newName",
      label: "",
      val: "",
      placeHolder: "Name of new molecule",
      validateFunc: (newName: string): boolean => {
        return newName.length > 0;
      },
    } as IFormText,
    {
      type: FormElemType.Checkbox,
      id: "doExtract",
      label: "Delete original molecule (extract rather than clone)",
      val: false,
    } as IFormCheckbox,
  ];

  nodeToActOn: IMolContainer = getDefaultNodeToActOn();

  get doExtract(): boolean {
    return (this.userInputs[1] as IGenericFormElement).val as boolean;
  }



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
    setNodeToActOn(this);
    this.updateUserVars(
      [
        {
          name: "newName",
          val: this.nodeToActOn?.title + " (cloned)",
        } as IUserArg,
        {
          name: "doExtract",
          val: false,
        } as IUserArg,
      ]
    );
  }

  /**
   * Runs when the mode changes (between clone and extract).
   */
   onDataChanged(userVars: IUserArg[]): void {
    const newName = userVars[0].val as string;

    this.intro = this.doExtract ? extractDescription : cloneDescription;

    // debugger;
    // if (this.doExtract) {
    //   this.newTitle = newName.replace(/ \(cloned\)$/gm, "");
    // } else {
    //   if (!newName.includes(" (cloned)")) {
    //     this.newTitle += " (cloned)";
    //   }
    // }
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {IUserArg[]} parameters  The user parameters.
   * @returns {RunJobReturn}  A promise that resolves when the job is
   *     done.
   */
  runJob(parameters: IUserArg[]): RunJobReturn {
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
