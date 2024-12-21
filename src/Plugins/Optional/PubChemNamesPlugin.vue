<template>
  <span>
    <PluginComponent
      v-model="open"
      :infoPayload="infoPayload"
      @onPopupDone="onPopupDone"
      actionBtnTxt="Get Names"
      @onUserArgChanged="onUserArgChanged"
    ></PluginComponent>
  </span>
</template>
  
  <script lang="ts">
import {
  fetchSynonyms,
  fetchCid,
  fetchCompoundsProperties,
} from "../../pubchem_test";
import { checkCompoundLoaded } from "@/Plugins/Core/CheckUseAllowedUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import {
  IContributorCredit,
  ISoftwareCredit,
  Licenses,
} from "@/Plugins/PluginInterfaces";
import Alert from "@/UI/Layout/Alert.vue";
import { Options } from "vue-class-component";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { Tag } from "@/Plugins/Tags/Tags";
import { FileInfo } from "@/FileSystem/FileInfo";
import { GetPropPluginParent } from "../Parents/GetPropPluginParent";

@Options({
  components: {
    PluginComponent,
    Alert,
  },
})
export default class PubChemNamesPlugin extends GetPropPluginParent {
  menuPath = "Compounds/[5] Names...";
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

  contributorCredits: IContributorCredit[] = [];
  pluginId = "pubchemnames";
  tags = [Tag.All];
  intro = "Get the names/synonyms of selected compounds from PubChem.";
  details =
    "Contacts the online PubChem database to retrieve up to five names for each compound.";
  dataSetTitle = "Names";

  // Component state
  resultsData: { [key: string]: any } = {};
  isProcessing = false;
  processedCount = 0;
  totalToProcess = 0;

  checkPluginAllowed(): string | null {
    return checkCompoundLoaded();
  }

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

    // Get IUPAC name and synonyms
    const properties = await fetchCompoundsProperties(cid);
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
      "Name 1": finalNames[0] || "N/A",
      "Name 2": finalNames[1] || "N/A",
      "Name 3": finalNames[2] || "N/A",
      "Name 4": finalNames[3] || "N/A",
      "Name 5": finalNames[4] || "N/A",
      CID: `<a href="https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=Depositor-Supplied-Synonyms" target="_blank">${cid}</a>`,
    };
  }

  async getTests(): Promise<ITest> {
    return {
      beforePluginOpens: new TestCmdList().loadExampleMolecule(),
      afterPluginCloses: new TestCmdList().waitUntilRegex("#data", "Names"),
    };
  }
}
</script>
  
  <style scoped lang="scss">
.progress {
  height: 1.5rem;
}
</style>