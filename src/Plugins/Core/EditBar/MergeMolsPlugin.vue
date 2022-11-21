<template>
  <PluginComponent
    ref="pluginComponent"
    v-model:modelValue="open"
    title="Merge Molecules"
    :intro="intro"
    actionBtnTxt="Merge"
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
 * MergeMolsPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class MergeMolsPlugin extends PluginParentClass {
  menuPath = ["Edit", "Molecules", "[3] Merge..."];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "mergemols";
  intro = "Merge the selected molecules?";
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
      ****

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
      // TODO: Need tests.
      // {
      //   beforePluginOpens: [
      //     this.testLoadExampleProtein(),
      //     ...this.testExpandMoleculesTree("4WP4"),
      //     this.testSelectMoleculeInTree("Protein"),
      //   ],
      //   // closePlugin: [],
      //   afterPluginCloses: [],
      // },
      // {
      //   // Also test deleting a root node.
      //   beforePluginOpens: [
      //     this.testLoadExampleProtein(),
      //     ...this.testExpandMoleculesTree("4WP4"),
      //     this.testSelectMoleculeInTree("4WP4"),
      //   ],
      //   // closePlugin: [],
      //   afterPluginCloses: [],
      // },
    ];
  }
}
</script>

<style scoped lang="scss"></style>
