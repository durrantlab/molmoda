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
import { dynamicImports } from "@/Core/DynamicImports";
import { IFileInfo } from "@/FileSystem/Types";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import {
  FormElement,
  IFormMoleculeInputParams,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { Options } from "vue-class-component";
import { calcMolProps, ICalcMolProps } from "./CalcMolProps";

/**
 * TestPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class MolPropsPlugin extends PluginParentClass {
  menuPath = "Test/Mol Props";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "molprops";

  intro = `This is a <b>test</b> component.`;

  userArgs: FormElement[] = [
    {
      // type: FormElemType.MoleculeInputParams,
      id: "makemolinputparams",
      val: new MoleculeInput({
        compoundFormat: "can",
        considerProteins: false,
      }),
    } as IFormMoleculeInputParams,
  ];

  onBeforePopupOpen() {
    // You're probably going to need open babel and rdkitjs
    dynamicImports.rdkitjs.module;
    dynamicImports.openbabeljs.module;
  }

  /**
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  // checkPluginAllowed(): string | null {
  //   return checkAnyMolSelected(
  //     this.$store.state.molecules.filter(
  //       (m: IMolContainer) => m.type === MolType.Compound
  //     ),
  //     "compound"
  //   );
  // }

  /**
   * Runs when the user presses the action button and the popup closes.
   *
   * @param {IUserArg[]} userArgs  The user arguments.
   */
  onPopupDone(userArgs: IUserArg[]) {
    const compounds = this.getArg(userArgs, "makemolinputparams");
    this.submitJobs(compounds); // , 10000);
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {IUserArg[]} _args  The user arguments to pass to the "executable."
   * @returns {Promise<undefined>}  A promise that resolves when the job is
   *     done.
   */
  runJobInBrowser(fileInfo: IFileInfo): Promise<undefined> {
    return calcMolProps(fileInfo.contents, fileInfo.molContainer).then(
      (molProps: ICalcMolProps) => {
        // debugger
        return undefined;
      }
    );
  }
}
</script>

<style scoped lang="scss"></style>
