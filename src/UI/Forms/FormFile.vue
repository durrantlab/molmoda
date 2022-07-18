<template>
  <div class="input-group custom-file-button">
    <label class="input-group-text" :for="id">
      Choose File<span v-if="multiple">(s)</span>
    </label>
    <input
      ref="fileinput"
      type="file"
      class="form-control"
      :id="id"
      :multiple="multiple"
      @change="fileChanged"
      :accept="accept"
    />
    <Alert type="light" style="padding: 0; margin: 0;">
      <small>{{ acceptableFileTypesMsg }}. </small>
      <small v-if="errorMsg !== ''" class="text-danger">{{ errorMsg }}.</small>
    </Alert>
  </div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { randomID } from "@/Core/Utils";
import {
  acceptableFileTypesMessage,
  allAcceptableFileTypes,
} from "@/Plugins/Core/Loaders/LoadFiles";
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import Alert from "@/UI/Layout/Alert.vue";

export interface IFileInfo {
  name: string;
  size: number;
  contents: string;
  type: string; // all caps, extension (e.g., "PDB")
}

@Options({
  components: {
    Alert,
  },
})
export default class FormFile extends Vue {
  @Prop({ default: randomID() }) id!: string;
  @Prop({ default: true }) multiple!: boolean;
  @Prop({}) accept!: string;

  acceptableFileTypesMsg = acceptableFileTypesMessage;
  errorMsg = "";

  fileToFileInfo(file: File): Promise<IFileInfo> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent) => {
        let fileReader = e.target as FileReader;
        let txt = fileReader.result as string;
        txt = txt.replace(/\r\n/g, "\n");

        // Type is file extension, uppercase.
        let filePrts = file.name.split(".");
        let type = filePrts.pop()?.toUpperCase() as string;

        // If extension is TXT, get next extension. Because Windows often
        // appends .txt to ends of files.
        if (type === "TXT") {
          type = filePrts.pop()?.toUpperCase() as string;
        }

        // If it's not an acceptable file type, abort effort.
        if (allAcceptableFileTypes.indexOf(type) === -1) {
          reject(`Cannot load files of type ${type}`);
        }

        resolve({
          name: file.name,
          size: file.size,
          contents: txt,
          type: type,
        } as IFileInfo);
      };
      reader.onerror = (e: any) => {
        reject(e);
      };
      reader.readAsText(file);
    });
  }

  fileChanged(e: Event) {
    let input = this.$refs.fileinput as HTMLInputElement;
    let files = input.files;

    if (files === null || files.length == 0) {
      return;
    }

    // Make it as an array
    let fileList = Array.from(files);

    const filePromises = fileList.map((file: File) => {
      return this.fileToFileInfo(file);
    });

    Promise.all(filePromises)
      .then((filesLoaded: IFileInfo[]) => {
        this.$emit("onFilesLoaded", filesLoaded);
        this.errorMsg = "";
        // this.clearFile();
      })
      .catch((err: any) => {
        this.clearFile();
        this.errorMsg = err;
      });
  }

  clearFile(): void {
    // @ts-ignore
    (this.$refs.fileinput as HTMLInputElement).value = null;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->

<style lang="scss" scoped>
// See https://stackoverflow.com/questions/65770908/how-to-change-choose-file-text-using-bootstrap-5

.custom-file-button {
  input[type="file"] {
    margin-left: -2px !important;

    &::-webkit-file-upload-button {
      display: none;
    }
    &::file-selector-button {
      display: none;
    }
  }

  &:hover {
    label {
      background-color: #dde0e3;
      cursor: pointer;
    }
  }
}
</style>
