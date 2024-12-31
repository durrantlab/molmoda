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
import {
  convertFileInfosOpenBabel,
  Gen3DLevel,
  WhichMolsGen3D,
} from "@/FileSystem/OpenBabel/OpenBabel";
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
import { messagesApi } from "@/Api/Messages";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";

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
      label: "Maximum results",
      description: "Maximum number of compounds to retrieve (1-1000).",
      val: 10,
      enabled: true,
      validateFunc: (val: number) => val > 0 && val <= 1000,
      warningFunc: (val: number) => {
        // debugger;
        if (val > 50) return "Large result sets may take longer to process.";
        return "";
      },
      // currnetly total per compound. But should be total total (divided among compounds)
    } as IUserArgNumber,
  ];

  // Should it use a queue somehow?

  /**
   * Updates form field visibility based on search mode selection.
   */
  async onUserArgChange(): Promise<void> {
    const searchMode = this.getUserArg("searchmode");
    this.setUserArgEnabled("similarity", searchMode === SearchMode.Similar);

    // // Add validation for maxresults vs number of input molecules
    // debugger
    // const molecules: FileInfo[] = await this.getUserArg("makemolinputparams").getProtAndCompoundPairs();
    // const maxResults = this.getUserArg("maxresults");

    // if (molecules.length > 0 && maxResults < molecules.length) {
    //   this.setUserArg(
    //     "maxResultsWarning",
    //     `With ${maxResults} results per molecule and ${molecules.length} query molecules, you may not retrieve results for all queries. Consider increasing max results to at least ${molecules.length} to ensure each query molecule is used.`
    //   );
    //   this.setUserArgEnabled("maxResultsWarning", true);
    // } else {
    //   this.setUserArgEnabled("maxResultsWarning", false);
    // }
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

    // maxResults is total, not per compound. So divide it to get per-compound
    // values. Try to divide as evently as possible, but make sure totals sum to
    // maxResults.
    const maxResultVals = Array(compounds.length)
      .fill(0)
      .map((_, idx) => {
        // Example: 10 results among 3 compounds = [4, 3, 3]
        // First N compounds get ceiling(total/num), rest get floor
        const perCompound = maxResults / compounds.length;
        const numExtra = maxResults % compounds.length;
        return idx < numExtra
          ? Math.ceil(perCompound)
          : Math.floor(perCompound);
      });

    // Step 1: Collect all SMILES from PubChem API in parallel
    const fetchPromises = compounds.map(async (compound, idx) => {
      const maxResultPerCompound = maxResultVals[idx];
      const smiles = compound.contents.split(" ")[0].split("\t")[0];
      let results;
      let resultCompounds = [];
      let prep = "";

      switch (searchMode) {
        case SearchMode.Similar: {
          const similarity = this.getUserArg("similarity");
          results = await fetchSimilarCompounds(
            smiles,
            similarity,
            maxResultPerCompound
          );
          if (results["Similar Compounds"]) {
            resultCompounds = results["Similar Compounds"];
            prep = "similar_to";
          }
          break;
        }
        case SearchMode.Substructure: {
          results = await fetchSubstructureCompounds(
            smiles,
            maxResultPerCompound
          );
          if (results["Substructure Compounds"]) {
            resultCompounds = results["Substructure Compounds"];
            prep = "contains";
          }
          break;
        }
        case SearchMode.Superstructure: {
          results = await fetchSuperstructureCompounds(
            smiles,
            maxResultPerCompound
          );
          if (results["Superstructure Compounds"]) {
            resultCompounds = results["Superstructure Compounds"];
            prep = "contained_in";
          }
          break;
        }
      }

      return {
        queryCompoundName: compound.name,
        results: resultCompounds,
        prep,
      };
    });

    // Wait for all API calls to complete
    const apiResults = await Promise.all(fetchPromises);

    // Step 2: Create FileInfo objects for all unique compounds
    const cidsAlreadyAdded = new Set<number>();
    const allFileInfos: FileInfo[] = [];

    let duplicatesNotAdded = 0;
    let insufficientResultsReturned = 0;

    for (const idx in apiResults) {
      const result = apiResults[idx];
      const numResults = result.results.length;
      const expectedNumResults = maxResultVals[idx];
      if (numResults !== expectedNumResults) {
        insufficientResultsReturned += expectedNumResults - numResults;
      }

      for (const compound of result.results) {
        if (cidsAlreadyAdded.has(compound.CID)) {
          duplicatesNotAdded++;
          continue;
        }
        allFileInfos.push(
          new FileInfo({
            name: `CID${compound.CID}_${
              result.prep
            }_${result.queryCompoundName.replace(/\.[^/.]+$/, "")}.smi`,
            contents: compound.SMILES,
          })
        );
        cidsAlreadyAdded.add(compound.CID);
      }
    }

    if (duplicatesNotAdded > 0) {
      messagesApi.popupMessage(
        "Warning",
        `<p>PubChem provided ${duplicatesNotAdded} duplicate compound${
          duplicatesNotAdded === 1 ? "" : "s"
        }. The duplicates will not be loaded.</p>`,
        PopupVariant.Warning
      );
    }

    if (insufficientResultsReturned > 0) {
      messagesApi.popupMessage(
        "Warning",
        `<p>PubChem provided ${insufficientResultsReturned} fewer compound${
          insufficientResultsReturned === 1 ? "" : "s"
        } than requested.</p>`,
        PopupVariant.Warning
      );
    }

    // Step 3: Batch convert all structures to 3D
    const gen3D = {
      whichMols: WhichMolsGen3D.OnlyIfLacks3D,
      level: Gen3DLevel.Better,
    };

    const convertedMols = await convertFileInfosOpenBabel(
      allFileInfos,
      "mol2",
      gen3D,
      undefined,
      true, // desalt
      false // suppressMsgs
    );

    // Step 4: Create FileInfos from converted structures
    const convertedFileInfos = convertedMols.map((contents, idx) => {
      return new FileInfo({
        name: allFileInfos[idx].name.replace(/\.[^/.]+$/, ".mol2"),
        contents: contents,
      });
    });

    // Step 5: Convert to TreeNodes
    const treeNodePromises = convertedFileInfos.map((mol) => {
      return TreeNode.loadFromFileInfo({
        fileInfo: mol,
        tag: this.pluginId,
      });
    });

    let treeNodes = (await Promise.all(
      treeNodePromises
    )) as (void | TreeNode)[];
    const initialCompoundsVisible = await getSetting("initialCompoundsVisible");

    // Filter and process nodes
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

    // Create and add root node
    const rootNode = TreeNode.loadHierarchicallyFromTreeNodes(
      treeNodes as TreeNode[]
    );
    const searchModeText = (
      {
        [SearchMode.Similar]: "similarity",
        [SearchMode.Substructure]: "substructure",
        [SearchMode.Superstructure]: "superstructure",
      } as any
    )[searchMode];

    rootNode.title = `${searchModeText}_search`;
    rootNode.addToMainTree(this.pluginId);
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