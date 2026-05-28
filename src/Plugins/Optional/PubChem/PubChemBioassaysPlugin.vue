<template>
  <span>
    <PluginComponent
      v-model="open"
      :infoPayload="infoPayload"
      @onPopupDone="onPopupDone"
      actionBtnTxt="Get Bioassays"
      @onUserArgChanged="onUserArgChanged"
      @onMolCountsChanged="onMolCountsChanged"
    ></PluginComponent>
  </span>
</template>
  
<script lang="ts">
import {
  fetchActiveAssays,
  fetchActiveAssaysBatch,
  IAssayRecord,
} from "./PubChemAPI";
import { checkCompoundLoaded } from "@/Plugins/CheckUseAllowedUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import {
  IContributorCredit,
} from "@/Plugins/PluginInterfaces";
import { FileInfo } from "@/FileSystem/FileInfo";
import { GetPropPluginParent } from "../../Parents/GetPropPluginParent";
import { TestCmdList } from "@/Testing/TestCmdList";
import { Component } from "vue-facing-decorator";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { ITest } from "@/Testing/TestInterfaces";
import { pubchemCredit, lookupCid, lookupCidsBatch } from "./PubChemCommon";
/**
 * PubChemBioassaysPlugin
 */
@Component({
  components: {
    PluginComponent,
  },
})
export default class PubChemBioassaysPlugin extends GetPropPluginParent {
  menuPath = "Compounds/Information/[7] Bioassays...";
  title = "PubChem Bioassays";
  softwareCredits = [pubchemCredit];

  dataSetTitle = "PubChemBioassays";
  contributorCredits: IContributorCredit[] = [
    {
      name: "Nonso Duaka",
      url: "https://www.linkedin.com/in/nonso-duaka-958b91316/",
    },
  ];
  pluginId = "pubchembioassays";
  tags = [Tag.Cheminformatics];
  intro = "Get the bioassay data of selected compounds from PubChem.";
  details =
    "This tool contacts the online PubChem database to retrieve up to 10 active bioassays for each compound.";

  /**
   * Opt into the bulk-processing path. PubChem's assaysummary endpoint
   * accepts comma-separated CIDs via HTTP POST, so a whole compound set can
   * be profiled with a handful of chunked calls instead of one per CID.
   *
   * @returns {boolean}  Always true.
   */
  public get supportsBulk(): boolean {
    return true;
  }
  
  /**
   * Check if the plugin is allowed to be used.
   *
   * @returns {string | null} Error message if not allowed, else null.
   */
  checkPluginAllowed(): string | null {
    return checkCompoundLoaded();
  }

  /**
   * Formats ranked assays into the "Assay 1", "Assay 2", ... display row.
   * Extracted so the per-molecule and bulk paths render identically.
   *
   * @param {IAssayRecord[]} activeAssays  Ranked active assays for one CID.
   * @returns {{[key: string]: string}}  The display row.
   */
  private buildAssaysRow(
    activeAssays: IAssayRecord[]
  ): { [key: string]: string } {
    const assayDescriptions = activeAssays.map((assay: IAssayRecord) => {
      // Add a string formatted like "DSSTox (FDAMDD) FDA Maximum
      // (Recommended) Daily Dose Database, AID 1234. Target:
      // Neuraminidase" But Target might not be given, so only add if
      // it is not "".
      let assayDesc = `${assay["Assay Name"]}. AID: <a href="https://pubchem.ncbi.nlm.nih.gov/bioassay/${assay["AID"]}" target="_blank">${assay["AID"]}</a>.`;
      if (assay["Assay Type"]) {
        assayDesc += ` Assay type: ${assay["Assay Type"].toLowerCase()}.`;
      }
      return assayDesc;
    });
    const formattedAssays: { [key: string]: string } = {};
    for (let i = 0; i < assayDescriptions.length; i++) {
      formattedAssays[`Assay ${i + 1}`] = assayDescriptions[i];
    }
    return formattedAssays;
  }
  /**
   * Per-molecule fallback path. The CID lives in treeNode.data["PubChem"]
   * (written by lookupCid); a SMILES with no PubChem match returns undefined
   * since the not-found state is already recorded on the node.
   *
   * @param {FileInfo} molFileInfo The file info of the selected compound.
   * @returns {Promise} The bioassay data.
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
    const bioassayData = await fetchActiveAssays(lookup.cid);
    if (bioassayData.error) {
      return { Error: bioassayData.error };
    }
    return this.buildAssaysRow(bioassayData.ActiveAssays ?? []);
  }
  /**
   * Bulk path: batched CID resolution, then a chunked assaysummary POST for
   * every resolved CID. Mirrors the names/properties bulk plugins.
   *
   * @param {FileInfo[]} mols        Molecules to process.
   * @param {Function}   onProgress  Progress reporter (fraction in [0,1]).
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
    const cidPhaseWeight = 0.4;
    const assayPhaseWeight = 0.6;
    const lookups = await lookupCidsBatch(valid, (completed) => {
      onProgress((completed / valid.length) * cidPhaseWeight);
    });
    // Keep only molecules that resolved to a CID; unresolved ones already
    // have their not-found state recorded on the tree node by
    // lookupCidsBatch, so no row is emitted for them.
    const resolvedCids: string[] = [];
    const resolvedMols: FileInfo[] = [];
    for (let i = 0; i < valid.length; i++) {
      const lookup = lookups[i];
      if (!lookup.found) {
        continue;
      }
      resolvedCids.push(lookup.cid);
      resolvedMols.push(valid[i]);
    }
    if (resolvedCids.length === 0) {
      onProgress(1);
      return;
    }
    const assaysMap = await fetchActiveAssaysBatch(
      resolvedCids,
      (completed) => {
        onProgress(
          cidPhaseWeight +
            (completed / resolvedCids.length) * assayPhaseWeight
        );
      }
    );
    for (let i = 0; i < resolvedMols.length; i++) {
      const mol = resolvedMols[i];
      const result = assaysMap[resolvedCids[i]];
      if (!result || result.error || !result.ActiveAssays) {
        this.recordMoleculeResult(mol, {
          Error: result?.error ?? "No assay data",
        });
        continue;
    }
      this.recordMoleculeResult(mol, this.buildAssaysRow(result.ActiveAssays));
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
        .waitUntilRegex("#modal-tabledatapopup", "COX-1")
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