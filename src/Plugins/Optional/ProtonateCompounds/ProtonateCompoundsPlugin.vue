<template>
    <PluginComponent
        :userArgs="userArgs"
        v-model="open"
        :title="title"
        :intro="intro"
        @onPopupDone="onPopupDone"
        :pluginId="pluginId"
        actionBtnTxt="Protonate"
        @onUserArgChanged="onUserArgChanged"
    >
        <!-- <template #afterForm>
            <Alert type="info"
                >Once calculated, the molecular properties will appear in the
                Data tab</Alert
            >
        </template> -->
    </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import PluginComponent from "../../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import Alert from "@/UI/Layout/Alert.vue";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import {
    FormElemType,
    UserArg,
    IUserArgMoleculeInputParams,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { checkCompoundLoaded } from "@/Plugins/Core/CheckUseAllowedUtils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TestCmdList } from "@/Testing/TestCmdList";
import { ITest } from "@/Testing/TestCmd";
import { convertFileInfosOpenBabel } from "@/FileSystem/OpenBabel/OpenBabel";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import {
    SelectedType,
    TreeNodeType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { dynamicImports } from "@/Core/DynamicImports";

/**
 * ProtonateCompoundsPlugin
 */
@Options({
    components: {
        PluginComponent,
        Alert,
    },
})
export default class ProtonateCompoundsPlugin extends PluginParentClass {
    menuPath = "Compounds/Protonate...";
    title = "Protonate Compounds";
    softwareCredits: ISoftwareCredit[] = [dynamicImports.obabelwasm.credit];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
        {
            name: "Yuri Kochnev",
        },
    ];
    pluginId = "protonatecomps";

    intro = `Protonate compounds at a given pH, in preparation for docking. Uses the Open Babel library to guess at proper protonation states.`;

    userArgDefaults: UserArg[] = [
        {
            // type: FormElemType.MoleculeInputParams,
            id: "makemolinputparams",
            val: new MoleculeInput({
                compoundFormat: "mol2",
                considerProteins: false,
                batchSize: null,
            }),
        } as IUserArgMoleculeInputParams,

        // pH
        {
            type: FormElemType.Range,
            id: "pH",
            label: "Protonation pH",
            val: 7.4,
            min: 0,
            max: 14,
            step: 0.1,
            description: "Physiological pH is 7.4.",
        },

        {
            type: FormElemType.Checkbox,
            id: "regen3DCoords",
            label: "Regenerate 3D coordinates",
            val: false,
            description:
                "Whether to regenerate 3D atomic coordinates given the new protonation state.",
        },
    ];

    /**
     * Runs before the popup opens. Starts importing the modules needed for the
     * plugin.
     */
    onBeforePopupOpen() {
        // You're probably going to need open babel and rdkitjs
        // dynamicImports.rdkitjs.module;
        // dynamicImports.openbabeljs.module;
    }

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        return checkCompoundLoaded();
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     *
     * @returns {Promise<void>}  A promise that resolves when the popup is done.
     */
    onPopupDone(): Promise<void> {
        const compounds: FileInfo[] = this.getUserArg("makemolinputparams");

        const pH = this.getUserArg("pH");
        const regen3DCoords = this.getUserArg("regen3DCoords");

        return convertFileInfosOpenBabel(compounds, "mol2", regen3DCoords, pH)
            .then((molTexts: string[]) => {
                // Make new fileinfos with protonated files
                // const treeNodes: TreeNode[] = [];
                const treeNodePromises: Promise<void | TreeNode>[] = [];
                for (let i = 0; i < molTexts.length; i++) {
                    const fileInfo = new FileInfo({
                        name: compounds[i].name,
                        contents: molTexts[i],
                        auxData: compounds[i].treeNode?.title,
                        // treeNode: compounds[i].treeNode,
                    });
                    const treeNode = TreeNode.loadFromFileInfo(fileInfo);
                    treeNodePromises.push(treeNode);
                }

                return Promise.all(treeNodePromises);
            })
            .then((treeNodes: (void | TreeNode)[]) => {
                const initialCompoundsVisible = getSetting(
                    "initialCompoundsVisible"
                );

                treeNodes = treeNodes.map((n, i) => {
                    if (n === undefined) {
                        return undefined;
                    }

                    if (n.nodes) {
                        // Should have only one terminal
                        n = n.nodes.terminals.get(0);
                    }

                    n.visible = i < initialCompoundsVisible;
                    n.selected = SelectedType.False;
                    n.focused = false;
                    n.viewerDirty = true;
                    n.type = TreeNodeType.Compound;

                    const compound = compounds[i];
                    if (compound.treeNode !== undefined) {
                        n.title = compound.treeNode.title;
                    }
                    return n;
                });

                const onlyTreeNodes = treeNodes.filter(
                    (tn) => tn !== undefined
                ) as TreeNode[];

                const rootNode =
                    TreeNode.loadHierarchicallyFromTreeNodes(onlyTreeNodes);

                rootNode.title = "Compounds:protonated";

                rootNode.addToMainTree();
                return;
            })
            .catch((err: any): void => {
                throw err;
            });

        // // Make sure the filenames are unique.
        // for (let i = 0; i < compounds.length; i++) {
        //     compounds[i].name = i.toString() + "_" + compounds[i].name;
        // }

        // return calcMolProps(
        //     compounds.map((f) => f.contents),
        //     compounds.map((f) => f.treeNode)
        // )
        //     .then(() => {
        //         this.submitJobs();
        //         return;
        //     })
        //     .catch((err: any): void => {
        //         throw err;
        //     });
    }

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @returns {Promise<undefined>}  A promise that resolves when the job is
     *     done.
     */
    runJobInBrowser(): Promise<void> {
        return Promise.resolve();
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
            beforePluginOpens: new TestCmdList().loadExampleProtein(true).cmds,
            // closePlugin: [],
            afterPluginCloses: [],
        };
    }
}
</script>

<style scoped lang="scss"></style>
