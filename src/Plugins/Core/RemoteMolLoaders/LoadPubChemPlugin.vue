<template>
    <PluginComponent
        :userArgs="userArgs"
        title="Load Molecule from PubChem"
        v-model="open"
        cancelBtnTxt="Cancel"
        actionBtnTxt="Load"
        @onPopupDone="onPopupDone"
        :pluginId="pluginId"
        :isActionBtnEnabled="isBtnEnabled()"
        :intro="intro"
    >
        <FormWrapper>
            <FormInput
                ref="formMolName"
                id="formMolName"
                v-model="molName"
                placeHolder="(Optional) Enter the Chemical Name (e.g., Aspirin)"
                @onChange="searchByName"
                :delayBetweenChangesDetected="2000"
                :description="molNameRespDescription"
            ></FormInput>
        </FormWrapper>
        <FormWrapper
            ><FormInput
                ref="formCID"
                v-model="cid"
                placeHolder="Enter the CID (e.g., 2244)"
                :filterFunc="filterUserData"
                @onKeyDown="onCIDKeyDown"
                description='The CID number. Search <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank">PubChem</a> to find the CID yourself.'
            ></FormInput>
        </FormWrapper>
    </PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/no-this-alias */

import { Options } from "vue-class-component";
import FormInput from "@/UI/Forms/FormInput.vue";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import { slugify } from "@/Core/Utils";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { loadRemote } from "./Utils";
import * as api from "@/Api";
import { appName } from "@/Core/AppName";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import {
  PluginParentClass,
  RunJobReturn,
} from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { correctFilenameExt } from "@/FileSystem/Utils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TestCmdList } from "@/Testing/TestCmdList";

/**
 * LoadPubChemPlugin
 */
@Options({
  components: {
    PluginComponent,
    FormInput,
    FormWrapper,
  },
})
export default class LoadPubChemPlugin extends PluginParentClass {
  menuPath = "File/Remote Import/[6] PubChem";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
    {
      name: "PubChem",
      url: "https://pubchem.ncbi.nlm.nih.gov/",
    },
  ];
  pluginId = "loadpubchem";
  cid = "";
  molName = "";
  molNameRespDescription = "";

  intro = `Load a compound from the <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank">PubChem Database</a>, a database of small molecules.`

  userArgs: FormElement[] = [];
  alwaysEnabled = true;

  /**
   * Filters text to match desired format.
   *
   * @param {string} val  The text to assess.
   * @returns {string} The filtered text.
   */
  filterUserData(val: string): string {
    // Keep numbers
    val = val.replace(/\D/g, "");
    return val;
  }

  /**
   * Get the name of the app.
   *
   * @returns {string} The name of the app.
   */
  get appName(): string {
    return appName;
  }

  /**
   * Runs when the user presses a key in the CID input. Clears the molname.
   */
  onCIDKeyDown() {
    this.molName = "";
  }

  /**
   * If text is a properly formatted UniProt accession, enable the button.
   * Otherwise, disabled.
   *
   * @returns {boolean} Whether to disable the button.
   */
  isBtnEnabled(): boolean {
    // Regex for any integer
    let r = /\d+/;

    // Return bool whether text matches regex
    return this.cid.toString().match(r) !== null;
  }

  /**
   * Searches pubmed by user-specified name. Tries to set the CID accordingly.
   */
  searchByName() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let catchFunc = (_err: string) => {
      // this.molNameRespDescription = err;
      this.molNameRespDescription = `<span class="text-danger">Could not find a molecule named "${this.molName}".</span>`;
      this.cid = "";
    };

    loadRemote(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${this.molName}/synonyms/JSON`
    )
      .then((fileInfo: FileInfo) => {
        let cid = fileInfo.contents.InformationList.Information[0].CID;
        this.cid = cid;

        let synonyms = fileInfo.contents.InformationList.Information[0].Synonym;
        synonyms = synonyms.filter(
          (synonym: string) =>
            synonym.toLowerCase() !== this.molName.toLowerCase()
        );

        this.molNameRespDescription = `<div style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; display: block;">Found "${
          this.molName
        }", known also as ${synonyms.join(", ")}<div>`;
        return;
      })
      .catch(catchFunc);
      // throw err;
  }

  /**
   * Loads the 2D molecule from PubChem. Used if 3D molecule isn't available.
   *
   * @param {string} filename  The filename to use.
   * @returns {RunJobReturn} A promise that resolves when it is loaded.
   */
  get2DVersion(filename: string): Promise<void> {
    return loadRemote(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${this.cid}/record/SDF/?record_type=2d&response_type=display`
    )
      .then((fileInfo: FileInfo) => {
        fileInfo.name = correctFilenameExt(filename, "SDF");
        return;
      })
      .catch((err: string) => {
        api.messages.popupError(err);
        // throw err;
        return;
      });
  }

  /**
   * Runs when the user presses the action button and the popup closes.
   */
  onPopupDone(): void {
    this.closePopup();
    this.submitJobs([{ cid: this.cid, molName: this.molName }]);
  }

  /**
   * Runs after the popup opens. Good for setting focus in text elements.
   */
  onPopupOpen() {
    let focusTarget = (this.$refs.formMolName as any).$refs
      .inputElem as HTMLInputElement;
    focusTarget.focus();
  }

  /**
   * Runs before the popup opens. Good for initializing/resenting variables
   * (e.g., clear inputs from previous open).
   */
  onBeforePopupOpen() {
    this.cid = "";
    this.molName = "";
    this.molNameRespDescription = "The name of the molecule. If given, Biotite will automatically search PubChem for the corresponding Chemical Identification (CID) number.";
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @returns {RunJobReturn}  A promise that resolves the file object.
   */
  runJobInBrowser(): RunJobReturn {
    let filename = "";
    if (this.molName !== "") {
      filename += slugify(this.molName) + "-";
    }
    filename += "CID" + this.cid + ".sdf";

    return (
      loadRemote(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${this.cid}/record/SDF/?record_type=3d&response_type=display`
      )
        .then((fileInfo: FileInfo) => {
          fileInfo.name = correctFilenameExt(filename, "SDF");
          return this.addFileInfoToViewer(fileInfo);
        })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .catch((_err: string) => {
          // If it failed, it could be because there's no 3D coordinates. Try 2D.
          // throw err;
          return this.get2DVersion(filename)
        })
    );
  }

  /**
   * Gets the test commands for the plugin. For advanced use.
   *
   * @gooddefault
   * @document
   * @returns {ITest}  The selenium test commands.
   */
  getTests(): ITest {
    return {
      pluginOpen: new TestCmdList()
        .text("#modal-loadpubchem #formMolName", "Aspirin")
        // TODO: Below could wait until value populated. Hoping it will take
        // less than 3 secs is hackish.
        .wait(5).cmds,
      afterPluginCloses: new TestCmdList()
        .waitUntilRegex("#styles", "Compound")
        .waitUntilRegex("#log", 'Job "loadpubchem:.+?" ended').cmds
    };
  }
}
</script>

<style scoped lang="scss">
.inverse-indent {
    text-indent: -1em;
    padding-left: 1em;
}
</style>
