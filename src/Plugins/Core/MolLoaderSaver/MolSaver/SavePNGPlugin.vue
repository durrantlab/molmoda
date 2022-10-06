<template>
  <PluginComponent
    :userInputs="userInputs"
    v-model="open"
    title="Save a PNG Image"
    actionBtnTxt="Save"
    :intro="intro"
    @onPopupDone="onPopupDone"
  ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import * as api from "@/Api";
import { fileNameFilter, matchesFilename } from "@/FileSystem/Utils";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { checkanyMolLoaded } from "../../CheckUseAllowedUtils";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { FormElement, IFormText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";

/**
 * SavePNGPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class SavePNGPlugin extends PluginParentClass {
  menuPath = "File/Molecules/[6] Export/PNG";
  softwareCredits: ISoftwareCredit[] = []; // TODO: 3dmoljs
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "savepng";

  intro = `Please provide the name of the PNG file to save. Note that the
      extension ".png" will be automatically appended.`;

  userInputs: FormElement[] = [
    {
      id: "filename",
      label: "",
      val: "",
      placeHolder: "Enter Filename (e.g., my_image.png)",
      filterFunc: (filename: string): string => {
        return fileNameFilter(filename);
      },
      validateFunc: (filename: string): boolean => {
        return matchesFilename(filename);
      },
    } as IFormText,
  ];

  /**
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  checkUseAllowed(): string | null {
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
   * @param {any} parameters  Information about the PNG file to save.
   */
  runJob(parameters: any) {
    let filename = parameters.filename;

    let pngUri = api.visualization.viewer.pngURI();
    api.fs.savePngUri(filename, pngUri);
  }
}
</script>

<style scoped lang="scss"></style>
