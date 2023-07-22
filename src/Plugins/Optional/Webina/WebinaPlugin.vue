<template>
    <PluginComponent
        :userArgs="userArgs"
        v-model="open"
        title="Small-Molecule Docking"
        :intro="intro"
        @onPopupDone="onPopupDone"
        :pluginId="pluginId"
        actionBtnTxt="Dock"
    >
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
} from "@/Plugins/PluginInterfaces";
import {
    FormElement,
    FormElemType,
    IFormAlert,
    IFormCheckbox,
    IFormGroup,
    IFormMoleculeInputParams,
    IFormNumber,
    IFormSelectRegion,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
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
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import {
    ITreeNodeData,
    SelectedType,
    TreeNodeDataType,
    TreeNodeType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";

/**
 * WebinaPlugin
 */
@Options({
    components: {
        PluginComponent,
        Alert,
    },
})
export default class WebinaPlugin extends PluginParentClass {
    menuPath = "[6] Docking/Webina";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Jacob D. Durrant",
            url: "http://durrantlab.com/",
        },
    ];
    pluginId = "webina";

    intro = `Predict the geometry (pose) and strength (affinity) of small-molecule binding. Uses a version of AutoDock Vina (Webina).`;

    // msgOnJobsFinished =
    //     "Finished detecting pockets. Each protein's top six pockets are displayed in the molecular viewer. You can toggle the visibility of the other pockets using the Navigator panel. The Data panel includes additional information about the detected pockets.";

    userArgs: FormElement[] = [
        {
            type: FormElemType.MoleculeInputParams,
            id: "makemolinputparams",
            val: new MoleculeInput({
                considerCompounds: true,
                considerProteins: true,
                proteinFormat: "pdbqt",
                compoundFormat: "pdbqtlig", // Will include torsions
                includeMetalsSolventAsProtein: false,
            } as IMoleculeInputParams),
        } as IFormMoleculeInputParams,
        {
            id: "region",
            // label: "Region test",
            val: null, // To use default
            type: FormElemType.SelectRegion,
            regionName: "Docking Box",
        } as IFormSelectRegion,
        {
            id: "cpu",
            type: FormElemType.Number,
            label: "Number of processors",
            val: 1,
            filterFunc: (val: number) => {
                return Math.round(val);
            },
            description:
                "If performing multiple dockings, use 1. Otherwise, consider more.",
        } as IFormNumber,
        {
            id: "exhaustiveness",
            type: FormElemType.Number,
            label: "Exhaustiveness",
            val: 8,
            filterFunc: (val: number) => {
                return Math.round(val);
            },
            description:
                "How thoroughly to search for the pose. Roughly proportional to time.",
        } as IFormNumber,
        {
            id: "score_only",
            type: FormElemType.Checkbox,
            label: "Score only",
            val: false,
            description:
                "Scores the existing pose, without repositioning the compound.",
        } as IFormCheckbox,
        {
            id: "keep_only_best",
            type: FormElemType.Checkbox,
            label: "Keep only best",
            val: true,
            description: "Keep only the best predicted pose for each compound.",
        } as IFormCheckbox,
        {
            id: "webinaAdvancedParams",
            type: FormElemType.Group,
            label: "Advanced docking parameters",
            childElements: [
                {
                    id: "warning",
                    type: FormElemType.Alert,
                    description:
                        "Unless you are an expert user, these advanced parameters are best left unmodified.",
                    alertType: "warning",
                } as IFormAlert,
                {
                    id: "seed",
                    type: FormElemType.Number,
                    label: "Random seed",
                    val: 1,
                    filterFunc: (val: number) => {
                        return Math.round(val);
                    },
                    description:
                        "The explicit random seed. Useful if reproducibility is critical.",
                } as IFormNumber,
                {
                    id: "num_modes",
                    type: FormElemType.Number,
                    label: "Number of modes",
                    val: 9,
                    filterFunc: (val: number) => {
                        return Math.round(val);
                    },
                    description: "The maximum number of binding poses to show.",
                } as IFormNumber,
                {
                    id: "energy_range",
                    type: FormElemType.Number,
                    label: "Energy range",
                    val: 3,
                    description:
                        "The maximum energy difference between the best and worst pose.",
                } as IFormNumber,
            ],
            startOpened: false,
        } as IFormGroup,
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
     * Runs when the user presses the action button and the popup closes.
     *
     * @param {IUserArg[]} userArgs  The user arguments.
     */
    onPopupDone(userArgs: IUserArg[]) {
        const filePairs: IProtCmpdTreeNodePair[] = this.getArg(
            userArgs,
            "makemolinputparams"
        );

        // Remove makemolinputparams from the arguments
        userArgs = userArgs.filter((arg) => arg.name !== "makemolinputparams");

        // Prepare Webina parameters
        const webinaParams: { [key: string]: any } = {};
        userArgs.forEach((arg: IUserArg) => {
            webinaParams[arg.name] = arg.val;
        });
        const region = webinaParams["region"];
        delete webinaParams["region"];
        webinaParams["center_x"] = region.center[0];
        webinaParams["center_y"] = region.center[1];
        webinaParams["center_z"] = region.center[2];
        webinaParams["size_x"] = region.dimensions[0];
        webinaParams["size_y"] = region.dimensions[1];
        webinaParams["size_z"] = region.dimensions[2];
        webinaParams["receptor"] = "/receptor.pdbqt";
        webinaParams["ligand"] = "/ligand.pdbqt";
        webinaParams["out"] = "/output.pdbqt";

        // keep_only_best isn't an actual webina parameter.
        const keepOnlyBest = webinaParams["keep_only_best"];
        if (webinaParams["keep_only_best"]) {
            delete webinaParams["keep_only_best"];
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
                keepOnlyBest: userArgs.filter(
                    (u) => u.name === "keep_only_best"
                )[0].val,
            };
        });

        new WebinaQueue("webina", payloads, webinaParams["cpu"]).done
            .then((webinaOuts: any) => {
                // TODO: Get any stdErr and show errors if they exist.

                // Add keep_only_best and output filename basename to the output
                webinaOuts.forEach((webinaOut: any, i: number) => {
                    webinaOut.keepOnlyBest = keepOnlyBest;
                    webinaOut.origProtTreeNode = origAssociatedTreeNodes[i][0];
                    webinaOut.origCmpdTreeNode = origAssociatedTreeNodes[i][1];
                });

                this.submitJobs([webinaOuts]);
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
     * @param {any[]} payloads     The user arguments to pass to the "executable."
     *                          Contains compound information.
     * @returns {Promise<any>}  A promise that resolves when the job is done.
     */
    async runJobInBrowser(payloads: any[]): Promise<any> {
        const protPath = (
            payloads[0].origProtTreeNode as TreeNode
        ).descriptions.pathName(":");
        const ligPath = (
            payloads[0].origCmpdTreeNode as TreeNode
        ).descriptions.pathName(":");

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
                const scoreLabel = "Docking Scores: " + protPath;
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

                        treeNode.src = payload.origCmpdTreeNode.src;
                        treeNode.data = data;
                        treeNode.data[scoreLabel].treeNodeId = treeNode.id;

                        return treeNode;
                    })
                    .catch((err: Error) => {
                        // TODO: FIX
                        throw err;
                        // messagesApi.popupError(
                        // `<p>FPocketWeb threw an error, likely because it could not detect any pockets.</p><p>Error details: ${err.message}</p>`
                        // );
                    });

                treeNodesPromises.push(treeNodePromise);

                // this.$store.commit("pushToMolecules", outPdbFileTreeNode);

                // debugger;
            }
        }

        return Promise.all(treeNodesPromises)
            .then((dockedTreeNodes: TreeNode[]) => {
                const initialCompoundsVisible = getSetting("initialCompoundsVisible")

                // Only first 5 are visible
                for (let i = 0; i < dockedTreeNodes.length; i++) {
                    const dockedTreeNode = dockedTreeNodes[i];
                    dockedTreeNode.visible = i < initialCompoundsVisible;
                }

                const compoundTreeNodeList = new TreeNodeList([
                    new TreeNode({
                        title: "Compounds",
                        nodes: new TreeNodeList(dockedTreeNodes),
                        treeExpanded: true,
                        visible: true,
                        selected: SelectedType.ChildOfTrue,
                        focused: true,
                        viewerDirty: true,
                        type: TreeNodeType.Compound,
                    }),
                ]);

                // Create a new TreeNodeList
                const mainTreeNode = new TreeNode({
                    title: `Docked: ${protPath}, ${ligPath}`,
                    nodes: compoundTreeNodeList,
                    treeExpanded: true,
                    visible: true,
                    selected: SelectedType.True,
                    focused: true,
                    viewerDirty: true,
                });

                mainTreeNode.addToMainTree();

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
    getTests(): ITest {
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
