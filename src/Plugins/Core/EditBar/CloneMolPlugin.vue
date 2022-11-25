<template>
  <PluginComponent
    ref="pluginComponent"
    v-model="open"
    title="Clone Molecule"
    :intro="intro"
    actionBtnTxt="Clone"
    :userArgs="userArgs"
    :pluginId="pluginId"
    @onPopupDone="onPopupDone"
    :hideIfDisabled="true"
  ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";

import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import FormCheckBox from "@/UI/Forms/FormCheckBox.vue";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import FormInput from "@/UI/Forms/FormInput.vue";
import {
  cloneMols,
  getNodeAncestory,
} from "@/UI/Navigation/TreeView/TreeUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { getDefaultNodeToActOn, setNodesToActOn } from "./EditBarUtils";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { FormElement, IFormText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { checkOneMolSelected } from "../CheckUseAllowedUtils";
import { ITest } from "@/Testing/ParentPluginTestFuncs";

/** CloneMolPlugin */
@Options({
  components: {
    FormInput,
    FormCheckBox,
    FormWrapper,
    PluginComponent,
  },
})
export default class CloneMolPlugin extends PluginParentClass {
  menuPath = ["Edit", "Molecules", "Clone..."];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "clonemol";
  intro = `The selected molecule will be cloned (copied). Enter the name of the new, cloned molecule.`;

  userArgs: FormElement[] = [
    {
      id: "newName",
      label: "",
      val: "",
      placeHolder: "Name of new cloned molecule",
      validateFunc: (newName: string): boolean => {
        return newName.length > 0;
      },
    } as IFormText,
  ];

  nodesToActOn: IMolContainer[] = [getDefaultNodeToActOn()];
  alwaysEnabled = true;
  logJob = false;

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
    ]);
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
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {IUserArg[]} userArgs  The user arguments.
   */
  runJobInBrowser(userArgs: IUserArg[]) {
    if (!this.nodesToActOn) {
      // Nothing to do.
      return;
    }

    // debugging below
    cloneMols(this.nodesToActOn, true)
      .then((molContainers: IMolContainer[]) => {
        const node = molContainers[0];
        node.title = this.getArg(userArgs, "newName");
        this.$store.commit("pushToList", {
          name: "molecules",
          val: node,
        });
        return;
      })
      .catch((err) => {
        console.error(err);
      });

    // debugger  // Replace below with cloneMols when ready.

    // let nodeToActOn: IMolContainer;
    // let clonedNode: Promise<IMolContainer>;

    // // Cloning the molecule. Make a deep copy of the node.
    // nodeToActOn = modelsToAtoms(this.nodesToActOn[0]);
    // clonedNode = atomsToModels(nodeToActOn).then((newestNode) => {
    //   return newestNode;
    // });

    // clonedNode
    //   .then((node) => {
    //     // Get the nodes ancestory
    //     let nodeGenealogy: IMolContainer[] = getNodeAncestory(
    //       node.id as string,
    //       this.$store.state.molecules
    //     );

    //     // Make copies of all the nodes in the ancestory, emptying the nodes
    //     // except for the last one.
    //     for (let i = 0; i < nodeGenealogy.length; i++) {
    //       nodeGenealogy[i] = {
    //         ...nodeGenealogy[i],
    //       };

    //       if (i < nodeGenealogy.length - 1) {
    //         nodeGenealogy[i].nodes = [];
    //       }
    //     }

    //     // Place each node in the ancestory under the next node.
    //     for (let i = 0; i < nodeGenealogy.length - 1; i++) {
    //       nodeGenealogy[i].nodes?.push(nodeGenealogy[i + 1]);

    //       // Also, parentId
    //       nodeGenealogy[i + 1].parentId = nodeGenealogy[i].id;
    //     }

    //     const topNode = nodeGenealogy[0];

    //     // Now you must redo all ids because they could be distinct from the
    //     // original copy.
    //     const allNodesFlattened = [topNode];
    //     if (topNode.nodes) {
    //       allNodesFlattened.push(...getAllNodesFlattened(topNode.nodes));
    //     }
    //     const oldIdToNewId = new Map<string, string>();
    //     for (const node of allNodesFlattened) {
    //       oldIdToNewId.set(node.id as string, randomID());
    //     }
    //     for (const node of allNodesFlattened) {
    //       node.id = oldIdToNewId.get(node.id as string);
    //       if (node.parentId) {
    //         node.parentId = oldIdToNewId.get(node.parentId);
    //       }
    //       node.selected = SelectedType.False;
    //       node.viewerDirty = true;
    //       node.focused = false;
    //     }

    //     // Update title of new node tree.
    //     topNode.title = this.getArg(userArgs, "newName");

    //     this.$store.commit("pushToList", {
    //       name: "molecules",
    //       val: topNode,
    //     });
    //     return;
    //   })
    //   .catch((err: any) => {
    //     console.log(err);
    //     return;
    //   });
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
    ];
  }
}
</script>

<style scoped lang="scss"></style>
