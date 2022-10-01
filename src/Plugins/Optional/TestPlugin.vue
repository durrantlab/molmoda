<template>
  <OptionalPluginParent
    :userInputs="userInputs"
    v-model="open"
    title="Load Molecule from PubChem"
    :isActionBtnEnabled="isBtnEnabled()"
    :intro="intro"
    @onPopupDone="onPopupDone"
  ></OptionalPluginParent>
</template>

<script lang="ts">
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import {
  FormElement,
  FormElemType,
  IFormGroup,
  IFormMoleculeInputParams,
  IFormNumber,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import OptionalPluginParent from "@/Plugins/Parents/OptionalPluginParent/OptionalPluginParent.vue";
import { OptionalPluginParentRenderless } from "@/Plugins/Parents/OptionalPluginParent/OptionalPluginParentRenderless";
import { Options } from "vue-class-component";
import { defaultMoleculeInputParams } from "@/UI/Forms/MoleculeInputParams/MoleculeInputParamsTypes";
import { makeMoleculeInput } from "@/UI/Forms/MoleculeInputParams/MakeMoleculeInput";

/**
 * TestPlugin
 */
@Options({
  components: {
    OptionalPluginParent,
  },
})
export default class TestPlugin extends OptionalPluginParentRenderless {
  menuPath = "Test/Test Component";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "testplugin";

  intro = `This is a <b>test</b> component.`;

  userInputs: FormElement[] = [
    {
      type: FormElemType.Number,
      id: "moose",
      label: "Moose",
      val: 0,
    } as IFormNumber,
    {
      type: FormElemType.MoleculeInputParams,
      id: "makemolinputparams",
      val: defaultMoleculeInputParams()
    } as IFormMoleculeInputParams,
    {
      id: "group",
      type: FormElemType.Group,
      label: "Labelme",
      childElements: [
        {
          type: FormElemType.Number,
          id: "moose2",
          label: "Moose2",
          val: 0,
        },
        {
          type: FormElemType.Text,
          id: "moose3",
          label: "Moose3",
          val: "face",
        },
      ],
      startOpened: true,
    } as IFormGroup,
  ];

  /**
   * Runs before the popup opens. Good for initializing/resenting variables
   * (e.g., clear inputs from previous open).
   */
  beforePopupOpen() {
    return;
  }

  onPopupDone(userInputs: IUserArg[]) {
    this.submitJobs([userInputs]);
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {IUserArg[]} _args  The user arguments to pass to the "executable."
   * @returns {Promise<undefined>}  A promise that resolves when the job is
   *     done.
   */
  runJob(_args: IUserArg[]): Promise<undefined> {
    console.log(_args);
    debugger
    return Promise.resolve(undefined);

    // // let args: string[] = ['-:CO(=O)', '--gen2D', '-osdf', '-p', '7.4'];
    // // let args: string[] = ['-H'];

    // let beforeOBFunc = (obabel: any) => {
    //   writeFile(obabel, "testfile.txt", "test text");
    // };

    // let afterOBFunc = (obabel: any) => {
    //   console.log(readDir(obabel, "."));
    //   console.log(readFile(obabel, "testfile.txt"));
    // };

    // return runOpenBabel(
    //   ["-:CO(=O)", "--gen2D", "-osdf", "-p", "7.4"],
    //   beforeOBFunc,
    //   afterOBFunc
    // )
    //   .then((res) => {
    //     console.log(res);
    //     return undefined;
    //   })
    //   .catch((err) => {
    //     console.log(err);
    //     return undefined;
    //   });
  }
}
</script>

<style scoped lang="scss"></style>
