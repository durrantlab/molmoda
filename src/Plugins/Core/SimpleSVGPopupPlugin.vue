<template>
  <PluginComponent :infoPayload="infoPayload" v-model="open" :cancelBtnTxt="neverClose ? '' : 'Ok'" actionBtnTxt=""
 @onClosed="onClosed" :variant="variant" @onUserArgChanged="onUserArgChanged" @onPopupDone="onPopupDone"
 modalWidth="xl" @onMolCountsChanged="onMolCountsChanged">
 <ImageViewer v-if="svgContents !== ''" :source="svgContents" :filenameBase="filenameBaseToUse"
   :showDownloadButtons="showDownloadButtons" :maxHeight="maxHeight" />
 <!-- :maxHeight="500"  -->
 <div v-if="message !== ''" class="mt-2" v-html="message"></div>
 <Alert v-if="alertMessage !== ''" type="info" extraClasses="mt-2">
   {{ alertMessage }}
 </Alert>
  </PluginComponent>
</template>
<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import {
  ISimpleSvg,
  PopupVariant,
} from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { Tag } from "./ActivityFocus/ActivityFocusUtils";
import { FailingTest } from "@/Testing/FailingTest";
// import * as api from "@/Api"; // No longer needed for download if ImageViewer handles it
// import { FileInfo } from "@/FileSystem/FileInfo"; // No longer needed for download if ImageViewer handles it
import ImageViewer from "@/UI/Components/ImageViewer.vue"; // Import the new component
import Alert from "@/UI/Layout/Alert.vue";
// import { FileInfo } from "@/FileSystem/FileInfo";
// import { fsApi } from "@/Api/FS";

/**
 * SimpleSVGPopupPlugin
 */
@Options({
  components: {
    PluginComponent,
    ImageViewer,
    Alert,
  },
})
export default class SimpleSVGPopupPlugin extends PluginParentClass {
  menuPath = null;
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [];
  pluginId = "simplesvgpopup";
  intro = "";
  tags = [Tag.All];

  // Below set via onPluginStart.
  title = "";
  message = "";
  alertMessage = "";
  variant = PopupVariant.Primary;
  callBack: any = undefined;
  neverClose = false;
  showInQueue = false;
  svgContents = "";
  filenameBasePayload = "image"; // Default filename base from payload
  showDownloadButtons = true;
  maxHeight: number | undefined = undefined;
  userArgDefaults: UserArg[] = [];
  logJob = false;

  /**
   * Gets the filename base to use for downloads.
   * 
   * @returns {string} The filename base.
   */
  get filenameBaseToUse(): string {
    return this.filenameBasePayload || "image";
  }

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
    this.alertMessage = payload.alertMessage || "";
    this.callBack = payload.callBack;
    this.variant =
      payload.variant === undefined ? PopupVariant.Primary : payload.variant;
    this.neverClose =
      payload.neverClose === undefined ? false : payload.neverClose;
    this.open = payload.open !== undefined ? payload.open : true;
    this.svgContents = payload.svgContents;
    this.filenameBasePayload = payload.filenameBase || "image";
    this.showDownloadButtons = payload.showDownloadButtons !== false; // Default to true if undefined
    this.maxHeight = payload.maxHeight;
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

  // /**
  //  * Downloads the SVG file.
  //  * TODO: This method is now redundant if ImageViewer handles it. Kept for reference or if direct call needed.
  //  */
  // downloadSVG() {
  //   const fileInfo = new FileInfo({
  //     name: `${this.filenameBaseToUse}.svg`,
  //     contents: this.svgContents,
  //   });
  //   fsApi.saveSvg(fileInfo);
  // }

  // /**
  //  * Downloads the PNG file.
  //  * TODO: This method is now redundant if ImageViewer handles it. Kept for reference or if direct call needed.
  //  */
  // async downloadPNG() {
  //   const svgElement = (this.$refs.imageViewerComponent as any)?.$refs.svgElementRef as HTMLElement;
  //   if (!svgElement) return;
  //   const svg = svgElement.querySelector("svg");
  //   if (!svg) return;

  //   const svgData = new XMLSerializer().serializeToString(svg);
  //   const img = new Image();
  //   img.onload = () => {
  //     const targetWidth = 1024; 
  //     const originalWidth = img.width;
  //     const originalHeight = img.height;
  //     const aspectRatio = originalHeight / originalWidth;
  //     const targetHeight = Math.round(targetWidth * aspectRatio);

  //     // Create canvas with new dimensions
  //     const canvas = document.createElement("canvas");
  //     canvas.width = targetWidth;
  //     canvas.height = targetHeight;
  //     const ctx = canvas.getContext("2d");
  //     if (!ctx) return;
  //     ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  //     // Convert canvas to Blob and then to data URI
  //     canvas.toBlob((blob) => {
  //       if (!blob) return;
  //       const reader = new FileReader();
  //       reader.onloadend = () => {
  //         const dataUri = reader.result as string; 
  //         fsApi.savePngUri(`${this.filenameBaseToUse}.png`, dataUri); 
  //       };
  //       reader.readAsDataURL(blob); 
  //     }, "image/png");
  //   };
  //   img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
  // }

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
  width: 100%;
  /* Ensures container scales with parent */
  height: auto;
  /* Adapts height to content */
  display: flex;
  justify-content: center;
  //   align-items: center;
}

.svg-wrapper {
  width: 100%;
  height: auto;
  /* Allows the height to scale proportionally */
}

.svg-wrapper svg {
  display: block;
  width: 100%;
  /* Fills the container width */
  height: auto;
  /* Maintains aspect ratio */
}
</style>
