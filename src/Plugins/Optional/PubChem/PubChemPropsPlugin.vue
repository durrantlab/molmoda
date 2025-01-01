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
import { fetchCompoundsProperties, fetchCid } from "../../../pubchem_test";
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
import { GetPropPluginParent } from "../../Parents/GetPropPluginParent";
import { TestCmdList } from "@/Testing/TestCmdList";

/**
 * PubChemPropsPlugin
 */
@Options({
  components: {
    PluginComponent,
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
      url: "https://www.linkedin.com/in/nonso-duaka-958b91316/",
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
    if (cid === "0") {
      return {
        CID: "PubChem compound not found!",
      };
    }
    let properties = await fetchCompoundsProperties(cid);
    if (properties.error) {
      return {
        CID: "PubChem compound not found!",
      };
    }

    properties = {
      CID: `<a href="https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=Chemical-and-Physical-Properties" target="_blank">${cid}</a>`,
      ...properties,
    };

    return properties;
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