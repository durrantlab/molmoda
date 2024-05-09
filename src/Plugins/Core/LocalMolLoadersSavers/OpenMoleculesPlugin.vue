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
    UserArg,
    UserArgType,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
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
import {
    IFormatInfo,
    getFormatInfoGivenType,
} from "@/FileSystem/LoadSaveMolModels/Types/MolFormats";

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
     * Checks if the SDF or MOL2 file is flat.
     *
     * @param {IFormatInfo} frmt      The format information.
     * @param {FileInfo}    fileInfo  The file information.
     * @returns {boolean}  True if the file is flat, false otherwise.
     */
    isFlatSdfOrMol2(frmt: IFormatInfo, fileInfo: FileInfo): boolean {
        // It's an sdf or mol2 file (already checked).
        const lines = fileInfo.contents.split("\n");

        // Initialize arrays to store the x, y, and z coordinates
        const xCoords: number[] = [];
        const yCoords: number[] = [];
        const zCoords: number[] = [];

        if (frmt.primaryExt === "sdf") {
            // Loop through the lines where coordinates are expected
            for (let line of lines.slice(4)) {
                // Coordinates start from the 5th line in SDF format. Stop at
                // the end of the molecule specification
                if (line.trim() === "$$$$") break;

                // If no period is found, we're no longer in the coordinates
                // section
                if (!line.includes(".")) break;

                line = line.trim();
                while (line.includes("  ")) {
                    line = line.replace("  ", " ");
                }
                const parts = line.split(/\s+/);

                try {
                    // Append the x, y, and z coordinates to their respective arrays
                    xCoords.push(parseFloat(parts[0]));
                    yCoords.push(parseFloat(parts[1]));
                    zCoords.push(parseFloat(parts[2]));
                } catch (error) {
                    // If conversion to float fails or parts are not as
                    // expected, we're no longer in the coordinates section
                    break;
                }
            }
        } else if (frmt.primaryExt === "mol2") {
            let inAtomSection = false;

            // Loop through the lines to find the ATOM section
            for (let line of lines) {
                line = line.trim();

                // Check for the start of the ATOM section
                if (line === "@<TRIPOS>ATOM") {
                    inAtomSection = true;
                    continue;
                }

                // Check for the end of the ATOM section, which is the start of the BOND section
                if (line === "@<TRIPOS>BOND") break;

                // Process lines within the ATOM section
                if (inAtomSection) {
                    // Simplify spaces to ensure consistent splitting
                    while (line.includes("  ")) {
                        line = line.replace("  ", " ");
                    }

                    const parts = line.split(/\s+/);

                    try {
                        // Append the x, y, and z coordinates to their respective arrays
                        xCoords.push(parseFloat(parts[2])); // x-coordinate is the 3rd column in ATOM section
                        yCoords.push(parseFloat(parts[3])); // y-coordinate is the 4th column in ATOM section
                        zCoords.push(parseFloat(parts[4])); // z-coordinate is the 5th column in ATOM section
                    } catch (error) {
                        // If conversion to float fails or parts are not as expected, skip this line
                        continue;
                    }
                }
            }
        }

        // Check if all coordinates in any of the arrays are 0
        const allXZero = xCoords.every((x) => x === 0);
        const allYZero = yCoords.every((y) => y === 0);
        const allZZero = zCoords.every((z) => z === 0);

        return allXZero || allYZero || allZZero;
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

        // MOL2 and SDF files can be both 2D and 3D.
        const typ = getFileType(fileInfo);
        if (typ !== undefined) {
            const frmt = getFormatInfoGivenType(typ);
            // eslint-disable-next-line sonarjs/no-collapsible-if
            if (
                frmt !== undefined &&
                ["sdf", "mol2"].includes(frmt.primaryExt) &&
                this.isFlatSdfOrMol2(frmt, fileInfo)
            ) {
                gen3DParams.whichMols = WhichMolsGen3D.All;
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
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    async getTests(): Promise<ITest[]> {
        const filesToTest = [
            // File, title-clicks,
            // ["two_files.zip", ["ligs"ompounds", "A"], "UNL:1"],
            ["four_mols.zip", ":ligs"],
            // ["ligs.smi.zip", "ligs.smi:3"],
            ["ligs.can", ":ligs"],
            ["test_old_format.molmoda", "ATP:501"],
            ["test_old_format.biotite", "ATP:501"],
            ["test_new_format.molmoda", "ATP:501"],

            // NOTE: OpenBabel parser a bit broken here. Only keeps first frame.
            ["ligs.cif", "UNL:1"],

            ["ligs.mol2", "frame3"],
            ["ligs.pdb", "UN3:1"],
            ["ligs.pdbqt", "UN3:1"],
            ["ligs.sdf", ":ligs"],
            ["ligs.smi", ":ligs"],
            ["4WP4.pdb", "TOU:101"],
            ["4WP4.pdb.zip", "TOU:101"],
            ["4WP4.pdbqt", "A"],
            ["4WP4.pqr", "TOU:101"], //
            ["4WP4.xyz", "4WP4"], //
            ["flat.mol2", "flat"],
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
