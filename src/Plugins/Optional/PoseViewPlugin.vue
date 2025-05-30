<template>
  <span>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onPopupDone="onPopupDone" actionBtnTxt="Generate"
      @onUserArgChanged="onUserArgChanged" :hideIfDisabled="true" @onMolCountsChanged="onMolCountsChanged"
      :isActionBtnEnabled="isActionBtnEnabled">
      <template #afterForm>
        <Alert v-if="numCompounds > 1" type="danger" extraClasses="mt-4">
          <span>
            PoseView works with only 1 compound (ligand) at a time. You have
            chosen {{ numCompounds }} compounds. Please change which proteins
            and compounds to consider (above), or modify your selection in the
            Navigator panel if necessary.
          </span>
        </Alert>

        <Alert v-else-if="numProteins > 1" type="warning" extraClasses="mt-4">
          You have chosen {{ numProteins }} proteins. To calculate
          protein/ligand interactions, these proteins will be merged and
          considered as a single receptor. To generate separate 2D interaction
          diagrams for each protein, run this plugin on each protein separately.
        </Alert>
      </template>
    </PluginComponent>
  </span>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import {
  IContributorCredit,
  ISoftwareCredit,
  Licenses,
} from "@/Plugins/PluginInterfaces";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
  UserArg,
  UserArgType,
  IUserArgMoleculeInputParams,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import {
  IProtCmpdCounts,
  IProtCmpdTreeNodePair,
  MoleculeInput,
} from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import Alert from "@/UI/Layout/Alert.vue";
import * as api from "@/Api";
import { ITest } from "@/Testing/TestCmd";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import {
  checkCompoundLoaded,
  checkProteinLoaded,
} from "@/Plugins/CheckUseAllowedUtils";
import { fetcher, ResponseType } from "@/Core/Fetcher";
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { _convertTreeNodeListToPDB } from "@/FileSystem/LoadSaveMolModels/ConvertMolModels/_ConvertTreeNodeListToPDB";
import { TestCmdList } from "@/Testing/TestCmdList";
import { FileInfo } from "@/FileSystem/FileInfo"; // Added import
import { makeEasyParser } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser"; // Added import

const PROXY_URL =
  "https://durrantlab.pitt.edu/apps/molmoda/beta/poseview-proxy.php";

/**
 * PoseViewPlugin
 */
@Options({
  components: {
    PluginComponent,
    Alert,
    Popup,
  },
})
export default class PoseViewPlugin extends PluginParentClass {
  menuPath = "Binding/[6] Analysis/[9] Interaction Diagram...";
  title = "2D Interaction Diagram";
  softwareCredits: ISoftwareCredit[] = [
    {
      name: "PoseView",
      url: "https://www.zbh.uni-hamburg.de/en/forschung/amd/server/poseview.html",
      license: Licenses.UNRESTRICTED, // https://proteins.plus/pages/about
      citations: [
        {
          title: "PoseView -- molecular interaction patterns at a glance",
          authors: ["Stierand, Katrin", "Rarey, Matthias"],
          journal: "J Cheminform",
          year: 2010,
          volume: 2,
          issue: 1,
          pages: "P50",
        },
        {
          title:
            "ProteinsPlus: a comprehensive collection of web-based molecular modeling tools",
          authors: [
            "Schöning-Stierand, Katrin",
            "Diedrich, Konrad",
            "Ehrt, Christiane",
            "Flachsenberg, Florian",
            "Graef, Joel",
            "Sieg, Jochen",
            "Penner, Patrick",
            "Poppinga, Martin",
            "Ungethüm, Annett",
            "Rarey, Matthias",
          ],
          journal: "Nucleic Acids Res",
          year: 2022,
          volume: 50,
          issue: "W1",
          pages: "W611-W615",
        },
      ],
    },
  ];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Zentrum für Bioinformatik: Universität Hamburg",
      url: "https://www.zbh.uni-hamburg.de/en/forschung/amd/server/poseview.html",
    },
  ];
  pluginId = "poseview";
  intro =
    "Use PoseView to generate a 2D interaction diagram showing protein-ligand interactions.";
  tags = [Tag.Visualization, Tag.Docking];
  isActionBtnEnabled = false;
  numCompounds = 0;
  numProteins = 0;

  userArgDefaults: UserArg[] = [
    {
      type: UserArgType.MoleculeInputParams,
      id: "makemolinputparams",
      val: new MoleculeInput({
        considerCompounds: true,
        considerProteins: true,
        proteinFormat: "pdb",
        compoundFormat: "sdf",
        includeMetalsSolventAsProtein: false,
      }),
      label: "Proteins and compound to consider",
    } as IUserArgMoleculeInputParams,
  ];

  /**
   * Called when the user changes the number of proteins or compounds, as specified in the MoleculeInputParams.
   *
   * @param {IProtCmpdCounts} val The number of proteins and compounds
   */
  public onMolCountsChanged(val: IProtCmpdCounts) {
    this.numCompounds = val.compounds;
    this.numProteins = val.proteins;
    this.isActionBtnEnabled = this.numCompounds === 1;
  }

  /**
   * Check if the plugin is allowed to be used.
   *
   * @returns {string | null} Error message if not allowed, else null.
   */
  checkPluginAllowed(): string | null {
    // Must have at least one protein and one compound loaded.
    const protLoaded = checkProteinLoaded();
    if (protLoaded !== null) {
      return protLoaded;
    }
    return checkCompoundLoaded();
  }

  /**
   * Polls the PoseView server for the status of a job.
   *
   * @param {string}   jobId             The ID of the job to poll
   * @param {Function} progressCallback  Callback to report progress
   * @param {number}   pollInterval      The interval at which to poll the
   *                                     server (in ms)
   * @param {number}   maxAttempts       The maximum number of polling attempts
   * @returns {Promise<any>} The result of the job
   */
  async _pollJob(
    jobId: string,
    progressCallback: (progress: number) => void,
    pollInterval = 2000,
    maxAttempts = 65
  ): Promise<any> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      progressCallback(attempts / maxAttempts);
      const response = await fetcher(`${PROXY_URL}?job_id=${jobId}`, {
        responseType: ResponseType.JSON,
        cacheBust: true,
      });

      // if (!response.ok) {
      //     throw new Error(`Polling failed: ${response.statusText}`);
      // }
      const job = response.response;

      if (job.status === "success" || job.status === "error") {
        return job;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;
    }

    throw new Error(`PoseView job timed out after ${maxAttempts} attempts`);
  }

  /**
   * Generate a PoseView diagram.
   *
   * @param {string}   pdbString        The PDB file contents
   * @param {string}   sdfString        The SDF file contents
   * @param {Function} progressCallback Callback to report progress
   * @returns {Promise<string>} The URL of the generated image
   */
  async generatePoseView(
    pdbString: string,
    sdfString: string,
    progressCallback: (progress: number) => void
  ): Promise<string> {
    const spinnerId = api.messages.startWaitSpinner();

    const pdbFile = new File([pdbString], "protein.pdb", {
      type: "chemical/x-pdb",
    });
    const sdfFile = new File([sdfString], "ligand.sdf", {
      type: "chemical/x-sdf",
    });

    const formData = new FormData();
    formData.append("protein_file", pdbFile);
    formData.append("ligand_file", sdfFile);

    const response = await fetcher(PROXY_URL, {
      responseType: ResponseType.JSON,
      formPostData: formData,
      cacheBust: true,
    });

    // if (!response.ok) {
    //   throw new Error(`Failed to submit PoseView job: ${response.statusText}`);
    // }

    // const submission = await response.json();
    const job = await this._pollJob(response.response.job_id, progressCallback);

    api.messages.stopWaitSpinner(spinnerId);

    if (job.status === "error") {
      throw new Error("PoseView job failed");
    }

    if (!job.image) {
      throw new Error("No image URL in successful PoseView job response");
    }

    return job.image;
  }

  /**
   * Run the plugin in the browser.
   *
   * @returns {Promise<void>} A promise that resolves when the job is complete
   */
  async runJobInBrowser(): Promise<void> {
    try {
      const filePairs = this.getUserArg(
        "makemolinputparams"
      ) as IProtCmpdTreeNodePair[];

      if (filePairs.length === 0 || !filePairs[0].prot || !filePairs[0].cmpd) {
        api.messages.popupError(
          "Could not generate PoseView diagram! Did you select at least one compound and one protein?"
        );
        return;
      }

      // Collect all the protein tree nodes to convert into a single (merged) PDB file.
      const filePair = filePairs[0];
      const proteinTreeNodes = filePairs
        .map((pair) => pair.prot.treeNode as TreeNode)
        .filter((node) => node !== undefined);

      const proteinTreeNodeList = new TreeNodeList(proteinTreeNodes);

      // [0] because only 1 (merged)
      const pdbString = _convertTreeNodeListToPDB(proteinTreeNodeList, true)[0];

      // For ligand consider only the first filePair (there should be ligand
      // only, so they should all be the same)
      const sdfString = filePair.cmpd.contents;

      // Proximity check logic
      const proteinTempFileInfo = new FileInfo({ name: "protein_merged_for_check.pdb", contents: pdbString });
      const ligandTempFileInfo = new FileInfo({ name: "ligand_for_check.sdf", contents: sdfString });

      const proteinParser = makeEasyParser(proteinTempFileInfo);
      const ligandParser = makeEasyParser(ligandTempFileInfo);

      const DISTANCE_THRESHOLD = 10; // Angstroms
      if (!proteinParser.isWithinDistance(ligandParser, DISTANCE_THRESHOLD, 5, 5)) {
        api.messages.popupError(
          `The selected protein and ligand are too far apart (more than ${DISTANCE_THRESHOLD} Å). Please select a protein/ligand pair that are in close proximity (i.e., interacting) for a meaningful interaction diagram.`
        );
        return;
      }


      // Get paths
      const proteinPath = filePair.prot.treeNode?.descriptions.pathName(
        ">",
        80
      );
      const compoundPath = filePair.cmpd.treeNode?.descriptions.pathName(
        ">",
        80
      );

      let poseviewSvg = await this.generatePoseView(
        pdbString,
        sdfString,
        (progress: number) => {
          this.updateProgressInQueueStore(progress);
        }
      );

      // To make it responsive.
      poseviewSvg = poseviewSvg.replace(
        /\s+width="\d+pt"\s+height="\d+pt"/g,
        ""
      );


      // Create a wrapper for the SVG and add the legend/info below it
      const wrapperHtml = `
        <div style="display: flex; flex-direction: column; width: 100%; align-items: center;">
          <!-- SVG Diagram Area -->
          <div style="position: relative; width: 100%; max-width: 850px; /* Optional: constrain max SVG width */">
        ${poseviewSvg}
        </div>

          <!-- Legend and Info Area Below SVG -->
          <div style="width: 100%; margin-top: 15px; padding: 10px; background-color: #f5f5f5; border-top: 1px solid #ddd; box-sizing: border-box;">
            <!-- Legend Image (Centered) -->
            <div style="text-align: center; margin-bottom: 10px;">
              <img src="./poseview-legend.png" style="max-width: 100%; height: auto; display: inline-block;" alt="PoseView Legend" />
            </div>

            <!-- Text Description (Centered) -->
            <div style="font-size: 14px; text-align: center;">
                2D interaction diagram showing protein-ligand interactions for:<br>
                <strong>Protein:</strong> ${proteinPath || 'Unknown'}<br>
                <strong>Compound:</strong> ${compoundPath || 'Unknown'}
            </div>
          </div>
      </div>
    `;

      api.plugins.runPlugin("simplesvg", {
        svgContents: wrapperHtml,
        title: "2D Interaction Diagram",
        message: `Diagram generated using <a href="https://www.zbh.uni-hamburg.de/en/forschung/amd/server/poseview.html" target="_blank">PoseView</a>.`,
      });
    } catch (error: any) {
      api.messages.popupError(
        `Failed to generate PoseView interaction diagram: ${error.message}`
      );
    }

    return Promise.resolve();
  }

  /**
   * Get the tests for the plugin.
   *
   * @returns {Promise<ITest>} The tests.
   */
  async getTests(): Promise<ITest> {
    return {
      beforePluginOpens: new TestCmdList()
        .loadExampleMolecule()
        .selectMoleculeInTree("Protein"),
      afterPluginCloses: new TestCmdList()
        .waitUntilRegex("#modal-simplesvg", "Diagram generated using")
        .click("#modal-simplesvg .cancel-btn"),
    };
  }
}
</script>

<style scoped></style>