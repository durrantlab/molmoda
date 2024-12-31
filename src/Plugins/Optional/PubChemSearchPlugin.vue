<template>
  <span>
    <PluginComponent
      v-model="open"
      :infoPayload="infoPayload"
      @onPopupDone="onPopupDone"
      actionBtnTxt="Search"
      @onUserArgChanged="onUserArgChanged"
      :hideIfDisabled="true"
    ></PluginComponent>
  </span>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
  IContributorCredit,
  ISoftwareCredit,
  Licenses,
} from "@/Plugins/PluginInterfaces";
import {
  UserArg,
  UserArgType,
  IUserArgSelect,
  IUserArgNumber,
  IUserArgMoleculeInputParams,
  IUserArgRange,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import {
  fetchSimilarCompounds,
  fetchSubstructureCompounds,
  fetchSuperstructureCompounds,
} from "../../pubchem_test";
import { convertFileInfosOpenBabel, Gen3DLevel, WhichMolsGen3D } from "@/FileSystem/OpenBabel/OpenBabel";
import { TestCmdList } from "@/Testing/TestCmdList";
import { ITest } from "@/Testing/TestCmd";
import { Tag } from "@/Plugins/Tags/Tags";
import { FileInfo } from "@/FileSystem/FileInfo";
import {
  SelectedType,
  TreeNodeType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";

enum SearchMode {
  Similar = "similar",
  Substructure = "substructure",
  Superstructure = "superstructure",
}

@Options({
  components: {
    PluginComponent,
  },
})
export default class PubChemSearchPlugin extends PluginParentClass {
  menuPath = "Compounds/Search/[2] Structure Search...";
  title = "PubChem Structure Search";
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
  pluginId = "pubchemstructuresearch";
  tags = [Tag.All];
  intro = "Search the PubChem database using selected structures.";
  details =
    "Uses selected compounds as query structures to find similar compounds or perform substructure/superstructure searches in PubChem.";

  userArgDefaults: UserArg[] = [
    {
      id: "makemolinputparams",
      val: new MoleculeInput({
        compoundFormat: "can",
        considerProteins: false,
        batchSize: null,
      }),
    } as IUserArgMoleculeInputParams,
    {
      id: "searchmode",
      type: UserArgType.Select,
      label: "Search mode",
      val: SearchMode.Similar,
      enabled: true,
      description: "Choose how to search based on your structure.",
      options: [
        { description: "Similar Structures", val: SearchMode.Similar },
        {
          description: "Substructures (Find Larger Compounds)",
          val: SearchMode.Substructure,
        },
        {
          description: "Superstructures (Find Smaller Compounds)",
          val: SearchMode.Superstructure,
        },
      ],
    } as IUserArgSelect,
    {
      id: "similarity",
      // type: UserArgType.Number,
      label: "Tanimoto similarity threshold",
      description:
        "Value between 0 and 100. A higher threshold finds more similar compounds (95 is very similar, 80 is moderately similar).",
      val: 95,
      min: 0,
      max: 100,
      step: 1,
      enabled: true,
      validateFunc: (val: number) => val >= 0 && val <= 100,
      warningFunc: (val: number) => {
        if (val < 70)
          return "Very low thresholds may return many dissimilar compounds.";
        if (val < 80)
          return "Low thresholds may return moderately dissimilar compounds.";
        return "";
      },
    } as IUserArgRange,
    {
      id: "maxresults",
      type: UserArgType.Number,
      label: "Maximum results per query",
      description: "Maximum number of compounds to retrieve per query (1-100).",
      val: 10,
      enabled: true,
      validateFunc: (val: number) => val > 0 && val <= 100,
      warningFunc: (val: number) => {
        if (val > 50) return "Large result sets may take longer to process.";
        return "";
      },
    } as IUserArgNumber,
  ];

  /**
   * Updates form field visibility based on search mode selection.
   */
  onUserArgChange(): void {
    const searchMode = this.getUserArg("searchmode");
    this.setUserArgEnabled("similarity", searchMode === SearchMode.Similar);
  }

  /**
   * Get search results from PubChem and load them into the viewer.
   *
   * @param {any} parameterSet The parameters passed from form.
   * @returns {Promise<void>} A promise that resolves when loading is complete.
   */
  async runJobInBrowser(parameterSet: any): Promise<void> {
    const searchMode = this.getUserArg("searchmode");
    const maxResults = this.getUserArg("maxresults");
    const compounds: FileInfo[] = this.getUserArg("makemolinputparams");

    for (const compound of compounds) {
      const selectedMols = new Array<FileInfo>();
      const smiles = compound.contents.split(" ")[0].split("\t")[0];
      let results;

      switch (searchMode) {
        case SearchMode.Similar: {
          const similarity = this.getUserArg("similarity");
          results = await fetchSimilarCompounds(smiles, similarity, maxResults);
          if (results["Similar Compounds"]) {
            for (const resultCompound of results["Similar Compounds"]) {
              selectedMols.push(
                new FileInfo({
                  name: `${compound.name}_similar_${resultCompound.CID}.smi`,
                  contents: resultCompound.SMILES,
                })
              );
            }
          }
          break;
        }

        case SearchMode.Substructure: {
          results = await fetchSubstructureCompounds(smiles, maxResults);
          if (results["Substructure Compounds"]) {
            for (const resultCompound of results["Substructure Compounds"]) {
              selectedMols.push(
                new FileInfo({
                  name: `${compound.name}_contains_${resultCompound}.smi`,
                  contents: resultCompound,
                })
              );
            }
          }
          break;
        }

        case SearchMode.Superstructure: {
          results = await fetchSuperstructureCompounds(smiles, maxResults);
          if (results["Superstructure Compounds"]) {
            for (const resultCompound of results["Superstructure Compounds"]) {
              selectedMols.push(
                new FileInfo({
                  name: `${compound.name}_contained_in_${resultCompound}.smi`,
                  contents: resultCompound,
                })
              );
            }
          }
          break;
        }
      }

      // First convert all SMILES to 3D structures in a single batch operation
      const gen3D = {
        whichMols: WhichMolsGen3D.OnlyIfLacks3D, // This is equivalent to the 2 you had before
        level: Gen3DLevel.Better,
      };

      // Do the batch conversion first
      const convertedMols = await convertFileInfosOpenBabel(
        selectedMols,
        "mol2", // Using mol2 since it preserves bond orders better than PDB
        gen3D,
        null, // pH
        false, // desalt
        false // surpressMsgs
      );

      // Convert the results to FileInfos
      const convertedFileInfos = convertedMols.map((contents, idx) => {
        return new FileInfo({
          name: selectedMols[idx].name.replace(/\.[^/.]+$/, ".mol2"),
          contents: contents,
        });
      });

      // Now convert FileInfos to TreeNodes
      const treeNodePromises = convertedFileInfos.map((mol) => {
        return TreeNode.loadFromFileInfo({
          fileInfo: mol,
          tag: this.pluginId,
          // We don't need gen3D here anymore since the molecules are already 3D
        });
      });

      let treeNodes = (await Promise.all(
        treeNodePromises
      )) as (void | TreeNode)[];
      const initialCompoundsVisible = await getSetting(
        "initialCompoundsVisible"
      );

      // Filter out failed loads and process the nodes
      treeNodes = treeNodes
        .filter((n): n is TreeNode => n !== undefined)
        .map((n, i) => {
          if (n.nodes) {
            n = n.nodes.terminals.get(0);
          }
          n.visible = i < initialCompoundsVisible;
          n.selected = SelectedType.False;
          n.focused = false;
          n.viewerDirty = true;
          n.type = TreeNodeType.Compound;
          return n;
        });

      // Create a root node to contain all results from this query compound
      const rootNode = TreeNode.loadHierarchicallyFromTreeNodes(
        treeNodes as TreeNode[]
      );
      const searchModeText =
        searchMode === SearchMode.Similar
          ? "similar_to"
          : searchMode === SearchMode.Substructure
          ? "contains"
          : "contained_in";
      rootNode.title = `${compound.treeNode?.title}:${searchModeText}_search`;

      rootNode.addToMainTree(this.pluginId);
    }
  }

  /**
   * Get the tests for the plugin.
   *
   * @returns {Promise<ITest>} The test commands.
   */
  async getTests(): Promise<ITest> {
    return {
      beforePluginOpens: new TestCmdList()
        .loadSMILESMolecule(
          "CC(=O)OC1=CC=CC=C1C(=O)O", // aspirin
          true,
          undefined,
          "aspirin"
        )
        .loadSMILESMolecule(
          "CC1=CC=C(C=C1)NC(=O)CN2CCN(CC2)CC(=O)N3CCC(CC3)N4C=NC=N4", // imatinib
          true,
          undefined,
          "imatinib"
        ),
      pluginOpen: new TestCmdList()
        .setUserArg("maxresults", 5, this.pluginId)
        .setUserArg("similarity", 90, this.pluginId),
      afterPluginCloses: new TestCmdList().waitUntilRegex(
        "#navigator",
        "similar_"
      ),
    };
  }
}
</script>

<style scoped lang="scss">
</style>