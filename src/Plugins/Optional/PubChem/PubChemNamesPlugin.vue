<template>
  <span>
    <PluginComponent
      v-model="open"
      :infoPayload="infoPayload"
      @onPopupDone="onPopupDone"
      actionBtnTxt="Get Names"
      @onUserArgChanged="onUserArgChanged"
      @onMolCountsChanged="onMolCountsChanged"
    ></PluginComponent>
  </span>
</template>
  
  <script lang="ts">
import {
  fetchSynonyms,
  fetchCid,
  fetchCompoundsProperties,
} from "./PubChemAPI";
import { checkCompoundLoaded } from "@/Plugins/CheckUseAllowedUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import {
  IContributorCredit,
  ISoftwareCredit,
  Licenses,
} from "@/Plugins/PluginInterfaces";
import { Options } from "vue-class-component";
import { ITest } from "@/Testing/TestInterfaces";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { GetPropPluginParent } from "../../Parents/GetPropPluginParent";
import { TestCmdList } from "@/Testing/TestCmdList";
import { easyNeutralizeSMILES } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasySmilesUtils";

/**
 * PubChemNamesPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class PubChemNamesPlugin extends GetPropPluginParent {
  menuPath = "Compounds/[5] Information/[5] Names...";
  title = "Compound Names";
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
      url: "https://www.linkedin.com/in/nonso-duaka-958b91316/",
    },
  ];
  pluginId = "pubchemnames";
  tags = [Tag.Cheminformatics];
  intro = "Get the names/synonyms of selected compounds from PubChem.";
  details =
    "Contacts the online PubChem database to retrieve up to five names for each compound.";
  dataSetTitle = "Names";

  // Component state
  resultsData: { [key: string]: any } = {};
  isProcessing = false;
  processedCount = 0;
  totalToProcess = 0;

  /**
   * Check if the plugin is allowed to run.
   *
   * @returns {string | null} Error message if not allowed, null if allowed.
   */
  checkPluginAllowed(): string | null {
    return checkCompoundLoaded();
  }

  /**
   * Get the names of the molecule.
   *
   * @param {FileInfo} molFileInfo The molecule file info.
   * @returns {Promise} The names of the molecule.
   */
  async getMoleculeDetails(
    molFileInfo: FileInfo
  ): Promise<{ [key: string]: any } | undefined> {
    if (!molFileInfo.treeNode) {
      return;
    }

    const smiles = molFileInfo.contents.split(" ")[0].split("\t")[0];
    const cid = await fetchCid(smiles);
    if (cid === "0") {
      return {
        CID: `PubChem compound not found! <a href="https://pubchem.ncbi.nlm.nih.gov/#query=${easyNeutralizeSMILES(smiles)}" target="_blank">Search?</a>`,
      };
    }

    // Get IUPAC name and synonyms
    const properties = await fetchCompoundsProperties(cid);
    if (properties.error) {
      return {
        CID: `<a href="https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=Biological-Test-Results" target="_blank">${cid}</a>: ${properties.error}`
      }

      // return {
      //   CID: `PubChem compound not found!`,
      //   // "Name 1": "N/A",
      //   // "Name 2": "N/A",
      //   // "Name 3": "N/A",
      //   // "Name 4": "N/A",
      //   // "Name 5": "N/A",
      // };
    }

    const iupacName = properties["IUPAC Name"].toLowerCase();

    const synonymsData = await fetchSynonyms(cid);
    let synonyms = Array.isArray(synonymsData.Synonyms)
      ? synonymsData.Synonyms.map((s: string) => s.toLowerCase())
      : [];

    // Create unique set of names starting with IUPAC
    const uniqueNames = new Set<string>([iupacName]);

    // Add remaining synonyms until we have 5 unique names
    for (const synonym of synonyms) {
      if (uniqueNames.size >= 5) break;
      uniqueNames.add(synonym);
    }

    const finalNames = Array.from(uniqueNames);
    while (finalNames.length < 5) {
      finalNames.push("N/A");
    }

    // Format for display
    return {
      //   Compound: molFileInfo.treeNode.title,
      CID: `<a href="https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=Depositor-Supplied-Synonyms" target="_blank">${cid}</a>`,
      "Name 1": finalNames[0] || "N/A",
      "Name 2": finalNames[1] || "N/A",
      "Name 3": finalNames[2] || "N/A",
      "Name 4": finalNames[3] || "N/A",
      "Name 5": finalNames[4] || "N/A",
    };
  }

  /**
   * Get the tests for the plugin.
   *
   * @returns {Promise<ITest>} The tests.
   */
  async getTests(): Promise<ITest> {
    return {
      beforePluginOpens: new TestCmdList()
        .loadSMILESMolecule(
          // Below is not in pubchem as of 12/28/2024
          "FCCCC#CC1=CC(=CC(=C1)C#CC2=CC(=C(C=C2C#CC(C)(C)C)C3OCCO3)C#CC(C)(C)C)C#CCCC",
          true,
          undefined
        )
        .loadSMILESMolecule(
          "CC(=O)OC1=CC=CC=C1C(=O)O",
          true,
          undefined,
          "molecule2"
        ),
      afterPluginCloses: new TestCmdList()
        .waitUntilRegex("#modal-tabledatapopup", "aspirin")
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