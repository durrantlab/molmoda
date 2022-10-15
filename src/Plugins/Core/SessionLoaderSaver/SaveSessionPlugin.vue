<template>
  <PluginComponent
    :userArgs="userArgs"
    v-model="open"
    title="Save a Session"
    actionBtnTxt="Save"
    :intro="introToUse"
    :pluginId="pluginId"
    @onPopupDone="onPopupDone"
    :prohibitCancel="windowClosing"
  ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import { saveState, setStoreIsDirty } from "@/Store/LoadAndSaveStore";
import { fileNameFilter, matchesFilename } from "@/FileSystem/Utils";
import * as api from "@/Api";
import { checkanyMolLoaded } from "../CheckUseAllowedUtils";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement, IFormText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { ITest } from "@/Testing/ParentPluginTestFuncs";

/**
 * SaveSessionPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class SaveSessionPlugin extends PluginParentClass {
  menuPath = "File/Session/[1] Save As";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "savesession";

  intro = `Please provide the name of the session file to save. Note that the
      extension ".biotite" will be automatically appended.`;

  windowClosing = false;

  userArgs: FormElement[] = [
    {
      id: "filename",
      label: "",
      val: "",
      placeHolder: "Enter Filename (e.g., my_session.biotite)",
      filterFunc: (filename: string): string => {
        return fileNameFilter(filename);
      },
      validateFunc: (filename: string): boolean => {
        return matchesFilename(filename);
      },
    } as IFormText,
  ];

  alwaysEnabled = true;

  /**
   * Determine which into text to use.
   *
   * @returns {string} The intro text to use.
   */
  get introToUse(): string {
    let i = "";

    if (this.windowClosing) {
      i += "Be sure to save your work before closing!</p><p>";
    }

    i += this.intro;

    return i;
  }

  /**
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  checkPluginAllowed(): string | null {
    return checkanyMolLoaded(this);
  }

  /**
   * Runs before the popup opens. Good for initializing/resenting variables
   * (e.g., clear inputs from previous open).
   */
  onBeforePopupOpen() {
    this.windowClosing = this.payload !== undefined;
    this.payload = undefined;
  }

  /**
   * Runs when the user presses the action button and the popup closes.
   *
   * @param {IUserArg[]} userArgs  The user arguments.
   */
  onPopupDone(userArgs: IUserArg[]) {
    this.submitJobs([{ filename: userArgs[0].val }]);
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {any} parameters  Information about the file to save.
   * @returns {Promise<undefined>}  A promise that resolves when the job is
   *     done.
   */
  runJob(parameters: any): Promise<undefined> {
    let filename = parameters.filename;

    // Add .biotite to end if not already there
    if (!filename.endsWith(".biotite")) {
      filename += ".biotite";
    }

    return saveState(filename, this.$store.state)
      .then(() => {
        setStoreIsDirty(false);
        if (this.windowClosing) {
          api.messages.popupMessage(
            "Session Ended",
            "Your file has been saved. You may now close/reload this tab/window.",
            PopupVariant.INFO,
            () => {
              // Reload the page
              window.location.reload();
            }
          );
        }
        return undefined;
      })
      .catch((err: any) => {
        console.log(err);
        return undefined;
      });
  }

  getTests(): ITest {
    return {
      beforePluginOpens: [this.testLoadExampleProtein()],
      populateUserArgs: [this.testUserArg("filename", "test")],
      afterPluginCloses: [
        this.testWaitForRegex("#log", 'Job "savesession:.+?" ended'),
        this.testWait(3)
      ],
    };
  }
}
</script>

<style scoped lang="scss"></style>
