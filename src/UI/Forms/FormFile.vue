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
            @change="onFileChanged"
            :accept="accept"
        />
        <FormElementDescription>
            {{ acceptableFileTypesMsg }}.
            <span v-if="errorMsg !== ''" class="text-danger"
                >{{ errorMsg }}.</span
            >
        </FormElementDescription>
    </div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { randomID } from "@/Core/Utils";
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import FormElementDescription from "@/UI/Forms/FormElementDescription.vue";
import { filesToFileInfos } from "@/FileSystem/Utils";
import { FileInfo } from "@/FileSystem/FileInfo";

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

    /**
     * Gets text describing the acceptable file types.
     *
     * @returns {string} Text describing the acceptable file types.
     */
    get acceptableFileTypesMsg(): string {
        return (
            "Acceptable file types: " +
            this.accept.toUpperCase().replace(/,/g, ", ")
        );
    }

    /**
     * Gets all the acceptable file types.
     *
     * @returns {string[]} All the acceptable file types.
     */
    get allAcceptableFileTypes(): string[] {
        return this.accept.split(",").map((a) => a.toUpperCase().substring(1));
    }

    /**
     * Runs when the file changes.
     */
    onFileChanged(/* _e: Event */) {
        let input = this.$refs.fileinput as HTMLInputElement;
        let files = input.files;

        if (files === null || files.length == 0) {
            return;
        }

        // Make it as an array
        let fileList = Array.from(files);

        filesToFileInfos(fileList, this.isZip, this.allAcceptableFileTypes)
            .then((filesLoaded: (FileInfo | string)[]) => {
                const errorMsgs = filesLoaded.filter(
                    (a) => typeof a === "string"
                );
                const toLoad = filesLoaded.filter(
                    (a) => typeof a !== "string"
                ) as FileInfo[];

                this.$emit("onFilesLoaded", toLoad);

                if (errorMsgs.length > 0) {
                    this.clearFile();
                    this.errorMsg = errorMsgs.join(", ");
                } else {
                    this.errorMsg = "";
                }
                // this.clearFile();
                return;
            })
            .catch((err: any) => {
                this.clearFile();
                this.errorMsg = err;
                // throw err;
            });
    }

    /**
     * Clears the file input.
     */
    clearFile() {
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
