<template>
  <div>
    <input type="text" v-model="fileName" />
    <input type="file" @change="onFileChange" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Vue } from "vue-class-component";

export default class FileUpload extends Vue {
  fileName = "main.py";
  onFileChange(e: any) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = (readerEvent) => {
      /* eslint-disable-next-line */
      // @ts-ignore
      const content = readerEvent.target.result;
      try {
        /* eslint-disable-next-line */
        // @ts-ignore
        window.pyodide.FS.createDataFile(
          "/",
          this.fileName,
          content,
          true,
          true,
          true
        );
        this.$emit("done", this.fileName);
      } catch (e) {
        console.log(e);
      }
    };
  }
}
</script>
