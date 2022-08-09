<template>
  <Popup
    title="Load a File"
    v-model="open"
    cancelBtnTxt="Cancel"
    actionBtnTxt="Load"
    @onAction="onAction"
    :actionBtnEnabled="filesToLoad.length > 0"
  >
    <FormFile ref="formFile" @onFilesLoaded="onFilesLoaded" :accept="accept" />
  </Popup>
</template>

<script lang="ts">
import { PluginParent } from "@/Plugins/PluginParent";
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { Options } from "vue-class-component";
import FormFile from "@/UI/Forms/FormFile.vue";
import { IContributorCredit, ISoftwareCredit } from "@/Plugins/PluginInterfaces";
import { fileTypesAccepts, loadMoleculeFile } from "@/FileSystem/LoadMoleculeFiles";
import { IFileInfo } from "@/FileSystem/Interfaces";

@Options({
  components: {
    Popup,
    FormFile,
  },
})
export default class LoadFilePlugin extends PluginParent {
  menuPath = "File/Molecules/Import/[0] Local File";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [{
    name: "Jacob D. Durrant",
    url: "http://durrantlab.com/",
  }];
  accept = fileTypesAccepts;
  filesToLoad: IFileInfo[] = [];
  pluginId = "loadfile";

  open = false;

  onFilesLoaded(files: IFileInfo[]): void {
    this.filesToLoad = files;
  }

  onAction(): void {
    this.open = false;
    this._submitJobs(this.filesToLoad);
  }

  start(): void {
    // Below is hackish...
    (this.$refs.formFile as FormFile).clearFile();

    this.open = true;
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
