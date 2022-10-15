<template>
  <PluginComponent
    :userArgs="userArgs"
    title="New Session"
    v-model="open"
    cancelBtnTxt="Cancel"
    actionBtnTxt="New Session"
    :pluginId="pluginId"
    @onPopupDone="onPopupDone"
    actionBtnTxt2="Save Session First"
    @onPopupDone2="saveSession"
    :isActionBtnEnabled="true"
  >
    <p>
      If you start a new session, your current session will be lost. Would you
      like to <a href="#" @click="saveSession">save the session first</a>?
    </p>
  </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import FormFile from "@/UI/Forms/FormFile.vue";
import { setStoreIsDirty, storeIsDirty } from "@/Store/LoadAndSaveStore";
import * as api from "@/Api";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest, TEST_COMMAND } from "@/Testing/ParentPluginTestFuncs";
import { IFileInfo } from "@/FileSystem/Definitions";

/**
 * NewSessionPlugin
 */
@Options({
  components: {
    PluginComponent,
    FormFile,
  },
})
export default class NewSessionPlugin extends PluginParentClass {
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

  userArgs: FormElement[] = [];
  alwaysEnabled = true;

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
  onBeforePopupOpen() {
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
  runJob(/* fileInfo: IFileInfo */) {
    setStoreIsDirty(false);
    window.location.reload();
  }

  getTests(): ITest[] {
    return [
      // First test without saving first
      {
        beforePluginOpens: [this.testLoadExampleProtein()],
        // populateUserArgs: [],
        // closePlugin: [],
        afterPluginCloses: [this.testWait(1)],
      },

      // Test with saving first (secondary button)
      {
        beforePluginOpens: [this.testWaitForRegex("#styles", "Protein")],
        // populateUserArgs: [],
        closePlugin: [
          {
            cmd: TEST_COMMAND.CLICK,
            selector: "#modal-newsession .action-btn2",
          },
          this.testWait(3)
        ],
        afterPluginCloses: [
          {
            cmd: TEST_COMMAND.TEXT,
            selector: "#modal-savesession #filename-savesession-item",
            data: "test",
          },
          {
            cmd: TEST_COMMAND.CLICK,
            selector: "#modal-savesession .action-btn",
          },
          this.testWait(5),
          {
            cmd: TEST_COMMAND.CLICK,
            selector: "#modal-simplemsg .cancel-btn",
          },
          this.testWait(1),
        ],
      },
    ];
  }
}
</script>

<style scoped lang="scss">
.inverse-indent {
  text-indent: -1em;
  padding-left: 1em;
}
</style>
