<template>
    <PluginComponent
        :userArgs="userArgs"
        :title="title"
        v-model="open"
        cancelBtnTxt="Cancel"
        actionBtnTxt="Open"
        :pluginId="pluginId"
        @onPopupDone="onPopupDone"
        :isActionBtnEnabled="filesToLoad.length > 0"
        :intro="intro"
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

    userArgDefaults: UserArg[] = [
        // {
        //     id: "group",
        //     // type: UserArgType.Group,
        //     label: "Advanced",
        //     val: [
        //         {
        //             id: "gen3D",
        //             label: "Calculate 3D atomic coordinates (compounds)",
        //             val: false,
        //             description: "Compounds are 2D-formatted (e.g., 2D SDF)? Calculate 3D atomic coordinates."
        //         } as IUserArgCheckbox,
        //         {
        //             id: "separateFrames",
        //             label: "Load multiple molecules separately",
        //             val: false,
        //             description: "File contains multiple molecules/frames? Load each as a separate molecule."
        //         } as IUserArgCheckbox,
        //     ],
        //     startOpened: false,
        // } as IUserArgGroup,
    ];
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
            // ["two_files.zip", ["ligs", "Compounds", "A"], "UNL:1"],
            ["four_mols.zip", ["ligs", "Compounds", "A"], "ligs.smi:3"],
            // ["ligs.smi.zip", ["ligs", "Compounds", "A"], "ligs.smi:3"],
            ["ligs.can", ["ligs", "Compounds", "A"], "ligs.can:3"],
            ["test.biotite", ["1XDN", "Compounds", "A"], "ATP:501"],

            // NOTE: OpenBabel parser a bit broken here. Only keeps first frame.
            ["ligs.cif", ["ligs", "Compounds", "X"], "UNL:1"],

            ["ligs.mol2", ["ligs", "Compounds", "A"], "ligs.mol2:3"],
            ["ligs.pdb", ["ligs", "Compounds", "A"], "UN3:1"],
            ["ligs.pdbqt", ["ligs", "Compounds", "A"], "UN3:1"],
            ["ligs.sdf", ["ligs", "Compounds", "A"], "ligs.sdf:3"],
            ["ligs.smi", ["ligs", "Compounds", "A"], "ligs.smi:3"],
            ["4WP4.pdb", ["4WP4", "Compounds", "A"], "TOU:101"],
            ["4WP4.pdb.zip", ["4WP4", "Compounds", "A"], "TOU:101"],
            ["4WP4.pdbqt", ["4WP4", "Protein"], "A"],
            ["4WP4.pqr", ["4WP4", "Compounds", "A"], "TOU:101"],
            ["4WP4.xyz", ["4WP4", "Compounds", "A"], "4WP4.xyz:1"],
        ];

        return filesToTest.map((fileToTest) => {
            const name = fileToTest[0];
            const titles = fileToTest[1] as string[];
            // const count = (fileToTest[2] as number) - 1;
            const substrng = fileToTest[2] as string;
            return {
                pluginOpen: new TestCmdList().setUserArg(
                    "formFile",
                    "file://./src/Testing/mols/" + name,
                    this.pluginId
                ).cmds,
                afterPluginCloses: new TestCmdList()
                    .waitUntilRegex("#styles", "Atoms")
                    .expandMoleculesTree(titles)
                    .waitUntilRegex("#navigator", substrng)
                    .wait(5).cmds,
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
