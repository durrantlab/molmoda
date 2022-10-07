<template>
  <PluginComponent
    :title="title"
    v-model="open"
    :cancelBtnTxt="neverClose ? '' : 'Ok'"
    actionBtnTxt=""
    @onClosed="onClosed"
    :variant="variant"
    :userInputs="userInputs"
    :intro="intro"
  >
    <p style="overflow: hidden; text-overflow: ellipsis" v-html="message"></p>
  </PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options } from "vue-class-component";
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import {
  ISimpleMsg,
  PopupVariant,
} from "@/UI/Layout/Popups/InterfacesAndEnums";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";

/**
 * SimpleMsgPlugin
 */
@Options({
  components: {
    Popup,
    PluginComponent,
  },
})
export default class SimpleMsgPlugin extends PluginParentClass {
  // @Prop({ required: true }) title!: string;
  // @Prop({ required: true }) message!: string;

  menuPath = null;
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "simplemsg";
  intro = "";  // Not used

  // Below set via onPluginStart.
  title = "";
  message = "";
  variant = PopupVariant.PRIMARY;
  callBack: any = undefined;
  neverClose = false;

  userInputs: FormElement[] = [];
  alwaysEnabled = true;

  /**
   * Runs when the user first starts the plugin. For example, if the plugin is
   * in a popup, this function would open the popup.
   *
   * @param {ISimpleMsg} [payload]  Information about the message to display.
   */
  onPluginStart(payload: ISimpleMsg) {
    this.title = payload.title;
    this.message = payload.message;
    this.callBack = payload.callBack;
    this.variant =
      payload.variant === undefined ? PopupVariant.PRIMARY : payload.variant;
    this.neverClose =
      payload.neverClose === undefined ? false : payload.neverClose;
    this.open = true;
  }

  /**
   * Runs when the user closes the simple message popup.
   */
  onClosed() {
    this.submitJobs();
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   */
  runJob() {
    if (this.callBack) {
      this.callBack();
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

