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

import { getNodeOfId } from "@/UI/Navigation/TreeView/TreeUtils";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { getDefaultNodeToActOn, setNodeToActOn } from "./EditBarUtils";
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
  intro = "Delete the selected molecule?";
  userArgs: FormElement[] = [];

  nodeToActOn: IMolContainer = getDefaultNodeToActOn();
  alwaysEnabled = true;

  /**
   * Runs before the popup opens. Will almost always need this, so requiring
   * children to define it.
   */
  onBeforePopupOpen(): void {
    setNodeToActOn(this);
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
   *
   * @returns {Promise<undefined>}  A promise that resolves when the job is
   *     done.
   */
  runJobInBrowser(): Promise<undefined> {
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
        molecules = molecules.filter(
          (n: IMolContainer) => n.id !== this.nodeToActOn?.id
        );
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

    return Promise.resolve(undefined);
  }

  /**
   * Gets the selenium test commands for the plugin. For advanced use.
   *
   * @gooddefault
   * @document
   * @returns {ITest}  The selenium test commands.
   */
  getTests(): ITest {
    return {
      beforePluginOpens: [
        this.testLoadExampleProtein(),
        ...this.testExpandMoleculesTree("4WP4.pdb"),
        this.testSelectMoleculeInTree("Protein"),
      ],
      // closePlugin: [],
      afterPluginCloses: [],
    };
  }
}
</script>

<style scoped lang="scss"></style>
