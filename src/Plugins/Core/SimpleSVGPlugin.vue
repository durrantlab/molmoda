<template>
  <PluginComponent
    :infoPayload="infoPayload"
    v-model="open"
    :cancelBtnTxt="neverClose ? '' : 'Ok'"
    actionBtnTxt=""
    @onClosed="onClosed"
    :variant="variant"
    @onUserArgChanged="onUserArgChanged"
    @onPopupDone="onPopupDone"
    modalWidth="xl"
    @onMolCountsChanged="onMolCountsChanged"
  >
    <div class="svg-container d-flex flex-column">
      <div
        class="svg-wrapper text-center w-100"
        ref="svgElement"
        v-html="svgContents"
      ></div>
      <div class="download-links">
        <small>
          Download as
          <a @click.prevent="downloadSVG" class="link-primary">SVG</a>
          or
          <a @click.prevent="downloadPNG" class="link-primary">PNG</a></small
        >
      </div>
      <p class="mt-2" v-html="message"></p>
    </div>
  </PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options } from "vue-class-component";
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import {
  ISimpleSvg,
  PopupVariant,
} from "@/UI/Layout/Popups/InterfacesAndEnums";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { Tag } from "../Tags/Tags";
import { FailingTest } from "@/Testing/FailingTest";
import * as api from "@/Api";
import { FileInfo } from "@/FileSystem/FileInfo";

/**
 * SimpleVideoPlugin
 */
@Options({
  components: {
    Popup,
    PluginComponent,
  },
})
export default class SimpleSVGPlugin extends PluginParentClass {
  // @Prop({ required: true }) svgContents!: string;
  // @Prop({ required: true }) message!: string;

  menuPath = null;
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [];
  pluginId = "simplesvg";
  intro = "";
  tags = [Tag.All];

  // Below set via onPluginStart.
  title = "";
  message = "";
  variant = PopupVariant.Primary;
  callBack: any = undefined;
  neverClose = false;
  showInQueue = false;
  svgContents = "";

  userArgDefaults: UserArg[] = [];

  logJob = false;

  /**
   * Runs when the user first starts the plugin. For example, if the plugin is
   * in a popup, this function would open the popup.
   *
   * @param {ISimpleSvg} [payload]  Information about the message to display.
   * @returns {Promise<void>}       Promise that resolves when the plugin is
   *                                finished starting.
   */
  async onPluginStart(payload: ISimpleSvg): Promise<void> {
    this.title = payload.title;
    this.message = payload.message;
    this.callBack = payload.callBack;
    this.variant =
      payload.variant === undefined ? PopupVariant.Primary : payload.variant;
    this.neverClose =
      payload.neverClose === undefined ? false : payload.neverClose;
    this.open = payload.open !== undefined ? payload.open : true;
    this.svgContents = payload.svgContents;
  }

  /**
   * Runs when the user closes the simple message popup.
   */
  onClosed() {
    this.submitJobs();
  }

  /**
   * Every plugin runs some job. This is the function that does the job
   * running.
   *
   * @returns {Promise<void>}  Resolves when the job is done.
   */
  runJobInBrowser(): Promise<void> {
    if (this.callBack) {
      this.callBack();
    }
    return Promise.resolve();
  }

  downloadSVG() {
    const fileInfo = new FileInfo({
      name: "image.svg",
      contents: this.svgContents,
    });
    api.fs.saveTxt(fileInfo);
  }

  async downloadPNG() {
    const svgElement = this.$refs.svgElement as HTMLElement;
    if (!svgElement) return;

    const svg = svgElement.querySelector("svg");
    if (!svg) return;

    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svg);
    const encodedData = encodeURIComponent(svgData);
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodedData}`;

    // Create an image element and draw it on a canvas
    const img = new Image();
    img.onload = () => {
      // Set desired width and calculate height to maintain aspect ratio
      const targetWidth = 1024; // Desired width in pixels
      const originalWidth = img.width;
      const originalHeight = img.height;
      const aspectRatio = originalHeight / originalWidth;
      const targetHeight = Math.round(targetWidth * aspectRatio);

      // Create canvas with new dimensions
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Convert canvas to Blob and then to data URI
      canvas.toBlob((blob) => {
        if (!blob) return;

        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUri = reader.result as string; // The data URI
          api.fs.savePngUri("image.png", dataUri); // Pass the data URI to savePngUri
        };
        reader.readAsDataURL(blob); // Convert the Blob to a data URI
      }, "image/png");
    };
    img.src = svgUrl;
  }

  /**
   * Gets the test commands for the plugin. For advanced use.
   *
   * @gooddefault
   * @document
   * @returns {ITest[]}  The selenium test commands.
   */
  async getTests(): Promise<ITest[]> {
    // Not going to test closing, etc. (Too much work.) But at least opens
    // to see if an error occurs.

    // api.plugins.runPlugin(this.pluginId, {
    //     title: "Test Title",
    //     message: "Test message",
    //     youtubeID: "H8VkRiHayeU",
    //     open: true, // open
    // } as ISimpleVideo);

    // return [];

    return [FailingTest];
  }
}
</script>

<style scoped lang="scss">
.svg-container {
  width: 100%; /* Ensures container scales with parent */
  height: auto; /* Adapts height to content */
  display: flex;
  justify-content: center;
  //   align-items: center;
}

.svg-wrapper {
  width: 100%;
  height: auto; /* Allows the height to scale proportionally */
}

.svg-wrapper svg {
  display: block;
  width: 100%; /* Fills the container width */
  height: auto; /* Maintains aspect ratio */
}
</style>
