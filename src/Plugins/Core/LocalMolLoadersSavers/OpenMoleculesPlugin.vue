<template>
    <PluginComponent
        :userArgs="userArgs"
        title="Open Molecule Files"
        v-model="open"
        cancelBtnTxt="Cancel"
        actionBtnTxt="Open"
        :pluginId="pluginId"
        @onPopupDone="onPopupDone"
        :isActionBtnEnabled="filesToLoad.length > 0"
    >
        <FormFile
            ref="formFile"
            :multiple="true"
            @onFilesLoaded="onFilesLoaded"
            :accept="accept"
            id="formFile-openmolecules-item"
        />
        <!-- :isZip="true" -->
    </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import FormFile from "@/UI/Forms/FormFile.vue";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import {
    PluginParentClass,
    RunJobReturn,
} from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest, TestWaitUntilRegex } from "@/Testing/ParentPluginTestFuncs";
import { fileTypesAccepts } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMoleculeFiles";
import { filesToFileInfos } from "@/FileSystem/Utils";
import * as api from "@/Api";
import { dynamicImports } from "@/Core/DynamicImports";
import { FileInfo } from "@/FileSystem/FileInfo";

/**
 * OpenMoleculesPlugin
 */
@Options({
    components: {
        PluginComponent,
        FormFile,
    },
})
export default class OpenMoleculesPlugin extends PluginParentClass {
    menuPath = "[3] File/[1] Project/[0] Open...";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Jacob D. Durrant",
            url: "http://durrantlab.com/",
        },
    ];
    filesToLoad: FileInfo[] = [];
    pluginId = "openmolecules";

    userArgs: FormElement[] = [];
    alwaysEnabled = true;
    accept = fileTypesAccepts;
    hotkey = "o";

    /**
     * Runs when the files are loaded.
     *
     * @param {FileInfo[]} files  The files that were loaded.
     */
    onFilesLoaded(files: FileInfo[]) {
        this.filesToLoad = files;
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    onPopupDone() {
        this.closePopup();
        if (this.filesToLoad.length > 0) {
            this.submitJobs(this.filesToLoad);
        }
    }

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open).
     *
     * @returns {boolean | Promise<boolean>}  Whether to open the popup.
     */
    onBeforePopupOpen(): boolean | Promise<boolean> {
        // Good chance you'll need open babel, so start loading now.
        dynamicImports.openbabeljs.module;

        // Below is hackish...
        (this.$refs.formFile as FormFile).clearFile();

        if (this.payload !== undefined) {
            let fileList = this.payload as File[];
            this.payload = undefined;

            return filesToFileInfos(
                fileList,
                false,
                this.accept.split(",").map((a) => a.toUpperCase().substring(1))
            )
                .then((fileInfos: (FileInfo | string)[]) => {
                    const errorMsgs = fileInfos.filter(
                        (a) => typeof a === "string"
                    );

                    if (errorMsgs.length > 0) {
                        api.messages.popupError(
                            "<p>" + errorMsgs.join("</p><p>") + "</p>"
                        );
                    }

                    const toLoad = fileInfos.filter(
                        (a) => typeof a !== "string"
                    ) as FileInfo[];

                    this.filesToLoad = toLoad;
                    this.onPopupDone();
                    return false;
                })
                .catch((err) => {
                    throw err;
                });
        }
        return true;
        // this.windowClosing = this.payload !== undefined;
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @param {FileInfo} fileInfo  Information about the molecules to save.
     * @returns {Promise<undefined>}  A promise that resolves when the job is
     *     done.
     */
    runJobInBrowser(fileInfo: FileInfo): RunJobReturn {
        // It's not a biotite file (e.g., a PDB file).
        return fileInfo;
    }

    /**
     * Gets the selenium test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    getTests(): ITest[] {
        const filesToTest = [
            ["4WP4.pdb", 1],
            ["4WP4.pdb.zip", 1],
            ["4WP4.pdbqt", 1],
            ["4WP4.pqr", 1],
            ["4WP4.xyz", 1],
            ["ligs.can", 1], // TODO: Should be 3 when open babel fixed
            ["ligs.cif", 1], // TODO: Should be 3 when open babel fixed
            ["ligs.mol2", 3],
            ["ligs.pdb", 3],
            ["ligs.pdbqt", 1], // TODO: Should be 3 when open babel fixed
            ["ligs.sdf", 3],
            ["ligs.smi", 1], // TODO: Should be 3 when open babel fixed
            ["two_files.zip", 4], // TODO: Should be 6 when open babel fixed
            ["test.biotite", 1],
            ["ligs.smi.zip", 1], // TODO: Should be 3 when open babel fixed
            ["four_mols.zip", 2], // TODO: Should be 4 when open babel fixed
        ];

        return filesToTest.map((fileToTest) => {
            const name = fileToTest[0];
            const count = (fileToTest[1] as number) - 1;
            return {
                pluginOpen: [
                    this.testSetUserArg(
                        "formFile",
                        "file://./src/Testing/mols/" + name
                    ),
                ],
                afterPluginCloses: [
                    new TestWaitUntilRegex("#styles", "Atoms").cmd,
                    new TestWaitUntilRegex(
                        "#navigator",
                        "data.idx.." + count.toString() + "."
                    ).cmd,
                    new TestWaitUntilRegex(
                        "#log",
                        'Job "openmolecules:.+?" ended'
                    ).cmd,
                ],
            };
        });
    }
}
</script>

<style scoped lang="scss">
.inverse-indent {
    text-indent: -1em;
    padding-left: 1em;
}
</style>
