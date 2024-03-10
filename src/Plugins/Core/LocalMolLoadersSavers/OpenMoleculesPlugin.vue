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
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    IUserArgCheckbox,
    IUserArgOption,
    IUserArgSelect,
    UserArg,
    UserArgType,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { fileTypesAccepts } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMoleculeFiles";
import { filesToFileInfos } from "@/FileSystem/Utils";
import * as api from "@/Api";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TestCmdList } from "@/Testing/TestCmdList";
import { dynamicImports } from "@/Core/DynamicImports";
import { delayForPopupOpenClose } from "@/Core/GlobalVars";
import { getDesaltUserArg } from "@/UI/Forms/FormFull/FormFullCommonEntries";
import {
    IGen3DOptions,
    WhichMolsGen3D,
    getGen3DUserArg,
} from "@/FileSystem/OpenBabel/OpenBabel";

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
    contributorCredits: IContributorCredit[] = [];
    filesToLoad: FileInfo[] = [];
    pluginId = "openmolecules";
    intro = "Open (load) molecule file(s).";

    userArgDefaults: UserArg[] = [
        getDesaltUserArg(),
        {
            id: "hideOnLoad",
            type: UserArgType.Checkbox,
            label: "Loaded molecules should be invisible",
            description:
                "If checked, molecules will be initially invisible. You will have to toggle visibility by hand. Useful if you plan to load many molecules at once.",
            val: false,
        } as IUserArgCheckbox,
        getGen3DUserArg(
            "Method for generating 3D coordinates",
            "If your file lacks 3D coordinates (e.g., SMILES), choose how to generate those coordinates. Otherwise, this parameter is ignored. Try different methods only if your imported molecules have incorrect geometries."
        ),
    ];
    alwaysEnabled = true;
    accept = fileTypesAccepts;
    hotkey = "o";
    skipLongRunningJobMsg = true;

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
     * @param {any} payload  The payload passed to the plugin.
     * @returns {boolean | void}  If false, the popup will not open.
     */
    onBeforePopupOpen(payload: any): boolean | void {
        // Below is hackish...
        setTimeout(() => {
            // Give the component time to render
            const formFile = this.$refs.formFile as FormFile;
            if (formFile) {
                formFile.clearFile();
            }
        }, delayForPopupOpenClose);

        if (payload !== undefined) {
            let fileList = payload as File[];
            // this.payload = undefined;
            filesToFileInfos(
                fileList,
                false,
                this.accept.split(",").map((a) => a.toUpperCase().substring(1))
            )
                .then((fileInfos: (FileInfo | string)[] | undefined) => {
                    if (fileInfos === undefined) return;

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
            return false; // To prevent popup from opening.
        }
        // this.windowClosing = this.payload !== undefined;
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @param {FileInfo} fileInfo  Information about the molecules to save.
     * @returns {Promise<void>}  A promise that resolves when the job is
     *     done. TODO: These are wrong throughout.
     */
    runJobInBrowser(fileInfo: FileInfo): Promise<void> {
        // It's not a molmoda file (e.g., a PDB file). NOTE: When loading a
        // multi-frame file, this fileInfo contains all frames (not yet
        // separated).

        const gen3DParams = {
            whichMols: WhichMolsGen3D.OnlyIfLacks3D,
            level: this.getUserArg("gen3D"),
        } as IGen3DOptions;

        // Note that below not only adds to viewer, but performs necessary
        // files conversions, generates 3D geometry, etc.
        return this.addFileInfoToViewer(
            fileInfo,
            this.getUserArg("hideOnLoad"),
            this.getUserArg("desalt"),
            gen3DParams,
            ""
        );
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    async getTests(): Promise<ITest[]> {
        const filesToTest = [
            // File, title-clicks,
            // ["two_files.zip", ["ligs"ompounds", "A"], "UNL:1"],
            ["four_mols.zip", ":ligs:"],
            // ["ligs.smi.zip", "ligs.smi:3"],
            ["ligs.can", ":ligs:"],
            ["test.molmoda", "ATP:501"],
            ["test.biotite", "ATP:501"],

            // NOTE: OpenBabel parser a bit broken here. Only keeps first frame.
            ["ligs.cif", "UNL:1"],

            ["ligs.mol2", ":frame3"],
            ["ligs.pdb", "UN3:1"],
            ["ligs.pdbqt", "UN3:1"],
            ["ligs.sdf", ":ligs:"],
            ["ligs.smi", ":ligs:"],
            ["4WP4.pdb", "TOU:101"],
            ["4WP4.pdb.zip", "TOU:101"],
            ["4WP4.pdbqt", "A"],
            ["4WP4.pqr", "TOU:101"],
            ["4WP4.xyz", "4WP4:1"],
        ];

        const tests = filesToTest.map((fileToTest, idx) => {
            const name = fileToTest[0];
            // const titles = fileToTest[1] as string[];
            // const count = (fileToTest[2] as number) - 1;
            const substrng = fileToTest[1] as string;
            let pluginOpen = new TestCmdList().setUserArg(
                "formFile",
                "file://./src/Testing/mols/" + name,
                this.pluginId
            );
            if (idx % 2 === 0) {
                pluginOpen = pluginOpen.click("#hideOnLoad-openmolecules-item");
            }
            return {
                pluginOpen: pluginOpen,
                afterPluginCloses: new TestCmdList()
                    .waitUntilRegex("#styles", "Atoms")
                    // .expandMoleculesTree(titles)
                    .waitUntilRegex("#navigator", substrng),
            };
        });

        // Final test to verify error catching.
        tests.push({
            pluginOpen: new TestCmdList().setUserArg(
                "formFile",
                "file://./src/Testing/mols/nonsense_format.can",
                this.pluginId
            ),
            afterPluginCloses: new TestCmdList().waitUntilRegex(
                "#modal-simplemsg",
                "File contained no valid"
            ),
            // .expandMoleculesTree(titles)
            // .waitUntilRegex("#navigator", substrng),
        });

        return tests;
    }
}
</script>

<style scoped lang="scss">
.inverse-indent {
    text-indent: -1em;
    padding-left: 1em;
}
</style>
