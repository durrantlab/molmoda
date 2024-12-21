<template>
  <span>
    <PluginComponent
      v-model="open"
      :infoPayload="infoPayload"
      @onPopupDone="onPopupDone"
      actionBtnTxt="Get Bioassays"
      @onUserArgChanged="onUserArgChanged"
    ></PluginComponent>
  </span>
</template>
  
<script lang="ts">
import { fetchActiveAssays, fetchCid } from "../../pubchem_test";
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
export default class PubChemBioassaysPlugin extends GetPropPluginParent {
  menuPath = "Compounds/[7] Get PubChem Bioassays...";
  title = "PubChem Bioassays";
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

  dataSetTitle = "PubChemBioassays";
  contributorCredits: IContributorCredit[] = [];
  pluginId = "pubchembioassays";
  tags = [Tag.All];
  intro = "Get the bioassay data of selected compounds from PubChem.";
  details =
    "Contacts the online PubChem database to retrieve up to 10 active bioassays for each compound.";

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

    const bioassayData = await fetchActiveAssays(cid);
    if (bioassayData.error) {
      throw new Error(bioassayData.error);
    }

    const activeAssays = bioassayData.ActiveAssays.slice(0, 10); // Get top 10 bioassays
    const assayDescriptions = activeAssays.map((assay: any) => {
      // Add a string formatted like "DSSTox (FDAMDD) FDA Maximum
      // (Recommended) Daily Dose Database, AID 1234. Target:
      // Neuraminidase" But Target might not be given, so only add if
      // it is not "".

      let assayDesc = `${assay["Assay Name"]}. AID: <a href="https://pubchem.ncbi.nlm.nih.gov/bioassay/${assay["AID"]}#section=Data-Table" target="_blank">${assay["AID"]}</a>.`;
      if (assay["Assay Type"]) {
        assayDesc += ` Assay type: ${assay["Assay Type"].toLowerCase()}.`;
      }

      return assayDesc;
    });

    const formattedAssays: { [key: string]: any } = {};
    for (let i = 0; i < assayDescriptions.length; i++) {
      formattedAssays[`Assay ${i + 1}`] = assayDescriptions[i];
    }

    return formattedAssays;
  }

  async getTests(): Promise<ITest> {
    return {
      beforePluginOpens: new TestCmdList().loadExampleMolecule(),
      afterPluginCloses: new TestCmdList().waitUntilRegex(
        "#data",
        "PubChemBioassays"
      ),
    };
  }
}
</script>
  
<style scoped lang="scss">
.progress {
  height: 1.5rem;
}
</style>