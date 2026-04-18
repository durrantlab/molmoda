<template>
    <PluginComponent :infoPayload="infoPayload" v-model="open" cancelBtnTxt="Cancel" actionBtnTxt="Open"
        @onPopupDone="onPopupDone" :isActionBtnEnabled="filesToLoad.length > 0" @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged">
        <FormFile ref="formFile" :multiple="true" @onFilesLoaded="onFilesLoaded" :accept="accept"
            id="formFile-openmolecules-item" />
        <!-- :isZip="true" -->
    </PluginComponent>
</template>

<script lang="ts">
import { Component } from "vue-facing-decorator";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import FormFile from "@/UI/Forms/FormFile.vue";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    IUserArgCheckbox,
    UserArg,
    UserArgType,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { fileTypesAccepts } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMoleculeFiles";
import { filesToFileInfos } from "@/FileSystem/FileUtils";
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
import { getFileType } from "@/FileSystem/FileUtils2";
import { getFormatInfoGivenType } from "@/FileSystem/LoadSaveMolModels/Types/MolFormats";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { makeEasyParser, makeEasyParserAsync } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser";
import { deferVisualization } from "@/Core/Utils/CoalescedTask";
import { getFileNameParts } from "@/FileSystem/FilenameManipulation";

/**
 * File extensions whose loaders ignore the hideOnLoad parameter because the
 * file format carries its own embedded visibility state. See
 * parseAndLoadMoleculeFile: the MolModaFormat branch returns before the
 * hideOnLoad block runs, so checking the box has no effect for these files.
 */
const VISIBILITY_SELF_DEFINED_EXTS = ["molmoda", "biotite"];


/**
 * Describes a single file-based test case for the OpenMoleculesPlugin.
 *
 * Making each case an explicit object (rather than a positional tuple with
 * an implicit parity rule) keeps the test's intent local to its entry: you
 * can see at a glance which files are loaded hidden and which are loaded
 * visibly, and reordering the array no longer silently flips expectations.
 */
interface IFileTestCase {
    /** Filename under src/Testing/mols/ to upload. */
    file: string;
    /**
     * Substring expected to appear in the navigator after the file loads.
     * For visible loads this is typically a residue/atom label; for hidden
     * loads it is the eye-slash icon marker.
     */
    navSubstring: string;
    /**
     * When true, the test clicks the hideOnLoad checkbox before submitting,
     * and asserts the styles panel reports no visible molecules. Defaults
     * to false (molecule loads visibly). Should not be set on .molmoda
     * files, since those carry their own embedded visibility state and
     * the checkbox has no effect on them.
     */
    hideOnLoad?: boolean;
}

/**
 * OpenMoleculesPlugin
 */
@Component({
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
    details = "This plugin allows users to import molecular structure files from their local computers.";
    tags = [Tag.All];

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

    accept = fileTypesAccepts;
    hotkey = "o";
    skipLongRunningJobMsg = true;

    /**
     * Runs when the files are loaded.
     * @param {FileInfo[]} files  The files that were loaded.
     */
    onFilesLoaded(files: FileInfo[]) {
        this.filesToLoad = files;
        this._updateHideOnLoadAvailability(files);
    }

    /**
     * Enables or disables the hideOnLoad checkbox based on the selected
     * files. Formats whose loaders ignore hideOnLoad (currently .molmoda and
     * .biotite, both handled by parseUsingMolModa) cause the checkbox to be
     * disabled and reset to false, so the UI state matches the effective
     * behavior rather than silently ignoring a checked box.
     *
     * @param {FileInfo[]} files  The currently selected files.
     */
    private _updateHideOnLoadAvailability(files: FileInfo[]) {
        const hasSelfDefinedVisibility = files.some((f) => {
            const ext = getFileNameParts(f.name).ext.toLowerCase();
            return VISIBILITY_SELF_DEFINED_EXTS.indexOf(ext) !== -1;
        });
        // Locate the hideOnLoad arg in the reactive userArgs array and
        // toggle its enabled flag. Mutating userArgs (rather than
        // userArgDefaults) is what keeps the change reactive; defaults
        // are a template only.
        const hideArg = this.userArgs.find((a) => a.id === "hideOnLoad") as
            | IUserArgCheckbox
            | undefined;
        if (!hideArg) {
            return;
        }
        if (hasSelfDefinedVisibility) {
            hideArg.enabled = false;
            hideArg.val = false;
        } else {
            hideArg.enabled = true;
        }
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    async onPopupDone() {
        this.closePopup();

        if (this.filesToLoad.length > 0) {
            await this.submitJobs(
                this.filesToLoad,
                1,
                undefined,
                true  // firstJobSeparately: render first molecule immediately
            );
        }
    }

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open).
     * @param {any} payload  The payload passed to the plugin.
     * @returns {Promise<boolean | void>}  If false, the popup will not open.
     */
    async onBeforePopupOpen(payload: any): Promise<boolean | void> {
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
            const fileInfos = await filesToFileInfos(
                fileList,
                false,
                this.accept.split(",").map((a) => a.toUpperCase().substring(1))
            );
            if (fileInfos === undefined) return;

            const errorMsgs = fileInfos.filter((a) => typeof a === "string");

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

            return false; // To prevent popup from opening.
        }
        // this.windowClosing = this.payload !== undefined;
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     * @param {FileInfo} fileInfo  Information about the molecules to save.
     * @returns {Promise<void>}  A promise that resolves when the job is
     *     done. TODO: These are wrong throughout.
     */
    async runJobInBrowser(fileInfo: FileInfo): Promise<void> {
        // It's not a molmoda file (e.g., a PDB file). NOTE: When loading a
        // multi-frame file, this fileInfo contains all frames (not yet
        // separated).

        const gen3DParams = {
            whichMols: WhichMolsGen3D.OnlyIfLacks3D,
            level: this.getUserArg("gen3D"),
        } as IGen3DOptions;

        // MOL2 and SDF files can be both 2D and 3D.
        const typ = getFileType(fileInfo);
        if (typ !== undefined) {
            const frmt = getFormatInfoGivenType(typ);
            // If a format is not explicitly 2D (like SMILES) but this particular
            // file instance appears to be flat (e.g., a 2D SDF), we should
            // force 3D coordinate generation.
            if (frmt && !frmt.lacks3D) {
                try {
                    const parser = await makeEasyParserAsync(fileInfo);
                    if (parser.isFlat()) {
                        gen3DParams.whichMols = WhichMolsGen3D.All;
                    }
                } catch (error) {
                    console.warn(
                        `Could not parse ${fileInfo.name} to check if flat, proceeding with default 3D generation settings.`,
                        error
                    );
                }
            }
        }

        // Note that below not only adds to viewer, but performs necessary
        // files conversions, generates 3D geometry, etc.
        return this.addFileInfoToViewer(
            {
                fileInfo,
                desalt: this.getUserArg("desalt"),
                gen3D: gen3DParams,
                defaultTitle: "",
                tag: this.pluginId,
            },
            this.getUserArg("hideOnLoad")
        );
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    async getTests(): Promise<ITest[]> {
        // Order matters: pluginTestIndex (the CLI sub-index) keys into this
        // array, so reordering will change which test a given index runs.
        const filesToTest: IFileTestCase[] = [
            { file: "four_mols.zip", navSubstring: "title-element" },
            { file: "ligs.can", navSubstring: ":ligs" },
            { file: "test_old_format.molmoda", navSubstring: "ATP:501" },
            // .molmoda and .biotite files are parsed through parseUsingMolModa,
            // which returns before parseAndLoadMoleculeFile reaches the
            // hideOnLoad branch. Both formats carry their own embedded
            // visibility state, so the hideOnLoad checkbox has no effect.
            { file: "test_old_format.biotite", navSubstring: "ATP:501" },
            { file: "test_new_format.molmoda", navSubstring: "ATP:501" },
            // NOTE: OpenBabel parser a bit broken here. Only keeps first frame.
            { file: "ligs.cif", navSubstring: "UNL:1", hideOnLoad: true },
            { file: "ligs.mol2", navSubstring: "frame3" },
            { file: "ligs.pdb", navSubstring: "UN3:1", hideOnLoad: true },
            { file: "ligs.pdbqt", navSubstring: "UN3:1" },
            { file: "ligs.sdf", navSubstring: ":ligs", hideOnLoad: true },
            { file: "ligs.smi", navSubstring: ":ligs" },
            { file: "4WP4.pdb", navSubstring: "TOU:101", hideOnLoad: true },
            { file: "4WP4.pdb.zip", navSubstring: "TOU:101" },
            { file: "4WP4.pdbqt", navSubstring: "A", hideOnLoad: true },
            { file: "4WP4.pqr", navSubstring: "TOU:101" },
            { file: "4WP4.xyz", navSubstring: "4WP4", hideOnLoad: true },
            { file: "flat.mol2", navSubstring: "flat" },
        ];
        const tests: ITest[] = filesToTest.map((testCase) => {
            const pluginOpenCmdList = new TestCmdList().setUserArg(
                "formFile",
                "file://./src/Testing/mols/" + testCase.file,
                this.pluginId
            );
            let navSubstrng = testCase.navSubstring;
            let stylesSubstrng = "Atoms";
            if (testCase.hideOnLoad) {
                pluginOpenCmdList.click("#hideOnLoad-openmolecules-item");
                // When hidden, the navigator shows the eye-slash icon
                // instead of the molecule's residue label, and the styles
                // panel reports no visible molecules.
                navSubstrng = "eye-slash";
                stylesSubstrng = "No molecules are currently visible.";
            }
            return {
                pluginOpen: () => pluginOpenCmdList,
                afterPluginCloses: () =>
                    new TestCmdList()
                        .waitUntilRegex("#styles", stylesSubstrng)
                        .openPlugin("expandall")
                        // .expandMoleculesTree(titles)
                        .waitUntilRegex("#navigator", navSubstrng),
            };
        });
        // Final test to verify error catching.
        tests.push({
            pluginOpen: () => new TestCmdList().setUserArg(
                "formFile",
                "file://./src/Testing/mols/nonsense_format.can",
                this.pluginId
            ),
            afterPluginCloses: () => new TestCmdList().waitUntilRegex(
                "#modal-simplemsg",
                "Could not process"
            ),
            // .expandMoleculesTree(titles)
            // .waitUntilRegex("#navigator", substrng),
        });

        // Tour-only test: demonstrates the plugin UI without requiring an
        // actual file upload, so afterPluginCloses wait conditions that depend
        // on loaded molecules are omitted. JACOB: Can't for the life of me
        // remember why I ever included this test...
        // tests.push({
        //     name: "tour",
        //     pluginOpen: () => new TestCmdList(),
        // });

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
