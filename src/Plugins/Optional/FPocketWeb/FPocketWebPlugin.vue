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
        <!-- <template #afterForm>
      <Alert type="info"
        >Once calculated, the molecular properties will appear in the Data tab{{
          tableNames
        }}</Alert
      >
    </template> -->
    </PluginComponent>
</template>

<script lang="ts">
import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { FileInfo } from "@/FileSystem/FileInfo";
import { checkAnyMolLoaded } from "@/Plugins/Core/CheckUseAllowedUtils";
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
    MolType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { randomPastelColor } from "@/UI/Panels/Options/Styles/ColorSelect/ColorConverter";
import { selectProgramatically } from "@/UI/Navigation/TitleBar/MolSelecting";
import { IFpocketParams } from "./FPocketWebTypes";
import { messagesApi } from "@/Api/Messages";

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
    menuPath = "Test/FPocketWeb";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Jacob D. Durrant",
            url: "http://durrantlab.com/",
        },
    ];
    pluginId = "fpocketweb";

    intro = `This plugin identifies small-molecule compounds and calculates their molecular properties.`;

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
        // {
        //     id: "outputParams",
        //     type: FormElemType.Group,
        //     label: "Optional Output Parameters",
        //     childElements: [
        //         {
        //             // Struggled to figure out what exactly this does in
        //             // fpocket documentaiton. I vote for disabling.
        //             id: "calculate_interaction_grids",
        //             type: FormElemType.Checkbox,
        //             label: "Calculate VdW and Coulomb grids for each pocket",
        //             val: false,
        //         } as IFormCheckbox,
        //         {
        //             // Not necessary for use in browser
        //             id: "pocket_descr_stdout",
        //             type: FormElemType.Checkbox,
        //             label: "Write fpocket descriptors to the standard output",
        //             val: false,
        //         } as IFormCheckbox,
        //     ],
        //     startOpened: false,
        // } as IFormGroup,
        // {
        //     id: "inputParams",
        //     type: FormElemType.Group,
        //     label: "Optional Input Parameters",
        //     childElements: [
        //         {
        //             // Not necessary for in-browser use
        //             id: "model_number",
        //             type: FormElemType.Number,
        //             label: "Number of model to analyze",
        //             val: false,
        //         } as IFormCheckbox,
        //     ],
        //     startOpened: false,
        // } as IFormGroup,
        {
            id: "pocketDetectionParams",
            type: FormElemType.Group,
            label: "Optional Pocket Detection Parameters",
            childElements: [
                {
                    id: "warning",
                    type: FormElemType.Alert,
                    description: "Unless you are an expert user, these advanced parameters that are best left unmodified.",
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

    // /**
    //  * Get the names of the tables that will be created
    //  *
    //  * @returns {string} The names of the tables that will be created
    //  */
    // get tableNames(): string {
    //   // return `, in tables named "${lipinskiTitle}," "${countsTitle}," and "${otherTitle}."`;
    //   return "";
    // }

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
        // TODO: Should be protein only
        return checkAnyMolLoaded();
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     *
     * @param {IUserArg[]} userArgs  The user arguments.
     */
    onPopupDone(userArgs: IUserArg[]) {
        const pdbFiles: FileInfo[][] = this.getArg(
            userArgs,
            "makemolinputparams"
        );

        // Remove makemolinputparams from the arguments
        userArgs = userArgs.filter((arg) => arg.name !== "makemolinputparams");

        // Convert to IFpocketParams format
        const fpocketParams: { [key: string]: any } = {}; // IFpocketParams
        userArgs.forEach((arg) => {
            fpocketParams[arg.name] = arg.val;
        });

        // Combine into payloads
        const payloads: any[] = pdbFiles.map((pdbFile) => {
            return {
                pdbFile,
                fpocketParams,
            };
        });
        this.submitJobs(payloads); // , 10000);
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
        const pdbFile = payload.pdbFile as FileInfo;
        const userArgs = payload.fpocketParams as IFpocketParams;

        const worker = new Worker(
            new URL("./FPocketWeb.worker", import.meta.url)
        );

        return runWorker(worker, {
            pdbName: pdbFile.name,
            pdbContents: pdbFile.contents,
            userArgs,
        })
            .then((payload: any) => {
                if (payload.error) {
                    throw new Error(payload.error);
                }
                const outPdbFileTxt = payload.outPdbFileTxt;
                // const stdOut = payload.stdOut;
                const stdErr = payload.stdErr;
                const pocketProps = payload.pocketProps;

                if (stdErr !== "") {
                    console.warn(stdErr);
                }
                const promises = [
                    TreeNode.loadFromFileInfo(
                        new FileInfo({
                            name: "Pockets:" + pdbFile.name,
                            contents: outPdbFileTxt,
                        })
                    ),
                    Promise.resolve(pocketProps),
                ];

                return Promise.all(promises);
            })
            .then((payload: any[]) => {
                const outPdbFileTreeNode = payload[0] as TreeNode | void;
                const pocketProps = payload[1] as any[];

                if (outPdbFileTreeNode === undefined) {
                    return;
                }

                // Update the compounds (names, style)
                let firstNodeId = "";
                outPdbFileTreeNode.nodes
                    ?.lookup([MolType.Compound, "*", "*"])
                    ?.forEach((node: TreeNode, idx: number) => {
                        // Should be surface
                        node.styles = [
                            {
                                surface: {
                                    color: randomPastelColor(),
                                    opacity: 0.9,
                                } as IColorStyle,
                            } as IStyle,
                        ];

                        // Rename it too
                        node.title = "Pocket" + (idx + 1);

                        // Hide unless it's the first few ones.
                        if (idx > 5) {
                            node.visible = false;
                        }

                        // Add the pocket properties as data.
                        node.data = {
                            "FPocketWeb Properties": {
                                data: pocketProps[idx],
                                type: TreeNodeDataType.Table,
                                treeNode: node,
                            } as ITreeNodeData,
                        };

                        if (idx === 0) {
                            firstNodeId = node.id as string;
                        }
                    });

                if (outPdbFileTreeNode.nodes) {
                    // Update the compound chain name.
                    const pockets = outPdbFileTreeNode.nodes
                        .lookup(MolType.Compound)
                        .get(0);
                    pockets.title = "Pockets";
                    if (pockets.nodes) {
                        pockets.nodes.get(0).title = "P";
                    }

                    // Hide the protein, since it's probably also in another
                    // molecule.
                    outPdbFileTreeNode.nodes
                        .lookup(MolType.Protein)
                        .flattened.forEach((node: TreeNode) => {
                            node.visible = false;
                        });
                }

                this.$store.commit("pushToMolecules", outPdbFileTreeNode);

                this.$nextTick(() => {
                    selectProgramatically(firstNodeId);
                });
                return;
            })
            .catch((err: Error) => {
                // Intentionally not rethrowing error here.
                messagesApi.popupError(
                    `<p>FPocketWeb threw an error, likely because it could not detect any pockets.</p><p>Error details: ${err.message}</p>`
                );
            });
    }
}
</script>

<style scoped lang="scss"></style>
