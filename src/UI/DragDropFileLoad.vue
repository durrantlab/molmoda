<template>
  <div v-if="showDrag" class="dragging-dropping">
    <!-- <input
      type="file"
      id="fileElem"
      multiple
      :accept="accept"
      onchange="handleFiles(this.files)"
    /> -->
  </div>
</template>

<script lang="ts">
import { fileTypesAccepts } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMoleculeFiles";
import { Options, Vue } from "vue-class-component";
import * as api from "@/Api";

/**
 * FormCheckBox component
 */
@Options({
  components: {},
})
export default class DragDropFileLoad extends Vue {
  // @Prop({ required: true }) modelValue!: boolean;

  accept = fileTypesAccepts;
  showDrag = false;
  timeoutId: any;

  /**
   * Mounted function.
   */
  mounted() {
    // Inspired by
    // https://www.smashingmagazine.com/2018/01/drag-drop-file-uploader-vanilla-js/

    const dropArea = document.body;

    dropArea.addEventListener(
      "dragenter",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showDrag = true;
        clearInterval(this.timeoutId);
      },
      false
    );

    dropArea.addEventListener(
      "dragleave",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.timeoutId = setTimeout(() => {
          this.showDrag = false;
        }, 250);
      },
      false
    );

    dropArea.addEventListener(
      "dragover",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showDrag = true;
        clearInterval(this.timeoutId);
      },
      false
    );

    dropArea.addEventListener(
      "drop",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearInterval(this.timeoutId);
        this.showDrag = false;

        let dt = e.dataTransfer as DataTransfer;
        let files = dt.files;
        api.plugins.runPlugin("openmolecules", files);
      },
      false
    );
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
// .highlight {
//   // border-color: purple;
//   border: 5px dashed purple;
// }
.dragging-dropping {
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: black;
  z-index: 5000;
  opacity: 50%;
}
</style>



