<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        @onPopupDone="onPopupDone"
        actionBtnTxt="Dock"
        @onUserArgChanged="onUserArgChanged"
        :hideIfDisabled="true"
    >
        <Alert type="warning">
            This plugin assumes your compound(s) and protein(s) have already
            been properly protonated. If necessary, be sure to use
            <PluginPathLink plugin="protonatecomps"></PluginPathLink> and
            <PluginPathLink plugin="reduce"></PluginPathLink> first.
        </Alert>
    </PluginComponent>
</template>

<script lang="ts">
import { FileInfo } from "@/FileSystem/FileInfo";
import {
    checkCompoundLoaded,
    checkProteinLoaded,
} from "@/Plugins/Core/CheckUseAllowedUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    IContributorCredit,
    ISoftwareCredit,
    Licenses,
} from "@/Plugins/PluginInterfaces";
import {
    UserArg,
    UserArgType,
    IUserArgAlert,
    IUserArgCheckbox,
    IUserArgGroup,
    IUserArgMoleculeInputParams,
    IUserArgNumber,
    IUserSelectRegion,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import {
    IMoleculeInputParams,
    IProtCmpdTreeNodePair,
    MoleculeInput,
} from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import Alert from "@/UI/Layout/Alert.vue";
import { Options } from "vue-class-component";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { messagesApi } from "@/Api/Messages";
import { WebinaQueue } from "./WebinaQueue";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import {
    ISphereOrBox,
    ITreeNodeData,
    TableHeaderSort,
    TreeNodeDataType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { dynamicImports } from "@/Core/DynamicImports";
import PluginPathLink from "@/UI/Navigation/PluginPathLink.vue";
import * as api from "@/Api";
import { IQueueCallbacks } from "@/Queue/QueueTypes";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { isTest } from "@/Testing/SetupTests";
import { PopupVariant } from "@/UI/Layout/Popups/InterfacesAndEnums";
import { secsToTime } from "@/Core/Utils";

let msgOnJobsFinishedtoUse: string | undefined;

/**
 * WebinaPlugin
 */
@Options({
    components: {
        PluginComponent,
        Alert,
        PluginPathLink,
    },
})
export default class WebinaPlugin extends PluginParentClass {
    menuPath = "[6] Docking/Compound Docking...";
    title = "Compound Docking";
    softwareCredits: ISoftwareCredit[] = [
        {
            name: "AutoDock Vina",
            url: "https://vina.scripps.edu/",
            license: Licenses.APACHE2,
            citations: [
                {
                    title: "AutoDock Vina 1.2.0: New Docking Methods, Expanded Force Field, and Python Bindings",
                    authors: [
                        "Eberhardt, Jerome",
                        "Santos-Martins, Diogo",
                        // "...",
                    ],
                    journal: "J. Chem. Inf. Model.",
                    year: 2021,
                    volume: 61,
                    issue: 8,
                    pages: "3891-3898",
                },
            ],
        },
        dynamicImports.webina.credit,
    ];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "webina";

    intro = `Predict the geometry (pose) and strength (affinity) of small-molecule binding.`;
    details = `Uses a version of AutoDock Vina (Webina).`;

    msgOnJobsFinished = () => {
        return msgOnJobsFinishedtoUse;
    };

    userArgDefaults: UserArg[] = [
        // {
        //     type: UserArgType.Alert,
        //     id: "warning",
        //     description:
        //         "This plugin assumes your protein reeptor and small molecules have already been properly protonated. .",
        //     alertType: "warning",
        // } as IUserArgAlert,
        {
            type: UserArgType.MoleculeInputParams,
            id: "makemolinputparams",
            val: new MoleculeInput({
                considerCompounds: true,
                considerProteins: true,
                proteinFormat: "pdbqt",
                compoundFormat: "pdbqtlig", // Will include torsions
                includeMetalsSolventAsProtein: false,
            } as IMoleculeInputParams),
        } as IUserArgMoleculeInputParams,
        {
            id: "region",
            // label: "Region test",
            val: null, // To use default
            type: UserArgType.SelectRegion,
            regionName: "Docking Region",
            warningFunc: (val: ISphereOrBox) => {
                if (!val) return "";
                if (
                    val.center[0] === 0 &&
                    val.center[1] === 0 &&
                    val.center[2] === 0
                ) {
                    return "Your docking region is centered on (0, 0, 0). Change the coordinates or load from a region that encompasses your binding site.";
                }

                if (
                    (val.radius && val.radius < 10) ||
                    (val.dimensions &&
                        (val.dimensions[0] < 10 ||
                            val.dimensions[1] < 10 ||
                            val.dimensions[2] < 10))
                ) {
                    return "Your docking region is very small. Consider increasing the dimensions to at least 10 Å.";
                }

                if (
                    (val.radius && val.radius > 20) ||
                    (val.dimensions &&
                        (val.dimensions[0] > 20 ||
                            val.dimensions[1] > 20 ||
                            val.dimensions[2] > 20))
                ) {
                    return "Your docking region is very large. Consider reducing the dimensions to at most 20 Å.";
                }

                // if (val === "PastedMol") {
                //     return "Consider choosing a unique name so you can easily identify your molecule later.";
                // }
                return "";
            },
        } as IUserSelectRegion,
        {
            id: "cpu",
            type: UserArgType.Number,
            label: "Number of processors",
            val: getSetting("maxProcs"),
            filterFunc: (val: number) => {
                val = Math.round(val);
                if (val < 1) {
                    val = 1;
                }
                if (val > getSetting("maxProcs")) {
                    val = getSetting("maxProcs");
                }
                return val;
            },
            description: "The number of processors to use for docking.",
        } as IUserArgNumber,
        {
            id: "exhaustiveness",
            type: UserArgType.Number,
            label: "Exhaustiveness",
            val: 8,
            filterFunc: (val: number) => {
                val = Math.round(val);
                // Setting ming value to 4 because I occasionally get errors
                // when less than 4.
                if (val < 4) {
                    val = 4;
                }
                return val;
            },
            description:
                "How thoroughly to search for the pose. Roughly proportional to time.",
        } as IUserArgNumber,
        {
            id: "maxRotBonds",
            type: UserArgType.Number,
            label: "Maximum rotatable bonds",
            val: 15,
            filterFunc: (val: number) => {
                val = Math.round(val);
                if (val < 0) {
                    val = 0;
                }
                return val;
            },
            description:
                "Compounds with too many rotatable bonds will be skipped to avoid excessive run times and less accurate predictions.",
        } as IUserArgNumber,
        {
            id: "score_only",
            type: UserArgType.Checkbox,
            label: "Score existing poses, without redocking",
            val: false,
            description:
                "Scores existing docked or crystallographic poses, without repositioning compounds.",
        } as IUserArgCheckbox,
        {
            id: "keep_only_best",
            type: UserArgType.Checkbox,
            label: "Keep only highest-scoring pose for each compound",
            val: true,
            description:
                "Docking generates multiple poses; the top-scoring pose is often correct, but sometimes alternatives may be more accurate.",
        } as IUserArgCheckbox,
        {
            id: "webinaAdvancedParams",
            type: UserArgType.Group,
            label: "Advanced docking parameters",
            val: [
                {
                    id: "warning",
                    type: UserArgType.Alert,
                    val: "Unless you are an expert user, these advanced parameters are best left unmodified.",
                    alertType: "warning",
                } as IUserArgAlert,
                {
                    id: "seed",
                    type: UserArgType.Number,
                    label: "Seed",
                    val: 1,
                    filterFunc: (val: number) => {
                        return Math.round(val);
                    },
                    description:
                        "The explicit seed. Useful if reproducibility is critical.",
                } as IUserArgNumber,
                {
                    id: "num_modes",
                    type: UserArgType.Number,
                    label: "Number of modes",
                    val: 9,
                    filterFunc: (val: number) => {
                        val = Math.round(val);
                        if (val < 1) {
                            val = 1;
                        }
                        return val;
                    },
                    description: "The maximum number of binding poses to show.",
                } as IUserArgNumber,
                {
                    id: "energy_range",
                    type: UserArgType.Number,
                    label: "Energy range",
                    val: 3,
                    filterFunc: (val: number) => {
                        if (val < 0) {
                            val = 0;
                        }
                        return val;
                    },
                    description:
                        "The maximum energy difference between the best and worst pose.",
                } as IUserArgNumber,
            ],
            startOpened: false,
        } as IUserArgGroup,
    ];

    /**
     * Runs before the popup opens. Starts importing the modules needed for the
     * plugin.
     */
    onBeforePopupOpen() {
        // You're probably going to need fpocketweb
        // dynamicImports.fpocketweb.module;
    }

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        const protLoaded = checkProteinLoaded();
        if (protLoaded !== null) {
            return protLoaded;
        }

        return checkCompoundLoaded();
    }

    /**
     * Called when the user arguments change. Override this function to react
     * when the user arguments change. Access the arguments using this.userArgs.
     */
    onUserArgChange() {
        // If score only, then no keeps only best
        const scoreOnly = this.getUserArg("score_only");
        this.setUserArgEnabled("keep_only_best", !scoreOnly);
        this.setUserArgEnabled("webinaAdvancedParams", !scoreOnly);
        return;
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    onPopupDone() {
        this.submitJobs();
    }

    /**
     * Gets the data (e.g., score) from the PDBQT frame.
     *
     * @param {string} pdbqtFrame    The pdbqt frame.
     * @param {any}    webinaParams  The webina parameters.
     * @param {string} stdOut        The standard output.
     * @param {string} protPath      The path to the protein.
     * @param {boolean} keepOnlyBest Whether to keep only the best pose.
     * @param {number}  time         The time it took to dock.
     * @returns {any[]}  The data, the model name, and the score label.
     */
    private _getDataFromPDBQTFrame(
        pdbqtFrame: string,
        webinaParams: { [key: string]: any },
        stdOut: string,
        protPath: string,
        keepOnlyBest: boolean,
        time?: number
    ): [{ [key: string]: ITreeNodeData }, string, string] {
        const scoreOnly = webinaParams["score_only"];
        const pdbqtOutLines = pdbqtFrame.split("\n");

        const modelStr = pdbqtOutLines[0].trim();

        const data: { [key: string]: ITreeNodeData } = {};
        let scoreLabel = "";

        const webinaParamsAsKeyVal: { [name: string]: any } = {};
        const toRemove = ["ligand", "out", "receptor", "score_only"];
        for (const paramName in webinaParams) {
            if (toRemove.indexOf(paramName) !== -1) continue;
            webinaParamsAsKeyVal[paramName] = webinaParams[paramName];
        }

        if (scoreOnly) {
            // Estimated Free Energy of Binding   : -9.516 (kcal/mol) [=(1)+(2)+(3)+(4)]
            // (1) Final Intermolecular Energy    : -14.801 (kcal/mol)
            //     Ligand - Receptor              : -14.801 (kcal/mol)
            //     Ligand - Flex side chains      : 0.000 (kcal/mol)
            // (2) Final Total Internal Energy    : -0.773 (kcal/mol)
            //     Ligand                         : -0.773 (kcal/mol)
            //     Flex   - Receptor              : 0.000 (kcal/mol)
            //     Flex   - Flex side chains      : 0.000 (kcal/mol)
            // (3) Torsional Free Energy          : 5.285 (kcal/mol)
            // (4) Unbound System's Energy        : -0.773 (kcal/mol)

            const extractEnergy = (pattern: RegExp): number => {
                const match = stdOut.match(pattern);
                return match ? parseFloat(match[1]) : NaN;
            };

            const estimatedFreeEnergyOfBinding = extractEnergy(
                /Estimated Free Energy of Binding\s*:\s*(-?[\d.]+)/
            );
            // const finalIntermolecularEnergy = extractEnergy(
            //     /\(1\) Final Intermolecular Energy\s*:\s*(-?[\d.]+)/
            // );
            // const finalTotalInternalEnergy = extractEnergy(
            //     /\(2\) Final Total Internal Energy\s*:\s*(-?[\d.]+)/
            // );
            // const torsionalFreeEnergy = extractEnergy(
            //     /\(3\) Torsional Free Energy\s*:\s*(-?[\d.]+)/
            // );
            // const unboundSystemsEnergy = extractEnergy(
            //     /\(4\) Unbound System's Energy\s*:\s*(-?[\d.]+)/
            // );

            scoreLabel = "Webina Scores: " + protPath;

            data[scoreLabel] = {
                data: {
                    "Score (kcal/mol)": estimatedFreeEnergyOfBinding,
                    ...webinaParamsAsKeyVal,
                    // "Intermolecular (kcal/mol)":
                    //     finalIntermolecularEnergy,
                    // "Internal (kcal/mol)": finalTotalInternalEnergy,
                    // "Torsional (kcal/mol)": torsionalFreeEnergy,
                    // "Unbound System (kcal/mol)": unboundSystemsEnergy,
                },
                type: TreeNodeDataType.Table,
                treeNodeId: "", // Fill in later
                headerSort: TableHeaderSort.None,
            };
        } else {
            scoreLabel = "Webina Docking Scores: " + protPath;
            const lineWithScore = pdbqtOutLines.find((line: string) =>
                line.startsWith("REMARK VINA")
            );
            const score = lineWithScore
                ? parseFloat(lineWithScore.split(/\s+/)[3])
                : 0;

            data[scoreLabel] = {
                data: {
                    "Score (kcal/mol)": score,
                    ...webinaParamsAsKeyVal,
                },
                type: TreeNodeDataType.Table,
                treeNodeId: "", // Fill in later
                headerSort: TableHeaderSort.None,
            };
        }

        // if (time) {
        //     data[scoreLabel].data["Time"] = secsToTime(time / 1000);
        // }

        const modelName = keepOnlyBest
            ? ""
            : `:${modelStr.replace("MODEL", "model").replace(" ", "")}`;

        return [data, modelName, scoreLabel];
    }

    /**
     * Converts the output pdbqt to a TreeNode.
     *
     * @param {string} title       The title of the TreeNode.
     * @param {string} pdbqtOut    The pdbqt output.
     * @param {string} cmpdSrc     The source of the compound.
     * @param {any}    data        The data to associate with the TreeNode.
     * @param {string} scoreLabel  The label of the score.
     * @returns {Promise<TreeNode>}  A promise that resolves to the TreeNode.
     */
    private _outputPdbqtToTreeNodePromise(
        title: string,
        pdbqtOut: string,
        cmpdSrc: string,
        data: { [key: string]: ITreeNodeData },
        scoreLabel: string
    ): Promise<TreeNode | void> {
        if (pdbqtOut === "{{ERROR}}") {
            // throw new Error("Could not perform docking.");
            return Promise.resolve();
        }

        // Create fileinfo
        const fileInfo = new FileInfo({
            name: title + ".pdbqt",
            contents: pdbqtOut,
        });

        return TreeNode.loadFromFileInfo(fileInfo)
            .then((treeNode: TreeNode | void) => {
                if (!treeNode) {
                    throw new Error("Could not load file into tree node.");
                }

                // This has been loaded hierarchically. So the one
                // terminal node is the actual TreeNode.
                let terminalTreeNode = treeNode.nodes?.terminals.get(0);

                if (terminalTreeNode) {
                    terminalTreeNode.src = cmpdSrc;
                    terminalTreeNode.data = data;
                    terminalTreeNode.data[scoreLabel].treeNodeId =
                        terminalTreeNode.id;
                    terminalTreeNode.title = title;
                } else {
                    // This should never happen, but here for typescript.
                    terminalTreeNode = treeNode;
                }

                return terminalTreeNode;
            })
            .catch((err: Error) => {
                // TODO: FIX
                throw err;
                // messagesApi.popupError(
                // `<p>FPocketWeb threw an error, likely because it could not detect any pockets.</p><p>Error details: ${err.message}</p>`
                // );
            });
    }

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @param {any[]} payloads  The user arguments to pass to the "executable."
     *                          Contains compound information.
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    async runJobInBrowser(payloads: any[]): Promise<void> {
        const filePairs: IProtCmpdTreeNodePair[] =
            this.getUserArg("makemolinputparams");

        if (
            filePairs.length === 0 ||
            !filePairs[0].prot ||
            !filePairs[0].cmpd
        ) {
            api.messages.popupError(
                "Could not perform docking! You must select at least one compound and one protein."
            );
            return;
        }

        // TODO: Consider this.getUserArgsFlat() instead.
        let userArgs = [
            ...this.userArgs,
            ...this.getUserArg("webinaAdvancedParams"),
        ] as UserArg[];

        // Prepare Webina parameters
        const webinaParams: { [key: string]: any } = {};
        userArgs.forEach((arg: UserArg) => {
            webinaParams[arg.id] = arg.val;
        });
        const region = webinaParams["region"];
        webinaParams["center_x"] = region.center[0];
        webinaParams["center_y"] = region.center[1];
        webinaParams["center_z"] = region.center[2];
        webinaParams["size_x"] = region.dimensions[0];
        webinaParams["size_y"] = region.dimensions[1];
        webinaParams["size_z"] = region.dimensions[2];
        webinaParams["receptor"] = "/receptor.pdbqt";
        webinaParams["ligand"] = "/ligand.pdbqt";
        webinaParams["out"] = "/output.pdbqt";

        let keepOnlyBest = webinaParams["keep_only_best"];
        let maxRotBonds = webinaParams["maxRotBonds"];

        // A number of user args aren't actual webina parameters. Remove them.
        const notParams = [
            "region",
            "keep_only_best",
            "warning",
            "makemolinputparams",
            "webinaAdvancedParams",
            "maxRotBonds",
        ];
        notParams.forEach((notParam) => {
            if (webinaParams[notParam] !== undefined) {
                delete webinaParams[notParam];
            }
        });

        // If score only, some other parameters aren't needed (shouldn't be set)
        if (webinaParams["score_only"]) {
            delete webinaParams["num_modes"];
            delete webinaParams["energy_range"];
            delete webinaParams["seed"];
            keepOnlyBest = true; // because there's only 1
        }

        let origAssociatedTreeNodes = filePairs.map((filePair) => {
            return [filePair.prot?.treeNode, filePair.cmpd?.treeNode];
        });

        let inputs: any = filePairs.map((filePair, idx) => {
            filePair.prot.name = `/receptor_${idx}.pdbqt`;
            filePair.cmpd.name = `/ligand_${idx}.pdbqt`;

            // Use a regular expression to find all occurrences of 'H'
            let matches = filePair.cmpd.contents.match(/\nBRANCH/g);
            let numRotBonds = matches ? matches.length : 0;

            if (numRotBonds > maxRotBonds) {
                api.messages.popupMessage(
                    "Compound Exceeds Rotatable Bond Limit",
                    `Will not dock compound: ${filePair.cmpd.treeNode?.title} (skipped). Compound has more than ${maxRotBonds} rotatable bonds (${numRotBonds}).`,
                    PopupVariant.Warning
                );
                return null;
            }

            return {
                pdbFiles: filePair,
                webinaParams: webinaParams,
                keepOnlyBest: (
                    userArgs.filter(
                        (u) => u.id === "keep_only_best"
                    )[0] as UserArg
                ).val,
                inputNodeTitle: filePair.cmpd.treeNode?.title,
            };
        });

        // Remove null values from inputs AND origAssociatedTreeNodes
        for (let i = 0; i < inputs.length; i++) {
            if (inputs[i] === null) origAssociatedTreeNodes[i] = [undefined];
        }
        inputs = inputs.filter((input: any) => input !== null);
        origAssociatedTreeNodes = origAssociatedTreeNodes.filter(
            (input: any) => input[0] !== undefined
        );

        const procsPerJobBatch = webinaParams["cpu"];

        // You can run multiple ligands at once, so let's do it in batches of
        // 1000.
        const simultBatches = 1;
        const batchSize = 1000;

        const initialCompoundsVisible = getSetting("initialCompoundsVisible");

        const newTreeNodesByInputProt: { [key: string]: TreeNode } = {};

        const onJobDoneFunc = async (webinaOut: any, jobIndex: number) => {
            const origProtTreeNode = origAssociatedTreeNodes[jobIndex][0];
            const origCmpdTreeNode = origAssociatedTreeNodes[
                jobIndex
            ][1] as TreeNode;

            // If there was an error, throw it so it can be caught (inform user).
            if (webinaOut.output === "{{ERROR}}") {
                throw new Error("Could not perform docking.");
            }

            // Split on lines that start with "MODEL"
            let pdbqtOutsSeparate = webinaOut.output.split(/\n(?=MODEL)/);

            // If only keeping the best model, let's discard the others.
            if (keepOnlyBest) {
                pdbqtOutsSeparate = [pdbqtOutsSeparate[0]];
            }

            const protPath = (
                origProtTreeNode as TreeNode
            ).descriptions.pathName(":");

            // Go through each of the models in the output file.
            for (const pdbqtOut of pdbqtOutsSeparate) {
                const [data, modelName, scoreLabel] =
                    this._getDataFromPDBQTFrame(
                        pdbqtOut,
                        webinaParams,
                        webinaOut.stdOut,
                        protPath,
                        keepOnlyBest,
                        webinaOut.time
                    );

                const protId = origProtTreeNode?.id as string;

                // Make a new treenode. Note that this also converts the pdbqt
                // file to a GLModel.
                const dockedTreeNode = await this._outputPdbqtToTreeNodePromise(
                    origCmpdTreeNode.title + modelName,
                    pdbqtOut,
                    origCmpdTreeNode.src as string,
                    data,
                    scoreLabel
                );

                if (dockedTreeNode === undefined) {
                    continue;
                }

                // Hide if not first few
                if (jobIndex >= initialCompoundsVisible) {
                    dockedTreeNode.visible = false;
                }

                // Get the top title of the protein. Because things have been
                // organized by proteins, all these will be the same, so first
                // one is as good as any.
                const protTreeNode = origProtTreeNode as TreeNode;
                const title = protTreeNode.getAncestry().get(0).title;

                const rootNode = TreeNode.loadHierarchicallyFromTreeNodes([
                    dockedTreeNode,
                ]);

                rootNode.title = `${title}:docking`;

                if (isTest) {
                    // If testing, append ":testdock" to all new molecules so
                    // you can watch for them. #TODO: This is a little hacky.
                    rootNode.nodes?.terminals.forEach((node) => {
                        node.title += ":testdock";
                    });
                }

                if (!newTreeNodesByInputProt[protId]) {
                    // Note: At this point, rootNode contains GLModel (already parsed).
                    rootNode.addToMainTree();
                    newTreeNodesByInputProt[protId] = rootNode;
                } else {
                    // Merge into the existing node
                    const existingNode = newTreeNodesByInputProt[protId];
                    existingNode.mergeInto(rootNode);

                    // Not sure why I need to trigger reactivity explicitly here.
                    getMoleculesFromStore().triggerReactivity();
                }
            }
        };

        const callbacks = {
            // Doing it this way so molecules added to the viewer as they are
            // docked (not all at once at the end).
            onJobDone: onJobDoneFunc,
            onQueueDone: (outputs: any[]) => {
                // debugger;
                // Remove errors
                outputs = outputs.filter(
                    (output) => output.output !== "{{ERROR}}"
                );

                if (outputs.length === 0) {
                    msgOnJobsFinishedtoUse =
                        "No compounds docked successfully.";
                } else {
                    const compounds =
                        outputs.length == 1 ? "compound" : "compounds";
                    msgOnJobsFinishedtoUse = `Finished docking ${outputs.length} ${compounds} (see molecular viewer). Some docked compounds might be hidden. You can toggle visibility using the Navigator panel. The Data panel includes additional information about the docked ${compounds}.`;
                }
            },
        } as IQueueCallbacks;

        await new WebinaQueue(
            "webina",
            inputs,
            callbacks,
            procsPerJobBatch,
            simultBatches,
            batchSize,
            true,
            false
        ).done.catch((err: Error) => {
            // Intentionally not rethrowing error here. // TODO: fix this
            messagesApi.popupError(
                `<p>Webina threw an error.</p><p>Error details: ${err.message}</p>`
            );
        });

        return;
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    async getTests(): Promise<ITest[]> {
        const webinaPluginOpenFactory = (dimen=10) => {
            return new TestCmdList()
                .setUserArg("x-dimens-region", dimen, this.pluginId)
                .setUserArg("y-dimens-region", dimen, this.pluginId)
                .setUserArg("z-dimens-region", dimen, this.pluginId)
                .setUserArg("x-center-region", 6.322, this.pluginId)
                .setUserArg("y-center-region", 9.638, this.pluginId)
                .setUserArg("z-center-region", 18.939, this.pluginId)
                .setUserArg("cpu", 4, this.pluginId)
                .setUserArg("exhaustiveness", 1, this.pluginId);
        };

        return [
            // Test just standard docking
            {
                beforePluginOpens: new TestCmdList().loadExampleMolecule(
                    undefined,
                    undefined,
                    0
                ),
                pluginOpen: webinaPluginOpenFactory(),
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "4WP4:docking"
                ),
            },
            // Test score in place
            {
                beforePluginOpens: new TestCmdList().loadExampleMolecule(
                    undefined,
                    undefined,
                    1
                ),
                pluginOpen: webinaPluginOpenFactory().click(
                    "#score_only-webina-item"
                ),
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "4WP4:docking"
                ),
            },

            // Test keep all poses
            {
                beforePluginOpens: new TestCmdList().loadExampleMolecule(
                    undefined,
                    undefined,
                    2
                ),
                pluginOpen: webinaPluginOpenFactory().click(
                    "#keep_only_best-webina-item"
                ),
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "4WP4:docking"
                ),
            },

            // Test bad ligands
            {
                beforePluginOpens: new TestCmdList()
                    .loadExampleMolecule(false, "testmols/bad_ligs.can", 3)
                    .wait(5)
                    .loadExampleMolecule(undefined, undefined, 3),
                pluginOpen: webinaPluginOpenFactory(),
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "frame3:bad_ligs:testdock"
                ),
            },

            // Test out ligands that have too many bonds.
            {
                beforePluginOpens: new TestCmdList()
                    .loadExampleMolecule(false, "testmols/long_compound.can", 4)
                    .wait(5)
                    .loadExampleMolecule(undefined, undefined, 4),
                pluginOpen: webinaPluginOpenFactory(),
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#modal-simplemsg",
                    "Will not dock compound"
                ),
            },

            // Test just standard docking, but with a very large docking box
            // (blind docking) to stress the memory.
            {
                beforePluginOpens: new TestCmdList().loadExampleMolecule(
                    undefined,
                    undefined,
                    5
                ),
                pluginOpen: webinaPluginOpenFactory(50),
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "4WP4:docking"
                ),
            },
        ];
    }
}
</script>

<style scoped lang="scss"></style>
