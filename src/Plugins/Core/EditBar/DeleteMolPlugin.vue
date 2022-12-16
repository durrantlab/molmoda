<template>
  <PluginComponent
    ref="pluginComponent"
    v-model:modelValue="open"
    title="Delete Molecule"
    :intro="intro"
    actionBtnTxt="Delete"
    :userArgs="userArgs"
    :pluginId="pluginId"
    @onPopupDone="onPopupDone"
  ></PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options } from "vue-class-component";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";

import { removeNode } from "@/UI/Navigation/TreeView/TreeUtils";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { getDefaultNodeToActOn, setNodesToActOn } from "./EditBarUtils";
import { checkAnyMolSelected } from "../CheckUseAllowedUtils";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/ParentPluginTestFuncs";

/**
 * DeleteMolPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class DeleteMolPlugin extends PluginParentClass {
  menuPath = ["Edit", "Molecules", "[3] Delete..."];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "deletemol";
  intro = "Delete the selected molecule(s)?";
  userArgs: FormElement[] = [];

  nodesToActOn: IMolContainer[] = [getDefaultNodeToActOn()];
  alwaysEnabled = true;
  logJob = false;

  /**
   * Runs before the popup opens. Will almost always need this, so requiring
   * children to define it.
   */
  onBeforePopupOpen(): void {
    setNodesToActOn(this);
  }

  /**
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  checkPluginAllowed(): string | null {
    return checkAnyMolSelected(this as any);
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   */
  runJobInBrowser() {
    if (this.nodesToActOn) {
      for (const node of this.nodesToActOn) {
        removeNode(node);
      }

      // Get the parent node and remove this from it's nodes.
      // if (this.nodeToActOn.parentId) {
      //   const parentNode = getNodeOfId(
      //     this.nodeToActOn.parentId,
      //     this.$store.state.molecules
      //   );

      //   if (parentNode) {
      //     parentNode.viewerDirty = true;

      //     // Remove this node from the parent's nodes list.
      //     if (parentNode.nodes) {
      //       parentNode.nodes = parentNode.nodes.fidlter(
      //         (n) => n.id !== this.nodeToActOn?.id
      //       );
      //     }
      //   }
      // } else {
      //   // It's a root node, without a parent id.
      //   let molecules = this.$store.state.molecules;
      //   molecules = molecules.fdilter(
      //     (n: IMolContainer) => n.id !== this.nodeToActOn?.id
      //   );
      //   this.$store.commit("updateMolecules", molecules);
      // }
    }
  }

  /**
   * Gets the selenium test commands for the plugin. For advanced use.
   *
   * @gooddefault
   * @document
   * @returns {ITest[]}  The selenium test commands.
   */
  getTests(): ITest[] {
    return [
      {
        beforePluginOpens: [
          this.testLoadExampleProtein(),
          ...this.testExpandMoleculesTree("4WP4"),
          this.testSelectMoleculeInTree("Protein"),
        ],
        // closePlugin: [],
        afterPluginCloses: [],
      },
      {
        // Also test deleting a root node.
        beforePluginOpens: [
          this.testLoadExampleProtein(),
          ...this.testExpandMoleculesTree("4WP4"),
          this.testSelectMoleculeInTree("4WP4"),
        ],
        // closePlugin: [],
        afterPluginCloses: [],
      },
    ];
  }
}
</script>

<style scoped lang="scss"></style>
