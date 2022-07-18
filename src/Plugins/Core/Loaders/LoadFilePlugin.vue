<template>
  <Popup
    title="Load a File"
    v-model="open"
    cancelBtnTxt="Cancel"
    actionBtnTxt="Load"
    @onAction="onAction"
    :actionBtnEnabled="filesToLoad.length > 0"
  >
    <!-- <p>Moo</p> -->
    <FormFile
      @onFilesLoaded="onFilesLoaded"
      :accept="accept"
    />
  </Popup>
</template>

<script lang="ts">
import { PluginParent } from "@/Plugins/PluginParent";
import Popup from "@/UI/Layout/Popup.vue";
import { Options } from "vue-class-component";
import { ICredit } from "../../PluginInterfaces";
import FormFile, { IFileInfo } from "@/UI/Forms/FormFile.vue";
import { fileTypesAccepts } from "./LoadFiles";

@Options({
  components: {
    Popup,
    FormFile,
  },
})
export default class LoadFilePlugin extends PluginParent {
  menuPath = "File/Load/From File";
  credits: ICredit[] = [];
  accept = fileTypesAccepts;
  filesToLoad: IFileInfo[] = [];
  pluginId = "loadfile";

  open = false;

  onFilesLoaded(files: IFileInfo[]): void {
    this.filesToLoad = files;
  }

  onAction(): void {
    this.open = false;
    this.submitJobs(this.filesToLoad);
  }

  start(): void {
    this.open = true;
  }

  runJob(parameters: any) {
    console.log(parameters);
    debugger;
  }
}
</script>

<style scoped lang="scss">
.inverse-indent {
  text-indent: -1em;
  padding-left: 1em;
}
</style>
