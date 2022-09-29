<template>
  <Popup
    title="New Session"
    v-model="open"
    cancelBtnTxt="Cancel"
    actionBtnTxt="New Session"
    @onDone="onPopupDone"
    actionBtnTxt2="Save Session First"
    @onDone2="saveSession"
    :isActionBtnEnabled="true"

  >
    <p>If you start a new session, your current session will be lost. Would you like to <a href="#" @click="saveSession">save the session first</a>?</p>
  </Popup>
</template>

<script lang="ts">
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import FormFile from "@/UI/Forms/FormFile.vue";
import { IFileInfo } from "../../../FileSystem/Interfaces";
import { setStoreIsDirty, storeIsDirty } from "@/Store/LoadAndSaveStore";
import { PopupPluginParent } from "@/Plugins/Parents/PopupPluginParent";
import * as api from "@/Api";

/**
 * NewSessionPlugin
 */
@Options({
  components: {
    Popup,
    FormFile,
  },
})
export default class NewSessionPlugin extends PopupPluginParent {
  menuPath = "File/[1] Session/[0] New";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  filesToLoad: IFileInfo[] = [];
  pluginId = "newsession";
  intro = ""; // Not used

  /**
   * Runs when the user presses the action button and the popup closes.
   */
  onPopupDone() {
    this.closePopup();
    this.submitJobs();
  }

  /**
   * Runs before the popup opens. Good for initializing/resenting variables
   * (e.g., clear inputs from previous open).
   */
  beforePopupOpen() {
    if (!storeIsDirty) {
      // Since store is not dirty, just reload page.
      window.location.reload();
    }
    return;
  }

  /**
   * Runs when the user presses the save session link.
   *
   * @param {Event | undefined} e  The event (if any) that triggered this
   *                               function.
   */
  saveSession(e: Event | undefined) {
    if (e !== undefined) {
      e.preventDefault();
    }
    this.closePopup();
    setTimeout(() => {
      api.plugins.runPlugin("savesession", true);
    }, 1000);
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   */
  runJob(/* parameters: IFileInfo */) {
    setStoreIsDirty(false);
    window.location.reload();
  }
}
</script>

<style scoped lang="scss">
.inverse-indent {
  text-indent: -1em;
  padding-left: 1em;
}
</style>
