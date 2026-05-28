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
  fetchCompoundsProperties,
  fetchCompoundsPropertiesBatch,
  fetchSynonymsBatch,
} from "./PubChemAPI";
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
import { pubchemCredit, lookupCid, lookupCidsBatch } from "./PubChemCommon";
import {
  IDENTITY_DATASET_TITLE,
  mergeIntoDataTable,
} from "@/FileSystem/LoadSaveMolModels/TreeNodeDataCache";

/**
 * PubChemNamesPlugin
 */
@Component({
  components: {
    PluginComponent,
  },
})
export default class PubChemNamesPlugin extends GetPropPluginParent {
  menuPath = "Compounds/[5] Information/[5] Compound Names...";
  title = "Compound Names";
  softwareCredits = [pubchemCredit];
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
    "This tool contacts the online PubChem database to retrieve up to five names for each compound.";
  dataSetTitle = "Names";

  // Component state
  resultsData: { [key: string]: any } = {};
  isProcessing = false;
  processedCount = 0;
  totalToProcess = 0;
  /**
   * Opt into the bulk-processing path. PubChem's property and synonym
   * endpoints both accept comma-separated CIDs, so we can collapse what
   * was three calls per molecule (CID, properties, synonyms) into one
   * concurrent CID phase followed by two chunked phases.
   *
   * @returns {boolean}  Always true.
   */
  public get supportsBulk(): boolean {
    return true;
  }
  /**
   * Check if the plugin is allowed to run.
   *
   * @returns {string | null} Error message if not allowed, null if allowed.
   */
  checkPluginAllowed(): string | null {
    return checkCompoundLoaded();
  }
  /**
   * Builds the 5-name row for a single molecule. No longer includes the
   * CID; that lives in treeNode.data["PubChem"].
   *
   * @param {string}   iupac     IUPAC name (already lower-cased).
   * @param {string[]} synonyms  Synonym list (already lower-cased).
   * @returns {{[key: string]: string}}  The display row.
   */
  private buildNamesRow(
    iupac: string,
    synonyms: string[]
  ): { [key: string]: string } {
    const uniqueNames = new Set<string>([iupac]);
    for (const synonym of synonyms) {
      if (uniqueNames.size >= 5) break;
      uniqueNames.add(synonym);
    }
    const finalNames = Array.from(uniqueNames);
    while (finalNames.length < 5) {
      finalNames.push("N/A");
    }
    return {
      "Name 1": finalNames[0] || "N/A",
      "Name 2": finalNames[1] || "N/A",
      "Name 3": finalNames[2] || "N/A",
      "Name 4": finalNames[3] || "N/A",
      "Name 5": finalNames[4] || "N/A",
    };
  }

  /**
   * Per-molecule fallback path.
   *
   * @param {FileInfo} molFileInfo The molecule file info.
   * @returns {Promise} The names, or undefined if no PubChem match.
   */
  async getMoleculeDetails(
    molFileInfo: FileInfo
  ): Promise<{ [key: string]: string } | undefined> {
    if (!molFileInfo.treeNode) {
      return;
    }
    const lookup = await lookupCid(molFileInfo);
    if (!lookup.found) {
      return undefined;
    }

    // Get IUPAC name and synonyms
    const properties = await fetchCompoundsProperties(lookup.cid);
    if (properties.error) {
      return { Error: properties.error };

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
    const synonymsData = await fetchSynonyms(lookup.cid);
    const synonyms = Array.isArray(synonymsData.Synonyms)
      ? synonymsData.Synonyms.map((s: string) => s.toLowerCase())
      : [];
    return this.buildNamesRow(iupacName, synonyms);
  }

  /**
   * Bulk path: CID resolution, then batched IUPAC, then batched synonyms.
   *
   * @param {FileInfo[]} mols        Molecules to process.
   * @param {Function}   onProgress  Progress reporter.
   * @returns {Promise<void>}
   */
  public async getMoleculesDetailsBatch(
    mols: FileInfo[],
    onProgress: (frac: number) => void
  ): Promise<void> {
    const valid = mols.filter((m) => m.treeNode);
    if (valid.length === 0) {
      onProgress(1);
      return;
    }
    const cidWeight = 0.3;
    const propsWeight = 0.35;
    const synWeight = 0.35;
    const lookups = await lookupCidsBatch(valid, (completed) => {
      onProgress((completed / valid.length) * cidWeight);
    });
    const resolvedCids: string[] = [];
    const resolvedMols: FileInfo[] = [];
    for (let i = 0; i < valid.length; i++) {
      const lookup = lookups[i];
      const mol = valid[i];
      if (!lookup.found) {
        continue;
      }
      resolvedCids.push(lookup.cid);
      resolvedMols.push(mol);
    }
    if (resolvedCids.length === 0) {
      onProgress(1);
      return;
    }
    const propsMap = await fetchCompoundsPropertiesBatch(
      resolvedCids,
      (completed) => {
        onProgress(
          cidWeight + (completed / resolvedCids.length) * propsWeight
        );
      }
    );
    const synMap = await fetchSynonymsBatch(
      resolvedCids,
      (completed) => {
        onProgress(
          cidWeight +
            propsWeight +
            (completed / resolvedCids.length) * synWeight
        );
      }
    );
    for (let i = 0; i < resolvedMols.length; i++) {
      const mol = resolvedMols[i];
      const cid = resolvedCids[i];
      const props = propsMap[cid];
      if (!props || props.error || !props["IUPAC Name"]) {
        this.recordMoleculeResult(mol, {
          Error: props?.error ?? "No name data",
        });
        continue;
      }
      const iupac = String(props["IUPAC Name"]).toLowerCase();
      const synonyms = (synMap[cid] ?? []).map((s) => s.toLowerCase());
      this.recordMoleculeResult(mol, this.buildNamesRow(iupac, synonyms));
    }
    onProgress(1);
  }

  /**
   * Get the tests for the plugin.
   *
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
        .waitUntilRegex("#modal-tabledatapopup", "aspirin")
        .waitUntilRegex("#modal-tabledatapopup", "PubChem compound not found")
        .tourNote(
          "The names of the compounds have been retrieved from PubChem and are displayed in a table. You can click on the CID link to view more details about the compound on the PubChem website.",
          "#modal-tabledatapopup .subtle-box"
        )
        .click("#modal-tabledatapopup .cancel-btn"),
    };
  }

  /**
   * Writes the retrieved names into the molecule's "Identity" data table
   * (the same table holding SMILES and the PubChem CID) rather than a
   * separate "Names" table, so a compound's identity values live in one
   * place. Still records the row in resultsData so the summary popup is
   * unaffected. Overrides the parent, which would otherwise write to
   * data[dataSetTitle].
   *
   * @param {FileInfo}             mol    The molecule processed.
   * @param {{[key: string]: any}} props  The names row to record.
   */
  public recordMoleculeResult(
    mol: FileInfo,
    props: { [key: string]: any }
  ): void {
    if (!mol.treeNode) {
      return;
    }
    // Reassign treeNode.data first so Vue reactivity fires, then merge the
    // name fields into the shared Identity table alongside SMILES and CID.
    mol.treeNode.data = { ...mol.treeNode.data };
    mergeIntoDataTable(mol.treeNode, IDENTITY_DATASET_TITLE, props);
    const pathName = mol.treeNode.descriptions.pathName(">", 50);
    this.resultsData[pathName] = {
      name: pathName,
      ...props,
    };
  }
}
</script>
  
  <style scoped lang="scss">
.progress {
  height: 1.5rem;
}
</style>