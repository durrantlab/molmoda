<template>
  <PopupOptionalPlugin
    :userInputs="userInputs"
    v-model="open"
    title="Load Molecule from PubChem"
    :isActionBtnEnabled="isBtnEnabled()"
    :intro="intro"
    @onPopupDone="onPopupDone"
  ></PopupOptionalPlugin>
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
  IFormNumber,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import PopupOptionalPlugin from "@/UI/Layout/Popups/PopupOptionalPlugin.vue";
import { OptionalPluginParent } from "./OptionalPluginParent";
import { Options } from "vue-class-component";
import {
  runOpenBabel,
  writeFile,
  readDir,
  readFile,
} from "@/FileSystem/OpenBabel";

/**
 * TestPlugin
 */
@Options({
  components: {
    PopupOptionalPlugin,
  },
})
export default class TestPlugin extends OptionalPluginParent {
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

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {IUserArg[]} _args  The user arguments to pass to the "executable."
   */
  runJob(_args: IUserArg[]) {
    // console.log(_args);

    // let args: string[] = ['-:CO(=O)', '--gen2D', '-osdf', '-p', '7.4'];
    // let args: string[] = ['-H'];

    let beforeOBFunc = (obabel: any) => {
      writeFile(obabel, "testfile.txt", "test text");
    };

    let afterOBFunc = (obabel: any) => {
      console.log(readDir(obabel, "."));
      console.log(readFile(obabel, "testfile.txt"));
    };

    runOpenBabel(
      ["-:CO(=O)", "--gen2D", "-osdf", "-p", "7.4"],
      beforeOBFunc,
      afterOBFunc
    )
      .then((res) => {
        console.log(res);
        return;
      })
      .catch((err) => {
        console.log(err);
      });
  }
}
</script>

<style scoped lang="scss"></style>
