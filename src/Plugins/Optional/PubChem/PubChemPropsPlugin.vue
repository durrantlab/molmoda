<template>
  <span>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onPopupDone="onPopupDone" actionBtnTxt="Get Properties"
      @onUserArgChanged="onUserArgChanged" @onMolCountsChanged="onMolCountsChanged"></PluginComponent>
  </span>
</template>

<script lang="ts">
import { fetchCompoundsProperties } from "./PubChemAPI";
import { checkCompoundLoaded } from "@/Plugins/CheckUseAllowedUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import {
  IContributorCredit,
} from "@/Plugins/PluginInterfaces";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { GetPropPluginParent } from "../../Parents/GetPropPluginParent";
import { TestCmdList } from "@/Testing/TestCmdList";
import { Component } from "vue-facing-decorator";
import { ITest } from "@/Testing/TestInterfaces";
import { pubchemCredit, lookupCid } from "./PubChemCommon";

/**
 * PubChemPropsPlugin
 */
@Component({
  components: {
    PluginComponent,
  },
})
export default class PubChemPropsPlugin extends GetPropPluginParent {
  menuPath = "Compounds/Information/[6] Properties...";
  title = "PubChem Properties";
  softwareCredits = [pubchemCredit];

  contributorCredits: IContributorCredit[] = [
    {
      name: "Nonso Duaka",
      url: "https://www.linkedin.com/in/nonso-duaka-958b91316/",
    },
  ];
  pluginId = "pubchemprops";
  tags = [Tag.Cheminformatics];
  intro = "Get the chemical properties of selected compounds from PubChem.";
  details =
    "This plugin contacts the online PubChem database to retrieve properties such as molecular weight, molecular formula, etc.";
  dataSetTitle = "Properties";

  /**
   * Check if the plugin is allowed to be used.
   * @returns {string | null} Error message if not allowed, null if allowed.
   */
  checkPluginAllowed(): string | null {
    return checkCompoundLoaded();
  }

  /**
   * Get the properties of the molecule.
   * @param {FileInfo} molFileInfo The molecule file info.
   * @returns {Promise} The properties. Resolves to undefined if no properties
   *     found.
   */
  async getMoleculeDetails(
    molFileInfo: FileInfo
  ): Promise<{ [key: string]: string } | undefined> {
    if (!molFileInfo.treeNode) {
      return;
    }
    const lookup = await lookupCid(molFileInfo);
    if (!lookup.found) {
      return { CID: lookup.notFoundHtml };
    }
    let properties = await fetchCompoundsProperties(lookup.cid);
    if (properties.error) {
      return { CID: `${lookup.cidLink}: ${properties.error}` };
    }

    properties = {
      CID: lookup.cidLink,
      ...properties,
    };

    return properties;
  }

  /**
   * Get the tests for the plugin.
   * @returns {Promise<ITest>} The tests.
   */
  async getTests(): Promise<ITest> {
    return {
      beforePluginOpens: () => new TestCmdList()
        .loadSMILESMolecule(
          // Below is not in pubchem as of 12/28/2024
          "FCCCC#CC1=CC(=CC(=C1)C#CC2=CC(=C(C=C2C#CC(C)(C)C)C3OCCO3)C#CC(C)(C)C)C#CCCC",
          true,
          undefined
        )
        .loadSMILESMolecule(
          "CC(=O)OC1=CC=CC=C1C(=O)O",
          true,
          "molecule2"
        ),
      afterPluginCloses: () => new TestCmdList()
        .waitUntilRegex("#modal-tabledatapopup", "C9H8O4")
        .waitUntilRegex("#modal-tabledatapopup", "PubChem compound not found"),
    };
  }
}
</script>

<style scoped lang="scss">
.progress {
  height: 1.5rem;
}
</style>