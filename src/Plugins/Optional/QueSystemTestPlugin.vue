<template>
  <PluginComponent
    :userArgs="userArgs"
    v-model="open"
    title="Load Molecule from PubChem"
    :intro="intro"
    @onPopupDone="onPopupDone"
    :pluginId="pluginId"
  ></PluginComponent>
</template>

<script lang="ts">
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import {
  FormElement,
  IFormGroup,
  IFormMoleculeInputParams,
  IFormNumber,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { Options } from "vue-class-component";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";

/**
 * QueSystemTestPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class QueSystemTestPlugin extends PluginParentClass {
  menuPath = "Test/Test Component Queue System";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "testplugin2";

  intro = `This is a <b>test</b> component.`;

  msgOnJobsFinished = "All jobs finished, moo.";

  userArgs: FormElement[] = [
    {
      // type: FormElemType.Number,
      id: "moose",
      label: "Moose",
      val: 0,
    } as IFormNumber,
    {
      // type: FormElemType.MoleculeInputParams,
      id: "makemolinputparams",
      val: new MoleculeInput({ compoundFormat: "can" }),
    } as IFormMoleculeInputParams,
    {
      id: "group",
      // type: FormElemType.Group,
      label: "Labelme",
      childElements: [
        {
          // type: FormElemType.Number,
          id: "moose2",
          label: "Moose2",
          val: 0,
        },
        {
          // type: FormElemType.Text,
          id: "moose3",
          label: "Moose3",
          val: "face",
        },
      ],
      startOpened: true,
    } as IFormGroup,
  ];

  /**
   * Runs when the user presses the action button and the popup closes.
   *
   * @param {IUserArg[]} userArgs  The user arguments.
   */
  onPopupDone(/* userArgs: IUserArg[] */) {
    // * @param {IUserArg[]} userArgs  The user arguments.
    // debugger;
    // this.submitJobs([userArgs]);
    const jobParams = [];
    for (let i = 0; i < 10; i++) {
      const jobParam = {
        delay: Math.random() * 10000, // ms
      };
      jobParams.push(jobParam);
    }
    this.submitJobs(jobParams, Math.round(Math.random() * 2)); // , 10000);
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {any} _args  The user arguments to pass to the "executable."
   * @returns {Promise<undefined>}  A promise that resolves when the job is
   *     done.
   */
  runJobInBrowser(_args: any): Promise<undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(undefined);
      }, _args.delay);
    });

    // console.log(_args);

    // Submit some jobs that delay randomly.

    // debugger;
    // return Promise.resolve(undefined);
  }
}
</script>

<style scoped lang="scss"></style>
