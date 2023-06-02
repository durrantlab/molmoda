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
import { runWorker } from "@/Core/WebWorkers/RunWorker";
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
import { convertFileInfosOpenBabel } from "@/FileSystem/OpenBabel/OpenBabel";

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

    intro = `This plugin uses a version of AutoDock Vina (Webina) to predict (1) the geometry of small-molecule binding (pose), and (2) the strength of binding (score).`;

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
            label: "Number of CPUs",
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
            label: "Score Only",
            val: false,
            description:
                "Scores the existing pose, without repositioning the compound.",
        } as IFormCheckbox,
        {
            id: "webinaAdvancedParams",
            type: FormElemType.Group,
            label: "Advanced Docking Parameters",
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
                    label: "Random Seed",
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
                    label: "Number of Modes",
                    val: 9,
                    filterFunc: (val: number) => {
                        return Math.round(val);
                    },
                    description: "The maximum number of binding poses to show.",
                } as IFormNumber,
                {
                    id: "energy_range",
                    type: FormElemType.Number,
                    label: "Energy Range",
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

        const payloads: any = filePairs.map((filePair) => {
            filePair.prot.name = "/receptor.pdbqt";
            filePair.cmpd.name = "/ligand.pdbqt";
            return {
                pdbFiles: filePair,
                webinaParams: webinaParams,
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
        return new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return import("../../../../public/js/webina/vina.js") // TODO: chucks
                .then((mod: any) => {
                    const WEBINA_MODULE = mod.default;
                    const startTime = performance.now();
                    let std = "";
                    let stdOut = "";
                    let stdErr = "";
                    const ligandPDBQT = payload.pdbFiles.cmpd.contents;
                    const receptorPDBQT = payload.pdbFiles.prot.contents;

                    // https://emscripten.org/docs/api_reference/module.html

                    return WEBINA_MODULE({
                        noInitialRun: true,

                        // stderr will log when any file is read.
                        logReadFiles: true,

                        // onRuntimeInitialized() { console.log("Runtime initialized"); },

                        // preInit() { console.log("Pre-init"); },

                        preRun: [
                            (mod: any) => {
                                // Save the contents of the files to the virtual
                                // file system
                                mod.FS.writeFile(
                                    "/receptor.pdbqt",
                                    receptorPDBQT
                                );
                                mod.FS.writeFile("/ligand.pdbqt", ligandPDBQT);
                            },
                        ],

                        locateFile(path: string) {
                            // This is where the emscripten compiled files are
                            // located
                            return `./js/webina/` + path;
                        },

                        onExit(/* code */) {
                            // Read the contents of the output file
                            const output = (this as any).FS.readFile(
                                "/output.pdbqt",
                                {
                                    encoding: "utf8",
                                }
                            );

                            // Resolve the promise with the output
                            resolve({
                                std: std.trim(),
                                stdOut: stdOut.trim(),
                                stdErr: stdErr.trim(),
                                output: output,
                                time: performance.now() - startTime,
                            });
                        },

                        // Monitor stdout and stderr output
                        print(text: string) {
                            console.log(text);
                            stdOut += text + "\n";
                            std += text + "\n";
                        },

                        printErr(text: string) {
                            console.log(text);
                            stdErr += text + "\n";
                            std += text + "\n";
                        },
                    });
                })

                .then((instance: any) => {
                    // Probably not needed, but just in case
                    return instance.ready;
                })
                .then((instance: any) => {
                    const argsList = [];
                    for (const key in payload.webinaParams) {
                        const val = payload.webinaParams[key];
                        if ([true, "true"].indexOf(val) !== -1) {
                            argsList.push(`--${key}`);
                        } else if ([false, "false"].indexOf(val) !== -1) {
                            // do nothing
                        } else {
                            argsList.push(`--${key}`);
                            argsList.push(val.toString());
                        }
                    }

                    return instance.callMain(argsList);
                });
        })
        .then((resp: any) => {
            debugger;
            return resp;
        })
        .catch((err) => {
            console.error(err);
            throw err;
        });

        // const pdbFiles = payload.pdbFiles as IProtCmpdTreeNodePair;
        // const userArgs = payload.webinaParams;

        // const pdbFilesSerialized = {
        //     prot: pdbFiles.prot.serialize(),
        //     cmpd: pdbFiles.cmpd.serialize(),
        // };

        // // remove treeNodes (not serialized)
        // delete pdbFilesSerialized.prot.treeNode;
        // delete pdbFilesSerialized.cmpd.treeNode;

        // const worker = new Worker(new URL("./Webina.worker", import.meta.url));

        // return runWorker(worker, {
        //     pdbFiles: pdbFilesSerialized,
        //     // pdbContents: pdbFiles.contents,
        //     userArgs,
        // })
        //     .then((payload: any) => {
        //         debugger;
        //         if (payload.error) {
        //             throw new Error(payload.error);
        //         }
        //         // const outPdbFileTxt = payload.outPdbFileTxt;
        //         // const stdOut = payload.stdOut;
        //         const stdErr = payload.stdErr;
        //         const pocketProps = payload.pocketProps;

        //         if (stdErr !== "") {
        //             console.warn(stdErr);
        //         }
        //         const promises = [
        //             // TreeNode.loadFromFileInfo(
        //             //     new FileInfo({
        //             //         name: "Pockets:" + pdbFiles.name,
        //             //         contents: outPdbFileTxt,
        //             //     })
        //             // ),
        //             Promise.resolve(pocketProps),
        //         ];

        //         return Promise.all(promises);
        //     })
        //     .then((payload: any[]) => {
        //         const outPdbFileTreeNode = payload[0] as TreeNode | void;
        //         const pocketProps = payload[1] as any[];

        //         if (outPdbFileTreeNode === undefined) {
        //             return;
        //         }

        //         const numInitiallyVisible = 5;

        //         // Update the compounds (names, style)
        //         let firstNodeId = "";
        //         const boxes: IBox[] = [];

        //         // Make everything visible to start.
        //         outPdbFileTreeNode.visible = true;

        //         if (outPdbFileTreeNode.nodes) {
        //             outPdbFileTreeNode.nodes
        //                 .lookup([TreeNodeType.Compound, "*", "*"])
        //                 ?.forEach((node: TreeNode, idx: number) => {
        //                     // Should be surface
        //                     node.styles = [
        //                         {
        //                             surface: {
        //                                 color: randomPastelColor(),
        //                                 opacity: 0.9,
        //                             } as IColorStyle,
        //                         } as IStyle,
        //                     ];

        //                     // Rename it too
        //                     node.title = "Pocket" + (idx + 1);

        //                     // Hide unless it's the first few ones.
        //                     if (idx >= numInitiallyVisible) {
        //                         node.visible = false;
        //                     }

        //                     // Add the pocket properties as data.
        //                     node.data = {
        //                         "FPocketWeb Properties": {
        //                             data: pocketProps[idx],
        //                             type: TreeNodeDataType.Table,
        //                             treeNodeId: node.id,
        //                         } as ITreeNodeData,
        //                     };

        //                     boxes.push(node.getBoxRegion());

        //                     if (idx === 0) {
        //                         firstNodeId = node.id as string;
        //                     }
        //                 });

        //             // Update the compound chain name.
        //             const pockets = outPdbFileTreeNode.nodes
        //                 .lookup(TreeNodeType.Compound)
        //                 .get(0);
        //             pockets.title = "Pockets";
        //             if (pockets.nodes) {
        //                 pockets.nodes.get(0).title = "P";
        //             }

        //             // Hide the protein, since it's probably also in another
        //             // molecule.
        //             outPdbFileTreeNode.nodes
        //                 .lookup(TreeNodeType.Protein)
        //                 .flattened.forEach((node: TreeNode) => {
        //                     node.visible = false;
        //                 });

        //             // Add the region list. Create the region list node.
        //             const regionList = new TreeNodeList();
        //             for (let i = 0; i < boxes.length; i++) {
        //                 const box = boxes[i];
        //                 box.opacity = 0.9;
        //                 const newNode = new TreeNode({
        //                     title: "PocketBox" + (i + 1).toString(),
        //                     type: TreeNodeType.Region,
        //                     region: box,
        //                     treeExpanded: false,
        //                     visible: i < numInitiallyVisible,
        //                     selected: SelectedType.False,
        //                     focused: false,
        //                     viewerDirty: true,
        //                 });
        //                 regionList.push(newNode);
        //             }
        //             const regionNode = new TreeNode({
        //                 title: "S",
        //                 type: TreeNodeType.Region,
        //                 treeExpanded: true,
        //                 visible: true,
        //                 selected: SelectedType.False,
        //                 focused: false,
        //                 viewerDirty: true,
        //                 nodes: regionList,
        //             });

        //             const ps = outPdbFileTreeNode.nodes
        //                 .lookup(["Pockets"])
        //                 .get(0);
        //             if (ps.nodes) {
        //                 ps.nodes.push(regionNode);
        //             }
        //         }

        //         this.$store.commit("pushToMolecules", outPdbFileTreeNode);

        //         this.$nextTick(() => {
        //             selectProgramatically(firstNodeId);
        //         });
        //         return;
        //     })
        //     .catch((err: Error) => {
        //         // Intentionally not rethrowing error here.
        //         messagesApi.popupError(
        //             `<p>FPocketWeb threw an error, likely because it could not detect any pockets.</p><p>Error details: ${err.message}</p>`
        //         );
        //     });
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
