<template>
  <span>
    <PluginComponent
      v-model="open"
      :infoPayload="infoPayload"
      @onPopupDone="onPopupDone"
      actionBtnTxt="Get Properties"
      @onUserArgChanged="onUserArgChanged"
    ></PluginComponent>
  </span>
</template>

<script lang="ts">
import { fetchCompoundsProperties, fetchCid } from "../../pubchem_test";
import { checkCompoundLoaded } from "@/Plugins/Core/CheckUseAllowedUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import {
  IContributorCredit,
  ISoftwareCredit,
  Licenses,
} from "@/Plugins/PluginInterfaces";
import { Options } from "vue-class-component";
import { ITest } from "@/Testing/TestCmd";
import { Tag } from "@/Plugins/Tags/Tags";
import { FileInfo } from "@/FileSystem/FileInfo";
import { GetPropPluginParent } from "../Parents/GetPropPluginParent";
import { FailingTest } from "@/Testing/FailingTest";

/**
 * PubChemPropsPlugin
 */
@Options({
  components: {
    PluginComponent
  },
})
export default class PubChemPropsPlugin extends GetPropPluginParent {
  menuPath = "Compounds/Information/[6] Properties...";
  title = "PubChem Properties";
  softwareCredits: ISoftwareCredit[] = [
    {
      name: "PubChem",
      url: "https://pubchem.ncbi.nlm.nih.gov/",
      license: Licenses.PUBLICDOMAIN,
      citations: [
        {
          title: "PubChem 2023 update",
          authors: ["Kim, S", "Chen, J"],
          journal: "Nucleic Acids Res.",
          volume: 51,
          issue: "D1",
          pages: "D1373-D1380",
          year: 2023,
        },
      ],
    },
  ];

  contributorCredits: IContributorCredit[] = [
    {
      name: "Nonso Duaka",
    },
  ];
  pluginId = "pubchemprops";
  tags = [Tag.All];
  intro = "Get the chemical properties of selected compounds from PubChem.";
  details =
    "Contacts the online PubChem database to retrieve properties such as molecular weight, molecular formula, etc.";
  dataSetTitle = "Properties";

  /**
   * Check if the plugin is allowed to be used.
   * 
   * @returns {string | null} Error message if not allowed, null if allowed.
   */
  checkPluginAllowed(): string | null {
    return checkCompoundLoaded();
  }

  /**
   * Get the properties of the molecule.
   *
   * @param {FileInfo} molFileInfo The molecule file info.
   * @returns {Promise} The properties. Resolves to undefined if no properties
   *     found.
   */
  async getMoleculeDetails(
    molFileInfo: FileInfo
  ): Promise<{ [key: string]: any } | undefined> {
    if (!molFileInfo.treeNode) {
      return;
    }

    const smiles = molFileInfo.contents.split(" ")[0].split("\t")[0];
    const cid = await fetchCid(smiles);
    if (cid.startsWith("Error")) {
      throw new Error(cid);
    }
    const properties = await fetchCompoundsProperties(cid);

    properties[
      "CID"
    ] = `<a href="https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=Chemical-and-Physical-Properties" target="_blank">${cid}</a>`;

    return properties;
  }

  /**
   * Get the tests for the plugin.
   * 
   * @returns {Promise<ITest>} The tests.
   */
  async getTests(): Promise<ITest> {
    return FailingTest;
  }
}
</script>

<style scoped lang="scss">
.progress {
  height: 1.5rem;
}
</style>