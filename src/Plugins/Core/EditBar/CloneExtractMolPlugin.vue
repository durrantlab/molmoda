<template>
  <PluginComponent
    ref="pluginComponent"
    v-model:modelValue="open"
    :title="extractOrCloneTxt + ' Molecule'"
    :intro="intro"
    :actionBtnTxt="extractOrCloneTxt"
    :userArgs="userArgs"
    :pluginId="pluginId"
    @onPopupDone="onPopupDone"
    @onDataChanged="onDataChanged"
    :hideIfDisabled="true"
  ></PluginComponent>

  <!-- <PopupPluginParent
    :onShown="onPopupOpen"
    :beforeShown="onBeforePopupOpen"
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
  getNodeAncestory,
  removeNode,
} from "@/UI/Navigation/TreeView/TreeUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { getDefaultNodeToActOn, setNodesToActOn } from "./EditBarUtils";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import {
  FormElement,
  FormElemType,
  IFormCheckbox,
  IFormText,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { checkOneMolSelected } from "../CheckUseAllowedUtils";
import { ITest, TestCommand } from "@/Testing/ParentPluginTestFuncs";
import { atomsToModels } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/Utils";
import { modelsToAtoms } from "@/FileSystem/LoadSaveMolModels/Utils";

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
  menuPath = ["Edit", "Molecules", "Clone/Extract..."];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "cloneextractmol";
  intro = cloneDescription;

  userArgs: FormElement[] = [
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
      enabled: false,
    } as IFormCheckbox,
  ];

  nodesToActOn: IMolContainer[] = [getDefaultNodeToActOn()];
  alwaysEnabled = true;
  logJob = false;
  doExtract = false; // shadows userArgs for reactivity

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
    if (
      this.nodesToActOn === undefined ||
      this.nodesToActOn === null ||
      this.nodesToActOn.length === 0
    ) {
      return false;
    }
    return this.nodesToActOn[0].parentId !== undefined;
  }

  /**
   * Runs before the popup opens. Good for initializing/resenting variables
   * (e.g., clear inputs from previous open).
   */
  public onBeforePopupOpen(): void {
    setNodesToActOn(this);

    const nodeToActOn = (this.nodesToActOn as IMolContainer[])[0];

    // Get top of molecule title.
    let title = getNodeAncestory(
      nodeToActOn.id as string,
      this.$store.state.molecules
    )[0].title;

    this.updateUserArgs([
      {
        name: "newName",
        // val: title + ":" + nodeToActOn.title + " (cloned)",
        val: title + " (cloned)",
      } as IUserArg,
      {
        name: "doExtract",
        val: false,
      } as IUserArg,
    ]);
    this.doExtract = false;
    // this.updateUserArgEnabled("doExtract", this.allowExtract);
  }

  /**
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  checkPluginAllowed(): string | null {
    return checkOneMolSelected(this as any);
  }

  /**
   * Runs when the mode changes (between clone and extract).
   *
   * @param {IUserArg[]} userArgs  The updated user variables.
   */
  onDataChanged(userArgs: IUserArg[]): void {
    let newName = this.getArg(userArgs, "newName") as string;
    this.doExtract = this.getArg(userArgs, "doExtract") as boolean;
    this.intro = this.doExtract ? extractDescription : cloneDescription;

    if (this.doExtract) {
      newName = newName.replace(/ \(cloned\)$/gm, "");
    } else {
      if (!newName.includes(" (cloned)")) {
        newName += " (cloned)";
      }
    }

    this.updateUserArgs([
      {
        name: "newName",
        val: newName,
      } as IUserArg,
    ]);
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {IUserArg[]} userArgs  The user arguments.
   */
  runJobInBrowser(userArgs: IUserArg[]) {
    if (!this.nodesToActOn) {
      // Nothing to do.
      return;
    }

    let nodeToActOn: IMolContainer;
    let clonedOrExtractedNode: Promise<IMolContainer>;
    if (this.doExtract) {
      // You're going to extract the molecule.

      nodeToActOn = this.nodesToActOn[0];
      clonedOrExtractedNode = Promise.resolve(nodeToActOn);

      // if (nodeToActOn.parentId) {
      //   // Get the parent node
      //   const parentNode = getNodeOfId(
      //     nodeToActOn.parentId,
      //     this.$store.state.molecules
      //   );

      //   // Remove this node from the parent's nodes list.
      //   if (parentNode && parentNode.nodes) {
      //     parentNode.nodes = parentNode.nodes.filter(
      //       (n) => n.id !== nodeToActOn.id
      //     );
      //   }
      // }
    } else {
      // Cloning the molecule. Make a deep copy of the node.
      nodeToActOn = modelsToAtoms(this.nodesToActOn[0]);
      clonedOrExtractedNode = atomsToModels(nodeToActOn).then((newestNode) => {
        return newestNode;
      });
    }

    clonedOrExtractedNode
      .then((node) => {
        // Get the nodes ancestory
        let nodeGenealogy: IMolContainer[] = getNodeAncestory(
          node.id as string,
          this.$store.state.molecules
        );

        // Make copies of all the nodes in the ancestory, emptying the nodes
        // except for the last one.
        for (let i = 0; i < nodeGenealogy.length; i++) {
          nodeGenealogy[i] = {
            ...nodeGenealogy[i],
          };

          if (i < nodeGenealogy.length - 1) {
            nodeGenealogy[i].nodes = [];
          }
        }

        // Place each node in the ancestory under the next node.
        for (let i = 0; i < nodeGenealogy.length - 1; i++) {
          nodeGenealogy[i].nodes?.push(nodeGenealogy[i + 1]);

          // Also, parentId
          nodeGenealogy[i + 1].parentId = nodeGenealogy[i].id;
        }

        const topNode = nodeGenealogy[0];

        // Now you must redo all ids because they could be distinct from the
        // original copy.
        const allNodesFlattened = [topNode];
        if (topNode.nodes) {
          allNodesFlattened.push(...getAllNodesFlattened(topNode.nodes));
        }
        const oldIdToNewId = new Map<string, string>();
        for (const node of allNodesFlattened) {
          oldIdToNewId.set(node.id as string, randomID());
        }
        for (const node of allNodesFlattened) {
          node.id = oldIdToNewId.get(node.id as string);
          if (node.parentId) {
            node.parentId = oldIdToNewId.get(node.parentId);
          }
          node.selected = SelectedType.False;
          node.viewerDirty = true;
          node.focused = false;
        }

        // Update title of new node tree.
        topNode.title = this.getArg(userArgs, "newName");

        if (this.doExtract) {
          // Delete from original node tree
          removeNode(nodeToActOn);
        }

        this.$store.commit("pushToList", {
          name: "molecules",
          val: topNode,
        });
        return;
      })
      .catch((err: any) => {
        console.log(err);
        return;
      });
  }

  /**
   * Gets the selenium test commands for the plugin. For advanced use.
   *
   * @gooddefault
   * @document
   * @returns {ITest[]}  The selenium test commandss.
   */
  getTests(): ITest[] {
    return [
      // First test cloning
      {
        beforePluginOpens: [
          this.testLoadExampleProtein(),
          ...this.testExpandMoleculesTree("4WP4"),
          this.testSelectMoleculeInTree("Protein"),
        ],
        afterPluginCloses: [
          this.testWaitForRegex("#navigator", "Protein .cloned."),
        ],
      },

      // Second test extracting
      {
        beforePluginOpens: [
          this.testWaitForRegex("#styles", "Protein"),
          ...this.testExpandMoleculesTree("4WP4"),
          this.testSelectMoleculeInTree("Protein"),
        ],
        populateUserArgs: [
          {
            cmd: TestCommand.Click,
            selector: "#modal-cloneextractmol #doExtract-cloneextractmol-item",
          },
          this.testUserArg("newName", "2"),
        ],
        afterPluginCloses: [this.testWaitForRegex("#navigator", "Protein2")],
      },
    ];
  }
}
</script>

<style scoped lang="scss"></style>
