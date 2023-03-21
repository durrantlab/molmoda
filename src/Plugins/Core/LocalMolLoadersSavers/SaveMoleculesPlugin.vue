<template>
    <PluginComponent
        ref="pluginComponent"
        :userArgs="userArgs"
        v-model="open"
        title="Save Molecule Files"
        actionBtnTxt="Save"
        :intro="introToUse"
        :pluginId="pluginId"
        @onPopupDone="onPopupDone"
        :prohibitCancel="appClosing"
        @onDataChanged="onDataChanged"
        :hideIfDisabled="true"
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
import {
    PluginParentClass,
    RunJobReturn,
} from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    FormElement,
    IFormCheckbox,
    IFormGroup,
    IFormSelect,
    IFormText,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { ITest } from "@/Testing/TestCmd";
import { getFormatDescriptions } from "@/FileSystem/LoadSaveMolModels/Types/MolFormats";
import { saveBiotite } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveBiotite";
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
import { correctFilenameExt } from "@/FileSystem/Utils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TestCmdList } from "@/Testing/TestCmdList";

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
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Jacob D. Durrant",
            url: "http://durrantlab.com/",
        },
    ];
    pluginId = "savemolecules";

    intro = `Please provide the name of the molecule file to save. The
      file extension will be automatically appended.`;

    hotkey = "s";

    // If true, this plugin is being shown as part of the (terminal) app-closing
    // process.
    appClosing = false;

    userArgs: FormElement[] = [
        {
            id: "filename",
            label: "",
            val: "",
            placeHolder: "Enter Filename (e.g., my_project.biotite)",
            filterFunc: (filename: string): string => {
                return fileNameFilter(filename);
            },
            validateFunc: (filename: string): boolean => {
                return matchesFilename(filename);
            },
        } as IFormText,
        {
            id: "useBiotiteFormat",
            label: "Save project in .biotite format",
            val: true,
        } as IFormCheckbox,
        {
            id: "whichMolsGroup",
            label: "Molecules to Save",
            childElements: [
                {
                    id: "saveVisible",
                    label: "Visible molecules",
                    val: false,
                } as IFormCheckbox,
                {
                    id: "saveSelected",
                    label: "Selected molecules",
                    val: false,
                } as IFormCheckbox,
                {
                    id: "saveHiddenAndUnselected",
                    label: "Other molecules (hidden and unselected)",
                    val: true,
                } as IFormCheckbox,
            ] as FormElement[],
            startOpened: true,
            enabled: false,
        } as IFormGroup,
        {
            id: "separateCompounds",
            label: "Save each small-molecule compound to a separate file",
            val: true,
            enabled: false,
        } as IFormCheckbox,
        {
            label: "File format for all molecules, saved to a single file",
            id: "oneMolFileFormat",
            val: "pdb",
            options: getFormatDescriptions(false).filter(
                (option) => option.val !== "biotite"
            ),
            enabled: false,
        } as IFormSelect,
        {
            label: "File format for macromolecules, solvent, etc.",
            id: "nonCompoundFormat",
            val: "pdb",
            options: getFormatDescriptions(false),
            enabled: false,
        } as IFormSelect,
        {
            label: "File format for separate small-molecule compounds",
            id: "compoundFormat",
            val: "mol2",
            options: getFormatDescriptions(true).filter(
                (option) => option.val !== "biotite"
            ),
            enabled: false,
        } as IFormSelect,
    ];

    alwaysEnabled = true;

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
     */
    onBeforePopupOpen() {
        this.appClosing = this.payload !== undefined;

        // Reset some form values
        this.updateUserArgs([
            {
                name: "useBiotiteFormat",
                val: true,
            },
            {
                name: "saveVisible",
                val: true,
            },
            {
                name: "saveSelected",
                val: true,
            },
            {
                name: "saveHiddenAndUnselected",
                val: false,
            },
            {
                name: "separateCompounds",
                val: true,
            },
        ]);

        this.payload = undefined;
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     *
     * @param {IUserArg[]} userArgs  The user arguments.
     */
    onPopupDone(userArgs: IUserArg[]) {
        this.submitJobs([userArgs]);
    }

    /**
     * Detects when user arguments have changed, and updates UI accordingly.
     *
     * @param {userArgs[]} userArgs  The updated user arguments.
     */
    onDataChanged(userArgs: IUserArg[]) {
        let useBiotite = this.getArg(userArgs, "useBiotiteFormat") as boolean;
        // this.updateUserArgEnabled("molMergingGroup", !useBiotite);
        this.updateUserArgEnabled("whichMolsGroup", !useBiotite);
        this.updateUserArgEnabled("separateCompounds", !useBiotite);

        // Show onemol format or protein format, depending on whether
        // mergeAllMolecules is true.
        let separateCompounds = this.getArg(
            userArgs,
            "separateCompounds"
        ) as boolean;
        this.updateUserArgEnabled(
            "oneMolFileFormat",
            !separateCompounds && !useBiotite
        );
        this.updateUserArgEnabled(
            "nonCompoundFormat",
            separateCompounds && !useBiotite
        );

        // If separating out compounds, show compound format.
        this.updateUserArgEnabled(
            "compoundFormat",
            separateCompounds && !useBiotite
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
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @param {IUserArg[]} userArgs  Information about the file to save.
     * @returns {RunJobReturn}  A promise that resolves when the job is
     *     done.
     */
    runJobInBrowser(userArgs: IUserArg[]): RunJobReturn {
        const filename = this.getArg(userArgs, "filename");
        const useBiotiteFormat = this.getArg(
            userArgs,
            "useBiotiteFormat"
        ) as boolean;
        let compoundFormat = this.getArg(userArgs, "compoundFormat");
        let nonCompoundFormat = this.getArg(userArgs, "nonCompoundFormat");
        const oneMolFileFormat = this.getArg(userArgs, "oneMolFileFormat");
        const separateCompounds = this.getArg(
            userArgs,
            "separateCompounds"
        ) as boolean;
        const saveHiddenAndUnselected = this.getArg(
            userArgs,
            "saveHiddenAndUnselected"
        ) as boolean;
        const saveVisible = this.getArg(userArgs, "saveVisible") as boolean;
        const saveSelected = this.getArg(userArgs, "saveSelected") as boolean;

        if (useBiotiteFormat) {
            saveBiotite(filename)
                .then(() => {
                    if (this.appClosing) {
                        api.messages.popupMessage(
                            "Session Ended",
                            "Your file has been saved. You may now close/reload this tab/window.",
                            PopupVariant.Info,
                            () => {
                                // Reload the page
                                window.location.reload();
                            }
                        );
                    }
                    return;
                })
                .catch((err: any) => {
                    throw err;
                });

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

        debugger;

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
                compoundNonCompoundFileInfos.compoundFileInfos =
                    this._ensureAllFileNamesAreUnique(
                        compoundNonCompoundFileInfos.compoundFileInfos
                    );
                compoundNonCompoundFileInfos.nonCompoundFileInfos =
                    this._ensureAllFileNamesAreUnique(
                        compoundNonCompoundFileInfos.nonCompoundFileInfos
                    );

                // Now save the molecules
                if (separateCompounds === false) {
                    // Saving to one file, so update the filename to be that one
                    // file. First, get extension of existing filename.
                    const currentFileName =
                        compoundNonCompoundFileInfos.nonCompoundFileInfos[0]
                            .name;
                    const ext = getFileNameParts(currentFileName).ext;

                    // Update the filename
                    compoundNonCompoundFileInfos.nonCompoundFileInfos[0].name =
                        correctFilenameExt(filename, ext);
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
    getTests(): ITest[] {
        const biotiteJob = {
            beforePluginOpens: new TestCmdList()
                .loadExampleProtein(true)
                .selectMoleculeInTree("Protein").cmds,
            pluginOpen: new TestCmdList().setUserArg(
                "filename",
                "test",
                this.pluginId
            ).cmds,
            afterPluginCloses: new TestCmdList()
                .waitUntilRegex("#log", 'Job "savemolecules:.+?" ended')
                .wait(3).cmds,
        };

        const jobs = [
            // Biotite
            biotiteJob,
        ];

        let idx = 0;

        for (let toConsider of [
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

            const pluginOpen = new TestCmdList()
                .setUserArg("filename", "test", this.pluginId)
                .setUserArg("useBiotiteFormat", false, this.pluginId)
                .setUserArg("saveVisible", visible, this.pluginId)
                .setUserArg("saveSelected", selected, this.pluginId)
                .setUserArg(
                    "saveHiddenAndUnselected",
                    hiddenAndUnselected,
                    this.pluginId
                )
                .setUserArg(
                    "separateCompounds",
                    idx % 2 === 0,
                    this.pluginId
                ).cmds;

            // Note that the PDB and MOL2 formats (defaults) require OpenBabel and
            // non-OpenBabel, respectively. So already good testing without varying
            // those.

            jobs.push({
                ...biotiteJob,
                pluginOpen: pluginOpen,
            });
        }

        return jobs;
    }
}
</script>

<style scoped lang="scss"></style>
