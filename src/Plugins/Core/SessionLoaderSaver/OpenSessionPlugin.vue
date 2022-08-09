<template>
  <Popup
    title="Load a Session"
    v-model="open"
    cancelBtnTxt="Cancel"
    actionBtnTxt="Load"
    @onAction="onAction"
    :actionBtnEnabled="filesToLoad.length > 0"
  >
    <FormFile
      ref="formFile"
      :multiple="false"
      @onFilesLoaded="onFilesLoaded"
      accept=".biotite"
      :isZip="true"
    />
  </Popup>
</template>

<script lang="ts">
import { PluginParent } from "@/Plugins/PluginParent";
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import FormFile from "@/UI/Forms/FormFile.vue";
import { IFileInfo } from "../../../FileSystem/Interfaces";
import { jsonToState } from "@/Store/LoadAndSaveStore";

@Options({
  components: {
    Popup,
    FormFile,
  },
})
export default class OpenSessionPlugin extends PluginParent {
  menuPath = "File/[1] Session/[0] Open";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [{
    name: "Jacob D. Durrant",
    url: "http://durrantlab.com/",
  }];
  filesToLoad: IFileInfo[] = [];
  pluginId = "loadsession";

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
    let state = jsonToState(parameters.contents);
    this.$store.replaceState(state);
  }
}
</script>

<style scoped lang="scss">
.inverse-indent {
  text-indent: -1em;
  padding-left: 1em;
}
</style>
