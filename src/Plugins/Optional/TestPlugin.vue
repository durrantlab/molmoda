<template>
  <PopupOptionalPlugin
    :userInputs="userInputs"
    :open="open"
    title="Load Molecule from PubChem"
    :actionBtnEnabled="isBtnEnabled"
    :intro="intro"
    @onPopupDone="onPopupDone"
  ></PopupOptionalPlugin>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { OptionalPluginParent } from "../OptionalPluginParent";
import {
  FormElement,
  FormElemType,
  IFormGroup,
  IFormNumber,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import PopupOptionalPlugin from "@/UI/Layout/Popups/PopupOptionalPlugin.vue";
import { dynamicImports } from "@/Core/DynamicImports";

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

  runJob(args: IUserArg[]) {
    dynamicImports.memfs.module
    .then((memfs: any) => {
      debugger;
    });
  }
}
</script>

<style scoped lang="scss"></style>
