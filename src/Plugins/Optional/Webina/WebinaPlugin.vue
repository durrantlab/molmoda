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
    ITreeNodeData,
    TreeNodeDataType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { dynamicImports } from "@/Core/DynamicImports";
import PluginPathLink from "@/UI/Navigation/PluginPathLink.vue";

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
                    authors: ["Eberhardt, Jerome", "Santos-Martins, Diogo", ".,.."],
                    journal: "J. Chem. Inf. Model.",
                    year: 2021,
                    volume: 61,
                    issue: 8,
                    pages: "3891-3898",
                }
            ]
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

    intro = `Predict the geometry (pose) and strength (affinity) of small-molecule binding. Uses a version of AutoDock Vina (Webina).`;

    // msgOnJobsFinished =
    //     "Finished detecting pockets. Each protein's top six pockets are displayed in the molecular viewer. You can toggle the visibility of the other pockets using the Navigator panel. The Data panel includes additional information about the detected pockets.";

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
            regionName: "Docking Box",
        } as IUserSelectRegion,
        {
            id: "cpu",
            type: UserArgType.Number,
            label: "Number of processors",
            val: 1,
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
            description:
                "If performing multiple dockings, use 1. Otherwise, consider more.",
        } as IUserArgNumber,
        {
            id: "exhaustiveness",
            type: UserArgType.Number,
            label: "Exhaustiveness",
            val: 8,
            filterFunc: (val: number) => {
                val = Math.round(val);
                if (val < 1) {
                    val = 1;
                }
                return val;
            },
            description:
                "How thoroughly to search for the pose. Roughly proportional to time.",
        } as IUserArgNumber,
        {
            id: "score_only",
            type: UserArgType.Checkbox,
            label: "Score only",
            val: false,
            description:
                "Scores the existing pose, without repositioning the compound.",
        } as IUserArgCheckbox,
        {
            id: "keep_only_best",
            type: UserArgType.Checkbox,
            label: "Keep only best",
            val: true,
            description: "Keep only the best predicted pose for each compound.",
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
                    label: "Random seed",
                    val: 1,
                    filterFunc: (val: number) => {
                        return Math.round(val);
                    },
                    description:
                        "The explicit random seed. Useful if reproducibility is critical.",
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
        const filePairs: IProtCmpdTreeNodePair[] =
            this.getUserArg("makemolinputparams");

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

        // A number of user args aren't actual webina parameters. Remove them.
        const notParams = [
            "region",
            "keep_only_best",
            "warning",
            "makemolinputparams",
            "webinaAdvancedParams"
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

        const origAssociatedTreeNodes = filePairs.map((filePair) => {
            return [filePair.prot.treeNode, filePair.cmpd.treeNode];
        });

        const payloads: any = filePairs.map((filePair) => {
            filePair.prot.name = "/receptor.pdbqt";
            filePair.cmpd.name = "/ligand.pdbqt";
            return {
                pdbFiles: filePair,
                webinaParams: webinaParams,
                keepOnlyBest: (
                    userArgs.filter(
                        (u) => u.id === "keep_only_best"
                    )[0] as UserArg
                ).val,
            };
        });

        new WebinaQueue("webina", payloads, webinaParams["cpu"]).done
            .then((webinaOuts: any) => {
                // TODO: Get any stdErr and show errors if they exist.

                // Add keep_only_best and output filename basename to the output
                webinaOuts.forEach((webinaOut: any, i: number) => {
                    webinaOut.keepOnlyBest = keepOnlyBest;
                    webinaOut.scoreOnly = webinaParams["score_only"];
                    webinaOut.origProtTreeNode = origAssociatedTreeNodes[i][0];
                    webinaOut.origCmpdTreeNode = origAssociatedTreeNodes[i][1];
                });

                // Organize by protein
                const byProtein: { [key: string]: any[] } = {};
                webinaOuts.forEach((webinaOut: any) => {
                    const protId = webinaOut.origProtTreeNode.id;
                    if (!byProtein[protId]) {
                        byProtein[protId] = [];
                    }
                    byProtein[protId].push(webinaOut);
                });

                // Get values
                const byProts = Object.keys(byProtein).map((protId) => {
                    return byProtein[protId];
                });

                this.submitJobs(byProts);
                return;
            })
            .catch((err: Error) => {
                // Intentionally not rethrowing error here. // TODO: fix this
                messagesApi.popupError(
                    `<p>FPocketWeb threw an error, likely because it could not detect any pockets.</p><p>Error details: ${err.message}</p>`
                );
            });

        // debugger;

        // this.submitJobs(payloads); // , 10000);
    }

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @param {any[]} payloads  The user arguments to pass to the "executable."
     *                          Contains compound information.
     * @returns {Promise<any>}  A promise that resolves when the job is done.
     */
    async runJobInBrowser(payloads: any[]): Promise<any> {
        const protPath = (
            payloads[0].origProtTreeNode as TreeNode
        ).descriptions.pathName(":");

        // const ligPath = (
        //     payloads[0].origCmpdTreeNode as TreeNode
        // ).descriptions.pathName(":");

        const treeNodesPromises: Promise<TreeNode>[] = [];
        for (const payload of payloads) {
            const pdbqtOuts = payload.output;

            // Split on lines that start with "MODEL"
            let pdbqtOutsSeparate = pdbqtOuts.split(/\n(?=MODEL)/);

            if (payload.keepOnlyBest) {
                pdbqtOutsSeparate = [pdbqtOutsSeparate[0]];
            }

            for (const pdbqtOut of pdbqtOutsSeparate) {
                const pdbqtOutLines = pdbqtOut.split("\n");

                const model = pdbqtOutLines[0].trim();

                const data: { [key: string]: ITreeNodeData } = {};
                let scoreLabel = "";

                if (payload.scoreOnly) {
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

                    console.log(payload.stdOut);

                    const extractEnergy = (pattern: RegExp): number => {
                        const match = payload.stdOut.match(pattern);
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
                            // "Intermolecular (kcal/mol)":
                            //     finalIntermolecularEnergy,
                            // "Internal (kcal/mol)": finalTotalInternalEnergy,
                            // "Torsional (kcal/mol)": torsionalFreeEnergy,
                            // "Unbound System (kcal/mol)": unboundSystemsEnergy,
                        },
                        type: TreeNodeDataType.Table,
                        treeNodeId: "", // Fill in later
                    };
                } else {
                    scoreLabel = "Webina Docking Scores: " + protPath;
                    data[scoreLabel] = {
                        data: {
                            "Score (kcal/mol)": parseFloat(
                                pdbqtOutLines
                                    .find((line: string) =>
                                        line.startsWith("REMARK VINA")
                                    )
                                    .split(/\s+/)[3]
                            ),
                        },
                        type: TreeNodeDataType.Table,
                        treeNodeId: "", // Fill in later
                    };
                }

                // Create fileinfo
                const modelName = payload.keepOnlyBest
                    ? ""
                    : `:${model.replace("MODEL", "model").replace(" ", "")}`;
                const fileInfo = new FileInfo({
                    name: payload.origCmpdTreeNode.title + modelName + ".pdbqt",
                    contents: pdbqtOut,
                });

                const treeNodePromise = TreeNode.loadFromFileInfo(fileInfo)
                    .then((treeNode: TreeNode | void) => {
                        if (!treeNode) {
                            throw new Error(
                                "Could not load file into tree node."
                            );
                        }

                        // This has been loaded hierarchically. So the one
                        // terminal node is the actual TreeNode.
                        let terminalTreeNode = treeNode.nodes?.terminals.get(0);

                        if (terminalTreeNode) {
                            terminalTreeNode.src = payload.origCmpdTreeNode.src;
                            terminalTreeNode.data = data;
                            terminalTreeNode.data[scoreLabel].treeNodeId =
                                terminalTreeNode.id;
                            terminalTreeNode.title =
                                payload.origCmpdTreeNode.title;
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

                treeNodesPromises.push(treeNodePromise);
            }
        }

        return Promise.all(treeNodesPromises)
            .then((dockedTreeNodes: TreeNode[]) => {
                const initialCompoundsVisible = getSetting(
                    "initialCompoundsVisible"
                );

                // Only first 5 are visible
                for (let i = 0; i < dockedTreeNodes.length; i++) {
                    const dockedTreeNode = dockedTreeNodes[i];
                    dockedTreeNode.visible = i < initialCompoundsVisible;
                }

                // Get the top title of the protein. Because things have been
                // organized by proteins, all these will be the same, so first
                // one is as good as any.
                const protTreeNode = payloads[0].origProtTreeNode as TreeNode;
                const title = protTreeNode.getAncestry().get(0).title;

                const rootNode =
                    TreeNode.loadHierarchicallyFromTreeNodes(dockedTreeNodes);

                rootNode.title = `${title}:docking`;

                rootNode.addToMainTree();

                return dockedTreeNodes;
            })
            .catch((err: Error) => {
                debugger;
                throw err;
            });
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest}  The selenium test commands.
     */
    getTezts(): ITest {
        return {
            beforePluginOpens: new TestCmdList().loadExampleProtein().cmds,
            afterPluginCloses: new TestCmdList()
                .waitUntilRegex("#navigator", "PocketBox1")
                .wait(5).cmds,
        };
    }
}
</script>

<style scoped lang="scss"></style>
