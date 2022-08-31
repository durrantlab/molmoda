<template>
  <Popup :title="title" v-model="open" cancelBtnTxt="Ok" @onClosed="onClosed" :variant="variant">
    <p style="overflow: hidden; text-overflow: ellipsis">{{ message }}</p>
  </Popup>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options } from "vue-class-component";
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { PluginParent } from "@/Plugins/PluginParent";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import { ISimpleMsg, PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";

@Options({
  components: {
    Popup,
  },
})
export default class SimpleMsg extends PluginParent {
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

  open = false;
  title = "";
  message = "";
  variant = PopupVariant.PRIMARY;
  callBack: any = undefined;

  onPluginStart(payload: ISimpleMsg) {
    this.title = payload.title;
    this.message = payload.message;
    this.callBack = payload.callBack;
    if (payload.variant !== undefined) {
      this.variant = payload.variant;
    }
    this.open = true;
  }

  onClosed() {
    this.submitJobs();
  }

  runJob() {
    this.open = false;
    if (this.callBack) {
      this.callBack();
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

