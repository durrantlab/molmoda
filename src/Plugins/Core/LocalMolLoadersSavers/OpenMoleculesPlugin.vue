<template>
    <PluginComponent
        :infoPayload="infoPayload"
        v-model="open"
        cancelBtnTxt="Cancel"
        actionBtnTxt="Open"
        @onPopupDone="onPopupDone"
        :isActionBtnEnabled="filesToLoad.length > 0"
        @onUserArgChanged="onUserArgChanged"
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
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { fileTypesAccepts } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMoleculeFiles";
import { filesToFileInfos } from "@/FileSystem/Utils";
import * as api from "@/Api";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TestCmdList } from "@/Testing/TestCmdList";
import { dynamicImports } from "@/Core/DynamicImports";
import { delayForPopupOpenClose } from "@/Core/AppInfo";

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
    title = "Open Molecule Files";
    softwareCredits: ISoftwareCredit[] = [dynamicImports.obabelwasm.credit];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    filesToLoad: FileInfo[] = [];
    pluginId = "openmolecules";
    intro = "Open (load) molecule file(s).";

    userArgDefaults: UserArg[] = [];
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
     */
    onBeforePopupOpen() {
        // Below is hackish...
        setTimeout(() => {
            // Give the component time to render
            const formFile = (this.$refs.formFile as FormFile);
            if (formFile) {
                formFile.clearFile();
            }
        }, delayForPopupOpenClose);

        if (this.payload !== undefined) {
            let fileList = this.payload as File[];
            this.payload = undefined;

            filesToFileInfos(
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
                    return;
                })
                .catch((err) => {
                    throw err;
                });
        }
        // this.windowClosing = this.payload !== undefined;
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @param {FileInfo} fileInfo  Information about the molecules to save.
     * @returns {Promise<undefined>}  A promise that resolves when the job is
     *     done. TODO: These are wrong throughout.
     */
    runJobInBrowser(fileInfo: FileInfo): RunJobReturn {
        // It's not a biotite file (e.g., a PDB file). NOTE: When loading a
        // multi-frame file, this fileInfo contains all frames (not yet
        // separated).
        return this.addFileInfoToViewer(fileInfo);
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    getTests(): ITest[] {
        const filesToTest = [
            // File, title-clicks,
            // ["two_files.zip", ["ligs"ompounds", "A"], "UNL:1"],
            ["four_mols.zip", "ligs:3"],
            // ["ligs.smi.zip", "ligs.smi:3"],
            ["ligs.can", "ligs:3"],
            ["test.biotite", "ATP:501"],

            // NOTE: OpenBabel parser a bit broken here. Only keeps first frame.
            ["ligs.cif", "UNL:1"],

            ["ligs.mol2", "ligs:3"],
            ["ligs.pdb", "UN3:1"],
            ["ligs.pdbqt", "UN3:1"],
            ["ligs.sdf", "ligs:3"],
            ["ligs.smi", "ligs:3"],
            ["4WP4.pdb", "TOU:101"],
            ["4WP4.pdb.zip", "TOU:101"],
            ["4WP4.pdbqt", "A"],
            ["4WP4.pqr", "TOU:101"],
            ["4WP4.xyz", "4WP4:1"],
        ];

        return filesToTest.map((fileToTest) => {
            const name = fileToTest[0];
            // const titles = fileToTest[1] as string[];
            // const count = (fileToTest[2] as number) - 1;
            const substrng = fileToTest[1] as string;
            return {
                pluginOpen: new TestCmdList().setUserArg(
                    "formFile",
                    "file://./src/Testing/mols/" + name,
                    this.pluginId
                ),
                afterPluginCloses: new TestCmdList()
                    .waitUntilRegex("#styles", "Atoms")
                    // .expandMoleculesTree(titles)
                    .waitUntilRegex("#navigator", substrng)
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
