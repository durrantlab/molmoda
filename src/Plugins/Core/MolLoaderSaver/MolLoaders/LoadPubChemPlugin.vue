<template>
  <Popup
    title="Load Molecule from PubChem"
    v-model="open"
    cancelBtnTxt="Cancel"
    actionBtnTxt="Load"
    @onDone="onPopupDone"
    :isActionBtnEnabled="isBtnEnabled()"
  >
    <p v-html="intro"></p>
    <FormWrapper
      ><FormInput
        ref="formMolName"
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
      ></FormInput>
    </FormWrapper>
  </Popup>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/no-this-alias */

import Popup from "@/UI/Layout/Popups/Popup.vue";
import { Options } from "vue-class-component";
import FormInput from "@/UI/Forms/FormInput.vue";
import FormWrapper from "@/UI/Forms/FormWrapper.vue";
import { slugify } from "@/Core/Utils";
import { appName } from "@/main";
import { loadMoleculeFile } from "@/FileSystem/LoadMoleculeFiles";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { loadRemote } from "./Utils";
import { IFileInfo } from "@/FileSystem/Interfaces";
import { PopupPluginParent } from "@/Plugins/PopupPluginParent";
import * as api from "@/Api";

@Options({
  components: {
    Popup,
    FormInput,
    FormWrapper,
  },
})
export default class LoadPubChemPlugin extends PopupPluginParent {
  menuPath = "File/Molecules/Import/[6] PubChem";
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

  intro = `Enter the molecule name or PubChem Chemical Identification (CID) number.
      ${appName} will look up the CID if you enter the name. Search the
      <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank">PubChem
      Database</a>, a database of small molecules, to find the CID on your own.`;

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

  get appName(): string {
    return appName;
  }

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

  searchByName(): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let catchFunc = (_err: string) => {
      // this.molNameRespDescription = err;
      this.molNameRespDescription = `<span class="text-danger">Could not find a molecule named "${this.molName}".</span>`;
      this.cid = "";
    };

    loadRemote(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${this.molName}/synonyms/JSON`
    )
      .then((fileInfo: IFileInfo) => {
        let json = JSON.parse(fileInfo.contents);
        // debugger;
        let cid = json.InformationList.Information[0].CID;
        this.cid = cid;

        let synonyms = json.InformationList.Information[0].Synonym;
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
  }

  onPopupDone(): void {
    this.closePopup();

    let filename = "";
    if (this.molName !== "") {
      filename += slugify(this.molName) + "-";
    }
    filename += "CID" + this.cid + ".sdf";

    loadRemote(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${this.cid}/record/SDF/?record_type=3d&response_type=display`
    )
      .then((fileInfo: IFileInfo) => {
        fileInfo.name = filename;
        fileInfo.type = "SDF";
        this.submitJobs([fileInfo]);
        return;
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .catch((_err: string) => {
        // If it failed, it could be because there's no 3D coordinates. Try 2D.
        loadRemote(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${this.cid}/record/SDF/?record_type=2d&response_type=display`
        )
          .then((fileInfo: IFileInfo) => {
            fileInfo.name = filename;
            fileInfo.type = "SDF";
            this.submitJobs([fileInfo]);
            return;
          })
          .catch((err: string) => {
            api.messages.popupError(err);
          });
      });
  }

  onPopupOpen() {
    let focusTarget = (this.$refs.formMolName as any).$refs
      .inputElem as HTMLInputElement;
    focusTarget.focus();
  }

  beforePopupOpen(): void {
    this.cid = "";
    this.molName = "";
  }

  runJob(parameters: IFileInfo) {
    loadMoleculeFile(parameters);
  }
}
</script>

<style scoped lang="scss">
.inverse-indent {
  text-indent: -1em;
  padding-left: 1em;
}
</style>
