<template>
  <PluginComponent
    :userInputs="userInputs"
    v-model="open"
    title="Save a VRML Model"
    actionBtnTxt="Save"
    :intro="intro"
    @onPopupDone="onPopupDone"
  ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import * as api from "@/Api";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { fileNameFilter, matchesFilename } from "@/FileSystem/Utils";
import { ISaveTxt } from "@/Core/FS";
import { checkanyMolLoaded } from "../../CheckUseAllowedUtils";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { FormElement, IFormText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";

/**
 * SaveVRMLPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class SaveVRMLPlugin extends PluginParentClass {
  menuPath = "File/Molecules/[6] Export/VRML";
  softwareCredits: ISoftwareCredit[] = []; // TODO: 3dmoljs
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "savevrml";

  intro = `Please provide the name of the VRML file to save. Note that the
      extension ".vrml" will be automatically appended.`;

  userInputs: FormElement[] = [
    {
      id: "filename",
      label: "",
      val: "",
      placeHolder: "Enter Filename (e.g., my_model.vrml)",
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
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  checkPluginAllowed(): string | null {
    return checkanyMolLoaded(this);
  }

  /**
   * Runs when the user presses the action button and the popup closes.
   *
   * @param {IUserArg[]} userParams  The user arguments.
   */
  onPopupDone(userParams: IUserArg[]) {
    this.submitJobs([{ filename: userParams[0].val }]);
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {any} parameters  Information about the VRML file to save.
   * @returns {Promise<undefined>}  A promise that resolves when the job is
   *     done.
   */
  runJob(parameters: any): Promise<undefined> {
    let filename = parameters.filename;
    let vrmlTxt = api.visualization.viewer.exportVRML();
    api.visualization.viewer.render();

    return api.fs.saveTxt({
      fileName: filename,
      content: vrmlTxt,
      ext: ".vrml",
    } as ISaveTxt);
  }
}
</script>

<style scoped lang="scss"></style>
