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
    <FormElementDescription>
      {{ acceptableFileTypesMsg }}.
      <span v-if="errorMsg !== ''" class="text-danger">{{ errorMsg }}.</span>
    </FormElementDescription>
  </div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { randomID } from "@/Core/Utils";
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { IFileInfo } from "@/FileSystem/Interfaces";
import FormElementDescription from "@/UI/Forms/FormElementDescription.vue";
import * as api from "@/Api/";

/**
 * FormFile component
 */
@Options({
  components: {
    FormElementDescription,
  },
})
export default class FormFile extends Vue {
  @Prop({ default: randomID() }) id!: string;
  @Prop({ default: true }) multiple!: boolean;
  @Prop({}) accept!: string;
  @Prop({ default: false }) isZip!: boolean;

  errorMsg = "";

  get acceptableFileTypesMsg(): string {
    return (
      "Acceptable file types: " + this.accept.toUpperCase().replace(/,/g, ", ")
    );
  }

  get allAcceptableFileTypes(): string[] {
    return this.accept.split(",").map((a) => a.toUpperCase().substring(1));
  }

  getType(filename: string): string {
    // Type is file extension, uppercase.
    let filePrts = filename.split(".");
    let type = filePrts.pop()?.toUpperCase() as string;

    // If extension is TXT, get next extension. Because Windows often
    // appends .txt to ends of files.
    if (type === "TXT") {
      type = filePrts.pop()?.toUpperCase() as string;
    }

    return type;
  }

  fileToFileInfo(file: File): Promise<IFileInfo> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent) => {
        // Type is file extension, uppercase.
        const type = this.getType(file.name);

        // If it's not an acceptable file type, abort effort.
        if (this.allAcceptableFileTypes.indexOf(type) === -1) {
          reject(`Cannot load files of type ${type}`);
        }

        let fileReader = e.target as FileReader;
        let txt = fileReader.result as string;
        let txtPromise: Promise<string>;
        if (!this.isZip) {
          txtPromise = new Promise((resolve) => {
            txt = txt.replace(/\r\n/g, "\n");
            resolve(txt);
          });
        } else {
          // It's a zip file
          txtPromise = api.fs.uncompress(txt, "file.json");
        }

        txtPromise
          .then((txt) => {
            resolve({
              name: file.name,
              size: file.size,
              contents: txt,
              type: type,
            } as IFileInfo);
            return;
          })
          .catch((err: any) => {
            console.log(err);
          });
      };

      reader.onerror = (e: any) => {
        reject(e);
      };

      if (!this.isZip) {
        reader.readAsText(file);
      } else {
        // It's a zip file.
        reader.readAsBinaryString(file);
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fileChanged(_e: Event) {
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
        return;
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
