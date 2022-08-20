<template>
  <Popup
    title="Load a File"
    v-model="open"
    cancelBtnTxt="Cancel"
    actionBtnTxt="Load"
    @onDone="onPopupDone"
    :actionBtnEnabled="filesToLoad.length > 0"
  >
    <FormFile ref="formFile" @onFilesLoaded="onFilesLoaded" :accept="accept" />
  </Popup>
</template>

<script lang="ts">
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { Options } from "vue-class-component";
import FormFile from "@/UI/Forms/FormFile.vue";
import { IContributorCredit, ISoftwareCredit } from "@/Plugins/PluginInterfaces";
import { fileTypesAccepts, loadMoleculeFile } from "@/FileSystem/LoadMoleculeFiles";
import { IFileInfo } from "@/FileSystem/Interfaces";
import { PopupPluginParent } from "@/Plugins/PopupPluginParent";

@Options({
  components: {
    Popup,
    FormFile,
  },
})
export default class LoadFilePlugin extends PopupPluginParent {
  menuPath = "[4] File/Molecules/Import/[0] Local File";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [{
    name: "Jacob D. Durrant",
    url: "http://durrantlab.com/",
  }];
  accept = fileTypesAccepts;
  filesToLoad: IFileInfo[] = [];
  pluginId = "loadfile";

  intro = "";  // Not used.

  onFilesLoaded(files: IFileInfo[]): void {
    this.filesToLoad = files;
  }

  onPopupDone(): void {
    this.closePopup();
    this.submitJobs(this.filesToLoad);
  }

  onPopupOpen(): void {
    // Below is hackish...
    (this.$refs.formFile as FormFile).clearFile();
  }

  runJob(parameters: IFileInfo) {
    loadMoleculeFile(parameters);
  }
}
</script>

<style scoped lang="scss">
.inverse-indent {
  text-indent: -1em;
  padding-left: 1em;
}
</style>
