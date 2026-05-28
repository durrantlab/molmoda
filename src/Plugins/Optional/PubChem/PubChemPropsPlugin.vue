<template>
  <span>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onPopupDone="onPopupDone" actionBtnTxt="Get Properties"
      @onUserArgChanged="onUserArgChanged" @onMolCountsChanged="onMolCountsChanged"></PluginComponent>
  </span>
</template>

<script lang="ts">
import {
  fetchCompoundsProperties,
  fetchCompoundsPropertiesBatch,
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
/**
 * PubChemPropsPlugin
 */
@Component({
  components: {
    PluginComponent,
  },
})
export default class PubChemPropsPlugin extends GetPropPluginParent {
  menuPath = "Compounds/Information/[6] Compound Properties...";
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
   * Opt into the bulk-processing path in GetPropPluginParent. The PubChem
   * property endpoint accepts comma-separated CIDs, so we can fetch 100
   * compounds per call instead of one.
   *
   * @returns {boolean}  Always true.
   */
  public get supportsBulk(): boolean {
    return true;
  }
  /**
   * Check if the plugin is allowed to be used.
   *
   * @returns {string | null} Error message if not allowed, null if allowed.
   */
  checkPluginAllowed(): string | null {
    return checkCompoundLoaded();
  }
  /**
   * Per-molecule fallback path. The CID lives in treeNode.data["PubChem"]
   * (written by lookupCid as a side effect), so this plugin's results
   * table contains only the property fields themselves.
   *
   * @param {FileInfo} molFileInfo The molecule file info.
   * @returns {Promise} The properties, or undefined if the SMILES doesn't
   *     resolve to a PubChem CID (the not-found state is already recorded
   *     on the tree node so no row is needed here).
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
    const properties = await fetchCompoundsProperties(lookup.cid);
    if (properties.error) {
      return { Error: properties.error };
    }
    return properties;
  }

  /**
   * Bulk path. Drops CID from each returned row for the same reason as
   * getMoleculeDetails: the CID lives in the canonical PubChem entry
   * written during lookupCidsBatch.
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
    const cidPhaseWeight = 0.4;
    const propPhaseWeight = 0.6;
    const lookups = await lookupCidsBatch(valid, (completed) => {
      onProgress((completed / valid.length) * cidPhaseWeight);
    });
    // Group molecules by whether they resolved to a CID. Unresolved ones get
    // a "not found" row immediately and skip the property fetch.
    const resolvedCids: string[] = [];
    const resolvedMols: FileInfo[] = [];
    for (let i = 0; i < valid.length; i++) {
      const lookup = lookups[i];
      const mol = valid[i];
      if (!lookup.found) {
        // Not-found state already recorded on the tree node by
        // lookupCidsBatch; skip emitting a row for this molecule.
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
          cidPhaseWeight +
            (completed / resolvedCids.length) * propPhaseWeight
        );
      }
    );
    for (let i = 0; i < resolvedMols.length; i++) {
      const mol = resolvedMols[i];
      const cid = resolvedCids[i];
      const props = propsMap[cid];
      if (!props || props.error) {
        this.recordMoleculeResult(mol, {
          Error: props?.error ?? "Unknown error",
        });
        continue;
      }
      this.recordMoleculeResult(mol, props);
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