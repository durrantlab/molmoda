<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        actionBtnTxt="Save"
        :intro="introToUse"
        @onPopupDone="onPopupDone"
        :prohibitCancel="appClosing"
        :hideIfDisabled="true"
        @onUserArgChanged="onUserArgChanged"
    >
    </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
import * as api from "@/Api";
import { checkAnyMolLoaded } from "../CheckUseAllowedUtils";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    UserArg,
    IUserArgCheckbox,
    IUserArgGroup,
    IUserArgSelect,
    IUserArgText,
    IUserArgOption,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import {
    getFormatDescriptions,
    getFormatInfoGivenType,
} from "@/FileSystem/LoadSaveMolModels/Types/MolFormats";
import { saveMolModa } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModa";
import {
    fileNameFilter,
    getFileNameParts,
    matchesFilename,
} from "@/FileSystem/FilenameManipulation";
import {
    compileMolModels,
    convertCompiledMolModelsToIFileInfos,
    saveMolFiles,
} from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModels";
import {
    ICmpdNonCmpdFileInfos,
    IMolsToConsider,
} from "@/FileSystem/LoadSaveMolModels/SaveMolModels/Types";
import { correctFilenameExt } from "@/FileSystem/FileUtils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TestCmdList } from "@/Testing/TestCmdList";
import { dynamicImports } from "@/Core/DynamicImports";
import { appName } from "@/Core/GlobalVars";
import { slugify } from "@/Core/Utils/StringUtils";
import { closeDownApp } from "@/Core/Utils/CloseAppUtils";

/**
 * SaveMoleculesPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class SaveMoleculesPlugin extends PluginParentClass {
    menuPath = "File/Project/[1] Save...";
    title = "Save Molecule Files";
    softwareCredits: ISoftwareCredit[] = [dynamicImports.obabelwasm.credit];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "savemolecules";

    intro = `Save molecules to the disk.`;
    details = `The ${appName} format (recommended) stores all molecules in one file for easy reloading. Other formats (e.g., PDB) enable compatibility with external programs.`;

    hotkey = "s";

    // If true, this plugin is being shown as part of the (terminal) app-closing
    // process.
    appClosing = false;

    userArgDefaults: UserArg[] = [
        {
            id: "filename",
            label: "",
            val: "",
            placeHolder: "Filename (e.g., my_project.molmoda)...",
            description: `The name of the molecule file to save. The file extension will be automatically appended.`,
            filterFunc: (filename: string): string => {
                return fileNameFilter(filename);
            },
            validateFunc: (filename: string): boolean => {
                return matchesFilename(filename);
            },
            delayBetweenChangesDetected: 0,
        } as IUserArgText,
        {
            id: "useMolModaFormat",
            label: "Save project in .molmoda format",
            val: true,
        } as IUserArgCheckbox,
        {
            id: "whichMolsGroup",
            label: "Molecules to Save",
            val: [
                {
                    id: "saveVisible",
                    label: "Visible molecules",
                    val: false,
                } as IUserArgCheckbox,
                {
                    id: "saveSelected",
                    label: "Selected molecules",
                    val: false,
                } as IUserArgCheckbox,
                {
                    id: "saveHiddenAndUnselected",
                    label: "Other molecules (hidden and unselected)",
                    val: true,
                } as IUserArgCheckbox,
            ] as UserArg[],
            startOpened: true,
            enabled: false,
        } as IUserArgGroup,
        {
            id: "separateCompounds",
            label: "Save each molecule to a separate file",
            val: true,
            enabled: false,
        } as IUserArgCheckbox,
        {
            label: "File format for all molecules, each entry saved to a single file",
            id: "oneMolFileFormat",
            val: "pdb",
            options: getFormatDescriptions(false).filter(
                (option) => option.val !== "molmoda"
            ),
            enabled: false,
        } as IUserArgSelect,
        {
            label: "File format for macromolecules, solvent, etc.",
            id: "nonCompoundFormat",
            val: "pdb",
            options: getFormatDescriptions(false),
            enabled: false,
        } as IUserArgSelect,
        {
            label: "File format for separate small-molecule compounds",
            id: "compoundFormat",
            val: "mol2",
            options: getFormatDescriptions(true)
                .filter(
                    // Prioritize formats with bonds
                    (option) => option.val !== "molmoda"
                )
                .concat(
                    getFormatDescriptions(false).filter(
                        // Add a few non-bonds formats too because they're popular
                        (option) =>
                            ["pdb", "pdbqtlig", "xyz"].indexOf(option.val) !==
                            -1
                    )
                ),
            enabled: false,
        } as IUserArgSelect,
    ];

    alwaysEnabled = true;
    lastFilename = "";

    /**
     * Determine which into text to use.
     *
     * @returns {string} The intro text to use.
     */
    get introToUse(): string {
        let i = "";

        if (this.appClosing) {
            i += "Be sure to save your work before closing!</p><p>";
        }

        i += this.intro;

        return i;
    }

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        return checkAnyMolLoaded();
    }

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open).
     *
     * @param {any} payload  The payload passed to the plugin.
     */
    async onBeforePopupOpen(payload: any) {
        this.appClosing = payload !== undefined;

        // Reset some form values
        this.setUserArg("useMolModaFormat", true);
        this.setUserArg("saveVisible", true);
        this.setUserArg("saveSelected", true);
        this.setUserArg("saveHiddenAndUnselected", false);
        this.setUserArg("separateCompounds", true);

        payload = undefined;
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    onPopupDone() {
        // No need to pass parameters here because they will be read directly
        // from this.userArgs.
        this.submitJobs();
    }

    /**
     * Reacts to the filename extension changing.
     */
    reactToExtChange() {
        // Now try to detect extension and open/close molmoda appropriately.
        const filename = this.getUserArg("filename");
        // const useMolModa = this.getUserArg("useMolModaFormat") as boolean;
        // let newUseMolModa = useMolModa;

        // const prts = getFileNameParts(this.getUserArg("filename"));
        // const ext = prts.ext.toLowerCase();

        // NOTE: not using getFileNameParts because I really do want the
        // terminal part. So .pdb.molmoda should be detected as .molmoda.
        const ext =
            filename.indexOf(".") === -1
                ? ""
                : filename.split(".").pop().toLowerCase();

        // if (ext !== "" && ext.length >= 3) {
        //     // There is an extension
        //     // newUseMolModa = ext.slice(0, 3) === "bio";
        //     this.setUserArg("useMolModaFormat", ext.slice(0, 3) === "bio");
        // }

        // if filename doesn't end in .molmoda, then add it.
        // if (this.lastUseMolModaFormat !== useMolModa) {
        //     const hasMolModaExt =
        //         filename.toLowerCase().slice(-8) === ".molmoda";
        //     if (useMolModa && !hasMolModaExt) {
        //         this.setUserArg("filename", filename + ".molmoda");
        //     } else if (!useMolModa && hasMolModaExt) {
        //         this.setUserArg("filename", filename.slice(0, -8));
        //     }
        // }

        // Try to figure out if the extention matches any known formats.
        if (filename !== this.lastFilename) {
            // Doing it this way so that typing the extension updates it, but
            // updating the extension is still possible. Otherwise, just obeys
            // extension of present, user can't change via select.
            const format = getFormatInfoGivenType(ext);
            if (format) {
                for (const userArgId of [
                    "oneMolFileFormat",
                    "nonCompoundFormat",
                    "compoundFormat",
                ]) {
                    const userArgDefault = this.userArgDefaults.filter(
                        (userArg) => userArg.id === userArgId
                    )[0];
                    const userArgDefaultOptionVals = (
                        userArgDefault as IUserArgSelect
                    ).options.map((option) => (option as IUserArgOption).val);

                    if (
                        userArgDefaultOptionVals.indexOf(format.primaryExt) !==
                        -1
                    ) {
                        this.setUserArg(userArgId, format.primaryExt);
                    }
                }
            }

            this.lastFilename = filename;
        }

        // this.lastUseMolModaFormat = newUseMolModa;
        // this.setUserArg("useMolModaFormat", newUseMolModa);

        // return newUseMolModa;
    }

    /**
     * Detects when user arguments have changed, and updates UI accordingly.
     */
    onUserArgChange() {
        this.reactToExtChange();

        const useMolModa = this.getUserArg("useMolModaFormat") as boolean;

        // this.setUserArgEnabled("molMergingGroup", !useMolModa);
        this.setUserArgEnabled("whichMolsGroup", !useMolModa);
        this.setUserArgEnabled("separateCompounds", !useMolModa);

        // Show onemol format or protein format, depending on whether
        // mergeAllMolecules is true.
        let separateCompounds = this.getUserArg("separateCompounds") as boolean;
        this.setUserArgEnabled(
            "oneMolFileFormat",
            !separateCompounds && !useMolModa
        );
        this.setUserArgEnabled(
            "nonCompoundFormat",
            separateCompounds && !useMolModa
        );

        // If separating out compounds, show compound format.
        this.setUserArgEnabled(
            "compoundFormat",
            separateCompounds && !useMolModa
        );
    }

    /**
     * Makes sure all the file names are unique.
     *
     * @param {FileInfo[]} fileInfos  The file infos to check.
     * @returns {FileInfo[]}  The file infos with any names changed so they are
     *     all unique.
     */
    private _ensureAllFileNamesAreUnique(fileInfos: FileInfo[]): FileInfo[] {
        const fileNamesAlreadyUsed: { [key: string]: number } = {};
        return fileInfos.map((fileInfo, index) => {
            const fileName = fileInfo.name;
            if (fileNamesAlreadyUsed[fileName] === undefined) {
                fileNamesAlreadyUsed[fileName] = 1;
            } else {
                fileNamesAlreadyUsed[fileName] += 1;

                // Divide fileName into name and extension
                const prts = getFileNameParts(fileName);
                const newFileName = `${prts.basename}-${fileNamesAlreadyUsed[fileName]}.${prts.ext}`;
                fileInfos[index].name = newFileName;
            }
            return fileInfo;
        });
    }

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    async runJobInBrowser(): Promise<void> {
        let filename = this.getUserArg("filename");
        const useMolModaFormat = this.getUserArg("useMolModaFormat") as boolean;
        let compoundFormat = this.getUserArg("compoundFormat");
        let nonCompoundFormat = this.getUserArg("nonCompoundFormat");
        const oneMolFileFormat = this.getUserArg("oneMolFileFormat");
        const separateCompounds = this.getUserArg(
            "separateCompounds"
        ) as boolean;
        const saveHiddenAndUnselected = this.getUserArg(
            "saveHiddenAndUnselected"
        ) as boolean;
        const saveVisible = this.getUserArg("saveVisible") as boolean;
        const saveSelected = this.getUserArg("saveSelected") as boolean;

        if (useMolModaFormat) {
            // If filename doesn't end in .molmoda, add .molmoda
            if (filename.toLowerCase().slice(-8) !== ".molmoda") {
                filename = filename + ".molmoda";
            }

            await saveMolModa(filename);

            if (this.appClosing) {
                closeDownApp("Your file has been saved. ");
            }

            return Promise.resolve();
        }

        // If saving to a single molecule and not separating out compounds,
        // compoundFormat and nonCompoundFormat should be the same.
        if (separateCompounds === false) {
            compoundFormat = oneMolFileFormat;
            nonCompoundFormat = oneMolFileFormat;
        }

        let molsToConsider = {
            visible: saveVisible,
            selected: saveSelected,
            hiddenAndUnselected: saveHiddenAndUnselected,
        } as IMolsToConsider;

        // Divide terminal nodes into compound and non-compound, per the mols to
        // consider.
        const compiledMolModels = compileMolModels(
            molsToConsider,
            separateCompounds
        );

        // Perform any file conversion needed
        return convertCompiledMolModelsToIFileInfos(
            compiledMolModels,
            compoundFormat,
            nonCompoundFormat
        )
            .then((compoundNonCompoundFileInfos: ICmpdNonCmpdFileInfos) => {
                // Rename files before export
                for (const fileInfos of [
                    compoundNonCompoundFileInfos.compoundFileInfos,
                    compoundNonCompoundFileInfos.nonCompoundFileInfos,
                ]) {
                    for (const fileInfo of fileInfos) {
                        if (fileInfo.treeNode) {
                            let ext = fileInfo.getFileType();
                            if (ext === undefined) {
                                throw new Error(
                                    "Should never happen, because converting from internal format!"
                                );
                            }
                            ext = ext.toLowerCase();
                            const filename = slugify(
                                fileInfo.treeNode.descriptions.pathName("_", 0)
                            );
                            fileInfo.name = filename + "." + ext;
                        }
                    }
                }

                compoundNonCompoundFileInfos.compoundFileInfos =
                    this._ensureAllFileNamesAreUnique(
                        compoundNonCompoundFileInfos.compoundFileInfos
                    );
                compoundNonCompoundFileInfos.nonCompoundFileInfos =
                    this._ensureAllFileNamesAreUnique(
                        compoundNonCompoundFileInfos.nonCompoundFileInfos
                    );

                // Now save the molecules
                const totalFileCount =
                    compoundNonCompoundFileInfos.compoundFileInfos.length +
                    compoundNonCompoundFileInfos.nonCompoundFileInfos.length;
                if (separateCompounds === false || totalFileCount === 1) {
                    for (const fileInfos of [
                        compoundNonCompoundFileInfos.compoundFileInfos,
                        compoundNonCompoundFileInfos.nonCompoundFileInfos,
                    ]) {
                        if (fileInfos.length == 0) continue;

                        // Saving to one file, so update the filename to be that one
                        // file. First, get extension of existing filename.
                        const currentFileName = fileInfos[0].name;
                        const ext = getFileNameParts(currentFileName).ext;

                        // Update the filename
                        fileInfos[0].name = correctFilenameExt(filename, ext);
                    }
                }

                saveMolFiles(filename, compoundNonCompoundFileInfos);
                return;
            })
            .catch((err: any) => {
                throw err;
            });
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    async getTests(): Promise<ITest[]> {
        const molModaJob = {
            beforePluginOpens: new TestCmdList()
                .loadExampleMolecule(true)
                .selectMoleculeInTree("Protein"),
            pluginOpen: new TestCmdList().setUserArg(
                "filename",
                "test",
                this.pluginId
            ),
            afterPluginCloses: new TestCmdList().waitUntilRegex(
                "#log",
                "Job savemolecules.*? ended"
            ),
        };

        const jobs = [molModaJob];

        let idx = 0;

        for (let toConsider of [
            // visible, selected, hiddenAndUnselected checkboxes
            [true, false, false],
            [false, true, false],
            [true, true, false],
            [true, true, true],

            // Not going to consider below for simplicity's sake.
            // [false, false, true],
            // [true, false, true],
            // [false, true, true],
        ]) {
            // Unpack as visible, selected, hiddenAndUnselected
            const [visible, selected, hiddenAndUnselected] = toConsider;

            idx++;

            let pluginOpen = new TestCmdList()
                .setUserArg("filename", "test", this.pluginId)
                // .setUserArg("useMolModaFormat", false, this.pluginId)
                .click(
                    "#modal-savemolecules #useMolModaFormat-savemolecules-item"
                );

            if (visible === false) {
                // True by default, so must click
                pluginOpen = pluginOpen.click(
                    "#modal-savemolecules #saveVisible-savemolecules-item"
                );
            }

            if (selected === false) {
                // True by default, so must click
                pluginOpen = pluginOpen.click(
                    "#modal-savemolecules #saveSelected-savemolecules-item"
                );
            }

            if (hiddenAndUnselected === true) {
                // False by default, so must click
                pluginOpen = pluginOpen.click(
                    "#modal-savemolecules #saveHiddenAndUnselected-savemolecules-item"
                );
            }

            if (idx % 2 === 0) {
                pluginOpen = pluginOpen.click(
                    "#modal-savemolecules #separateCompounds-savemolecules-item"
                );
            }

            // Note that the PDB and MOL2 formats (defaults) require OpenBabel and
            // non-OpenBabel, respectively. So already good testing without varying
            // those.

            jobs.push({
                ...molModaJob,
                pluginOpen: pluginOpen,
            });
        }

        return jobs;
    }
}
</script>

<style scoped lang="scss"></style>
