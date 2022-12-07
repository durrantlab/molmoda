<template>
  <PluginComponent
    :userArgs="userArgs"
    v-model="open"
    title="Save a VRML Model"
    actionBtnTxt="Save"
    :intro="intro"
    :pluginId="pluginId"
    @onPopupDone="onPopupDone"
  ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import * as api from "@/Api";
import {
  IContributorCredit,
  ISoftwareCredit,
Licenses,
} from "@/Plugins/PluginInterfaces";
import { checkAnyMolLoaded } from "../CheckUseAllowedUtils";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { FormElement, IFormText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { ITest } from "@/Testing/ParentPluginTestFuncs";
import {
  fileNameFilter,
  matchesFilename,
} from "@/FileSystem/FilenameManipulation";
import { FileInfo } from "@/FileSystem/FileInfo";

/**
 * SaveVRMLPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class SaveVRMLPlugin extends PluginParentClass {
  menuPath = "File/Graphics/VRML";
  softwareCredits: ISoftwareCredit[] = [
    {
      name: "3Dmol.js",
      url: "https://3dmol.csb.pitt.edu/",
      license: Licenses.BSD3,
    },
  ];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "savevrml";

  intro = `Please provide the name of the VRML file to save. The
      extension ".vrml" will be automatically appended.`;

  userArgs: FormElement[] = [
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
    return checkAnyMolLoaded();
  }

  /**
   * Runs when the user presses the action button and the popup closes.
   *
   * @param {IUserArg[]} userArgs  The user arguments.
   */
  onPopupDone(userArgs: IUserArg[]) {
    this.submitJobs([{ filename: this.getArg(userArgs, "filename") }]);
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {any} parameters  Information about the VRML file to save.
   */
  runJobInBrowser(parameters: any) {
    let filename = parameters.filename;
    let vrmlTxt = api.visualization.viewer?.exportVRML();
    api.visualization.viewer?.renderAll();

    api.fs.saveTxt(new FileInfo({
      name: filename,
      contents: vrmlTxt
    }));
  }

  /**
   * Gets the selenium test commands for the plugin. For advanced use.
   *
   * @gooddefault
   * @document
   * @returns {ITest}  The selenium test commands.
   */
  getTests(): ITest {
    return {
      beforePluginOpens: [this.testLoadExampleProtein()],
      pluginOpen: [this.testSetUserArg("filename", "test")],
      afterPluginCloses: [
        this.testWaitForRegex("#log", 'Job "savevrml:.+?" ended'),
        this.testWait(3),
      ],
    };
  }
}
</script>

<style scoped lang="scss"></style>
