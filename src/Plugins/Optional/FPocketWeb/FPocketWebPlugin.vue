<template>
    <PluginComponent
        :userArgs="userArgs"
        v-model="open"
        title="Pocket Detection"
        :intro="intro"
        @onPopupDone="onPopupDone"
        :pluginId="pluginId"
        actionBtnTxt="Detect"
    >
    </PluginComponent>
</template>

<script lang="ts">
import { FileInfo } from "@/FileSystem/FileInfo";
import { checkProteinLoaded } from "@/Plugins/Core/CheckUseAllowedUtils";
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
    IFormSelect,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import Alert from "@/UI/Layout/Alert.vue";
import { Options } from "vue-class-component";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import {
    IColorStyle,
    ITreeNodeData,
    IStyle,
    TreeNodeDataType,
    TreeNodeType,
    // IBox,
    SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { randomPastelColor } from "@/UI/Panels/Options/Styles/ColorSelect/ColorConverter";
import { messagesApi } from "@/Api/Messages";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { FPocketWebQueue } from "./FPocketWebQueue";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";

/**
 * FPocketWebPlugin
 */
@Options({
    components: {
        PluginComponent,
        Alert,
    },
})
export default class FPocketWebPlugin extends PluginParentClass {
    menuPath = "Proteins/Detect Pockets";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Jacob D. Durrant",
            url: "http://durrantlab.com/",
        },
    ];
    pluginId = "fpocketweb";

    intro = `(1) Identify small-molecule binding pockets on protein surfaces and (2) calculate pocket properties using the fpocket algorithm (FPocketWeb).`;

    msgOnJobsFinished =
        "Finished detecting pockets. Each protein's top six pockets are displayed in the molecular viewer. You can toggle the visibility of the other pockets using the Navigator panel. The Data panel includes additional information about the detected pockets.";

    userArgs: FormElement[] = [
        {
            // type: FormElemType.MoleculeInputParams,
            id: "makemolinputparams",
            val: new MoleculeInput({
                considerCompounds: false,
                considerProteins: true,
                proteinFormat: "pdb",
            }),
        } as IFormMoleculeInputParams,
        {
            id: "providePseudoAtoms",
            type: FormElemType.Checkbox,
            label: "Provide pocket-filling pseudo atoms for visualization.",
            val: false,
        } as IFormCheckbox,
        {
            id: "pocketDetectionParams",
            type: FormElemType.Group,
            label: "Optional Pocket Detection Parameters",
            childElements: [
                {
                    id: "warning",
                    type: FormElemType.Alert,
                    description:
                        "Unless you are an expert user, these advanced parameters are best left unmodified.",
                    alertType: "warning",
                } as IFormAlert,
                {
                    id: "min_alpha_size",
                    type: FormElemType.Number,
                    label: "Minimum radius of an alpha-sphere.",
                    val: 3.4,
                } as IFormNumber,

                {
                    id: "max_alpha_size",
                    type: FormElemType.Number,
                    label: "Maximum radius of an alpha-sphere.",
                    val: 6.2,
                } as IFormNumber,

                {
                    id: "clustering_distance",
                    type: FormElemType.Number,
                    label: "Distance threshold for clustering algorithm.",
                    val: 2.4,
                } as IFormNumber,

                {
                    id: "clustering_method",
                    type: FormElemType.Select,
                    label: "Clustering method for grouping voronoi vertices.",
                    options: [
                        {
                            description: "s : single linkage clustering",
                            val: "s",
                        },
                        {
                            description: "m : complete linkage clustering",
                            val: "m",
                        },
                        {
                            description: "a : average linkage clustering",
                            val: "a",
                        },
                    ],
                    val: "s",
                } as IFormSelect,

                {
                    id: "clustering_measure",
                    type: FormElemType.Select,
                    label: "Distance measure for clustering.",
                    options: [
                        { description: "e : euclidean distance", val: "e" },
                        { description: "b : Manhattan distance", val: "b" },
                    ],
                    val: "e",
                } as IFormSelect,

                {
                    id: "min_spheres_per_pocket",
                    type: FormElemType.Number,
                    label: "Minimum number of a-sphere per pocket.",
                    val: 15,
                } as IFormNumber,

                {
                    id: "ratio_apol_spheres_pocket",
                    type: FormElemType.Number,
                    label: "Minimum proportion of apolar sphere in a pocket (remove otherwise)",
                    val: 0.0,
                } as IFormNumber,

                {
                    id: "number_apol_asph_pocket",
                    type: FormElemType.Number,
                    label: "Minimum number of apolar neighbor for an a-sphere to be considered as apolar.",
                    val: 3,
                } as IFormNumber,

                {
                    id: "iterations_volume_mc",
                    type: FormElemType.Number,
                    label: "Number of Monte-Carlo iterations for calculating each pocket volume.",
                    val: 300,
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
        return checkProteinLoaded();
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     *
     * @param {IUserArg[]} userArgs  The user arguments.
     */
    onPopupDone(userArgs: IUserArg[]) {
        const pdbFiles: FileInfo[] = this.getArg(
            userArgs,
            "makemolinputparams"
        );

        const userArgsNotFpocketArgs = [
            "providePseudoAtoms",
            "makemolinputparams",
        ];

        // Convert to IFpocketParams format
        const fpocketParams: { [key: string]: any } = {}; // IFpocketParams
        userArgs.forEach((arg) => {
            if (userArgsNotFpocketArgs.indexOf(arg.name) === -1) {
                fpocketParams[arg.name] = arg.val;
            }
        });

        // Combine into payloads
        const payloads: any[] = pdbFiles.map((pdbFile) => {
            return {
                pdbFile,
                fpocketParams,
            };
        });

        new FPocketWebQueue("fpocket", payloads, 1).done
            .then((fpocketOuts: any) => {
                // Add the original name and whether to return points too. NOTE:
                // This is per protein.
                fpocketOuts.forEach((fpocketOut: any, i: number) => {
                    fpocketOut.origFileName = pdbFiles[i].name;
                    fpocketOut.label =
                        pdbFiles[i].treeNode?.descriptions.pathName(":");
                    fpocketOut.providePseudoAtoms = userArgs.filter(
                        (u) => u.name === "providePseudoAtoms"
                    )[0].val;
                });

                this.submitJobs(fpocketOuts);
                return;
            })
            .catch((err: Error) => {
                // Intentionally not rethrowing error here.
                messagesApi.popupError(
                    `<p>FPocketWeb threw an error, likely because it could not detect any pockets.</p><p>Error details: ${err.message}</p>`
                );
            });
    }

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @param {any} payload     The user arguments to pass to the "executable."
     *                          Contains compound information.
     * @returns {Promise<any>}  A promise that resolves when the job is done.
     */
    runJobInBrowser(payload: any): Promise<any> {
        if (payload.stdErr !== "") {
            throw new Error(payload.stdErr);
        }

        const outPdbFileTxt = payload.outPdbFileTxt;
        // const stdOut = payload.stdOut;
        const stdErr = payload.stdErr;
        const pocketProps = payload.pocketProps;
        const providePseudoAtoms = payload.providePseudoAtoms;

        if (stdErr !== "") {
            console.warn(stdErr);
        }
        const promises = [
            TreeNode.loadFromFileInfo(
                new FileInfo({
                    name: payload.origFileName,
                    contents: outPdbFileTxt,
                })
            ),
            Promise.resolve(pocketProps),
        ];

        return Promise.all(promises).then((payload2: any[]) => {
            const outPdbFileTreeNode = payload2[0] as TreeNode | void;
            const pocketProps = payload2[1] as any[];

            if (outPdbFileTreeNode === undefined) {
                return;
            }

            outPdbFileTreeNode.title = "Pockets: " + payload.label;

            const numInitiallyVisible = 5;

            // Update the compounds (names, style)
            // let firstNodeId = "";

            // Make everything visible to start.
            outPdbFileTreeNode.visible = true;

            if (outPdbFileTreeNode.nodes) {
                this._addBoxes(outPdbFileTreeNode, pocketProps);

                this._processPocketPseudoAtoms(
                    outPdbFileTreeNode,
                    providePseudoAtoms
                );

                // Title "Compounds"
                const compoundsNode = outPdbFileTreeNode.nodes
                    .lookup([TreeNodeType.Compound])
                    .get(0);
                compoundsNode.title = "Pockets";
                // compoundsNode.visible = true;

                // Hide anything that isn't Pockets, since it's probably also in
                // another molecule.
                for (const node of outPdbFileTreeNode.nodes._nodes) {
                    if (node.title !== "Pockets") {
                        node.visible = false;
                    }
                    // else {
                    //     firstNodeId = node.id as string;
                    // }
                }
            }

            // Remove protein
            outPdbFileTreeNode.nodes = outPdbFileTreeNode.nodes?.filter(
                (treeNode) => treeNode.type !== TreeNodeType.Protein
            );

            outPdbFileTreeNode.addToMainTree();

            // this.$store.commit("pushToMolecules", outPdbFileTreeNode);

            // this.$nextTick(() => {
            //     selectProgramatically(firstNodeId);
            // });
            return;
        });
    }

    /**
     * Adds boxes surrounding the pockets to the tree.
     *
     * @param {TreeNode} outPdbFileTreeNode    The tree node to add the boxes to.
     * @param {any[]} pocketProps              The properties of the pockets.
     */
    _addBoxes(outPdbFileTreeNode: TreeNode, pocketProps: any[]) {
        const numInitiallyVisible = getSetting("initialCompoundsVisible");
        const pseudoAtomNodes = outPdbFileTreeNode.nodes?.lookup([
            TreeNodeType.Compound,
            "*",
            "*",
        ]);

        // Get the pocket-box regions and properties
        const shapesNode = new TreeNode({
            title: "Pocket Boxes",
            type: TreeNodeType.Region,
            treeExpanded: true,
            visible: true,
            selected: SelectedType.False,
            focused: false,
            viewerDirty: true,
            nodes: new TreeNodeList(),
        });

        pseudoAtomNodes?.forEach((node: TreeNode, idx: number) => {
            const box = node.getBoxRegion();
            box.opacity = 0.9;
            box.color = randomPastelColor();
            const newNode = new TreeNode({
                title: "Pocket" + (idx + 1).toString() + "Box",
                type: TreeNodeType.Region,
                region: box,
                treeExpanded: false,
                visible: idx < numInitiallyVisible,
                selected: SelectedType.False,
                focused: false,
                viewerDirty: true,
                data: {
                    "FPocketWeb Properties": {
                        data: pocketProps[idx],
                        type: TreeNodeDataType.Table,
                        treeNodeId: node.id,
                    } as ITreeNodeData,
                },
            });
            shapesNode.nodes?.push(newNode);
        });

        const ps = outPdbFileTreeNode.nodes
            ?.lookup(TreeNodeType.Compound)
            .get(0);
        if (ps && ps.nodes) {
            // Insert at top
            ps.nodes._nodes.splice(0, 0, shapesNode);
        }

        // return pseudoAtomNodes;
    }

    /**
     * Processes the pseudo atoms in the tree.
     *
     * @param {TreeNode} outPdbFileTreeNode    The tree node to process.
     * @param {boolean} providePseudoAtoms     Whether to provide pseudo atoms.
     */
    _processPocketPseudoAtoms(
        outPdbFileTreeNode: TreeNode,
        providePseudoAtoms: boolean
    ) {
        if (outPdbFileTreeNode.nodes === undefined) {
            return;
        }

        const numInitiallyVisible = getSetting("initialCompoundsVisible");

        // Get the index of the node with type compound
        const compoundNodeIdx = outPdbFileTreeNode.nodes._nodes.findIndex(
            (node: TreeNode) => node.type === TreeNodeType.Compound
        );

        if (!providePseudoAtoms) {
            // Remove it
            // debugger;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore  // TODO: Fix this
            outPdbFileTreeNode.nodes._nodes[compoundNodeIdx].nodes._nodes =
                outPdbFileTreeNode.nodes._nodes[
                    compoundNodeIdx
                ].nodes?._nodes.slice(0, -1);

            return;
        }

        // Title "Compounds"
        const pseudoAtomNodeTree =
            outPdbFileTreeNode.nodes._nodes[compoundNodeIdx];

        if (!pseudoAtomNodeTree) {
            return;
        }

        if (!pseudoAtomNodeTree.nodes) {
            return;
        }

        pseudoAtomNodeTree.nodes.get(1).title = "Pocket Pseudo Atoms";

        // eslint-disable-next-line sonarjs/no-empty-collection
        pseudoAtomNodeTree.nodes
            .get(1)
            .nodes?.forEach((node: TreeNode, idx: number) => {
                // Should be surface
                node.styles = [
                    {
                        surface: {
                            color: randomPastelColor(),
                            opacity: 0.9,
                        } as IColorStyle,
                    } as IStyle,
                ];

                // Rename it too. TODO: This should be the region...
                node.title = "PocketPseudoAtoms" + (idx + 1);

                // Hide unless it's the first few ones.
                if (idx >= numInitiallyVisible) {
                    node.visible = false;
                }
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
