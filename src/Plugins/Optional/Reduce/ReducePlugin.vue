<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onPopupDone="onPopupDone" actionBtnTxt="Protonate"
        @onUserArgChanged="onUserArgChanged" @onMolCountsChanged="onMolCountsChanged">
    </PluginComponent>
</template>

<script lang="ts">
import { FileInfo } from "@/FileSystem/FileInfo";
import { checkProteinLoaded } from "@/Plugins/CheckUseAllowedUtils";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import {
    UserArg,
    UserArgType,
    IUserArgMoleculeInputParams,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import {
    IMoleculeInputParams,
    MoleculeInput,
} from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import Alert from "@/UI/Layout/Alert.vue";
import { Options } from "vue-class-component";
import { ITest } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { messagesApi } from "@/Api/Messages";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { dynamicImports } from "@/Core/DynamicImports";
import { ReduceQueue } from "./ReduceQueue";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { loadHierarchicallyFromTreeNodes } from "@/UI/Navigation/TreeView/TreeUtils";
/**
 * ReducePlugin
 */
@Options({
    components: {
        PluginComponent,
        Alert,
    },
})
export default class ReducePlugin extends PluginParentClass {
    // Note _ will be removed from display text. Needed to distinguish from
    // Compounds/Protonate in menu ids.
    menuPath = "Proteins/Protonation_...";
    title = "Protonate/Deprotonate Proteins";
    softwareCredits: ISoftwareCredit[] = [dynamicImports.reduce.credit];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "reduce";
    tags = [Tag.Modeling, Tag.Docking];
    intro = `Protonate/deprotonate proteins, in preparation for docking.`;
    details = `This plugin uses the reduce program to guess at proper protonation states.`;

    // msgOnJobsFinished =
    //     "Finished detecting pockets. Each protein's top six pockets are displayed in the molecular viewer. You can toggle the visibility of the other pockets using the Navigator panel. The Data panel includes additional information about the detected pockets.";

    userArgDefaults: UserArg[] = [
        {
            type: UserArgType.MoleculeInputParams,
            id: "makemolinputparams",
            val: new MoleculeInput({
                considerCompounds: false,
                considerProteins: true,
                proteinFormat: "pdb",
                // compoundFormat: "pdbqtlig", // Will include torsions
                
                // Note that reduce can use waters in its calculations, but it
                // doesn't add hydrogens to them. This would confuse the user,
                // so let's just not include waters in the calculation.
                includeSolventAsProtein: false,
                allowUserToToggleIncludeSolventAsProtein: false,
                
                includeMetalsAsProtein: true,
                allowUserToToggleIncludeMetalsAsProtein: true,
            } as IMoleculeInputParams),
        } as IUserArgMoleculeInputParams,
    ];

    /**
     * Runs before the popup opens. Starts importing the modules needed for the
     * plugin.
     */
    async onBeforePopupOpen() {
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
     */
    async onPopupDone(): Promise<void> {
        const fileInfos: FileInfo[] = this.getUserArg("makemolinputparams");

        const distantAncestorTitles = fileInfos.map((f) => {
            if (!f.treeNode) {
                return undefined;
            }
            return f.treeNode.getAncestry().get(0).title;
        });

        const maxProcs = await getSetting("maxProcs");

        new ReduceQueue("reduce", fileInfos, maxProcs, undefined, 1).done
            .then((reduceOuts: any) => {
                // TODO: Get any stdErr and show errors if they exist.

                for (let i = 0; i < reduceOuts.length; i++) {
                    reduceOuts[i].title = distantAncestorTitles[i];
                }

                this.submitJobs([reduceOuts]);
                return;
            })
            .catch((err: Error) => {
                // Intentionally not rethrowing error here. // TODO: fix this
                messagesApi.popupError(
                    `<p>Reduce threw an error.</p><p>Error details: ${err.message}</p>`
                );
            });

        // this.submitJobs(payloads); // , 10000);
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
        const pdbOuts = payloads.map((payload) => payload.output);

        debugger

        // Make fileInfos
        const fileInfos = pdbOuts.map((pdbOut) => {
            return new FileInfo({
                name: "TMP.pdb",
                contents: pdbOut,
            });
        });

        // Convert to tree nodes
        const treeNodesPromises: Promise<TreeNode>[] = fileInfos.map(
            (fileInfo) => {
                return TreeNode.loadFromFileInfo({
                    fileInfo,
                    tag: this.pluginId,
                })
                    .then((treeNode: TreeNode | void) => {
                        if (!treeNode) {
                            throw new Error(
                                "Could not load file into tree node."
                            );
                        }

                        // treeNode.src = payload.origCmpdTreeNode.src;
                        // treeNode.data = data;
                        // treeNode.data[scoreLabel].treeNodeId = treeNode.id;

                        return treeNode;
                    })
                    .catch((err: Error) => {
                        // TODO: FIX
                        throw err;
                        // messagesApi.popupError(
                        // `<p>FPocketWeb threw an error, likely because it could not detect any pockets.</p><p>Error details: ${err.message}</p>`
                        // );
                    });
            }
        );

        const protProtonatedTreeNodes = (await Promise.all(
            treeNodesPromises
        )) as TreeNode[];
        const initialCompoundsVisible = await getSetting(
            "initialCompoundsVisible"
        );

        // Only first 5 are visible
        for (let i = 0; i < protProtonatedTreeNodes.length; i++) {
            const protProtonatedTreeNode = protProtonatedTreeNodes[i];
            protProtonatedTreeNode.visible = i < initialCompoundsVisible;
            const treeNode = loadHierarchicallyFromTreeNodes(
                [protProtonatedTreeNode],
                payloads[i].title + ":protonated"
            );
            treeNode.addToMainTree(this.pluginId);
        }

        // const treeNode = TreeNode.loadHierarchicallyFromTreeNodes(protProtonatedTreeNodes);

        // treeNode.title = "Moose";

        // treeNode.addToMainTree();

        // return protProtonatedTreeNodes;
        return;
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest}  The selenium test commands.
     */
    async getTests(): Promise<ITest> {
        return {
            beforePluginOpens: () => new TestCmdList().loadExampleMolecule(),
            afterPluginCloses: () => new TestCmdList().waitUntilRegex(
                "#navigator",
                ":protonated"
            ),
        };
    }
}
</script>

<style scoped lang="scss"></style>
