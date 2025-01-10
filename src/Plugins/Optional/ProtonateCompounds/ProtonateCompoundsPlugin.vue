<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        @onPopupDone="onPopupDone"
        actionBtnTxt="Protonate"
        @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"
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
    UserArgType,
    UserArg,
    IUserArgMoleculeInputParams,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { checkCompoundLoaded } from "@/Plugins/CheckUseAllowedUtils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TestCmdList } from "@/Testing/TestCmdList";
import { ITest } from "@/Testing/TestCmd";
import {
    IGen3DOptions,
    WhichMolsGen3D,
    convertFileInfosOpenBabel,
    getGen3DUserArg,
} from "@/FileSystem/OpenBabel/OpenBabel";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import {
    SelectedType,
    TreeNodeType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { dynamicImports } from "@/Core/DynamicImports";
import { Tag } from "@/Plugins/Tags/Tags";

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
    menuPath = "Compounds/Build/[2] Protonation...";
    title = "Protonate/Deprotonate Compounds";
    softwareCredits: ISoftwareCredit[] = [dynamicImports.obabelwasm.credit];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Yuri K. Kochnev",
        },
    ];
    pluginId = "protonatecomps";
    tags = [Tag.Modeling, Tag.Docking];
    intro = `Protonate/deprotonate compounds per a given pH, in preparation for docking.`;
    details = `Uses the Open Babel library to guess at proper protonation states.`;

    userArgDefaults: UserArg[] = [
        {
            // type: UserArgType.MoleculeInputParams,
            id: "makemolinputparams",
            val: new MoleculeInput({
                compoundFormat: "mol2",
                considerProteins: false,
                batchSize: null,
            }),
        } as IUserArgMoleculeInputParams,

        // pH
        {
            type: UserArgType.Range,
            id: "pH",
            label: "Protonation pH",
            val: 7.4,
            min: 0,
            max: 14,
            step: 0.1,
            description: "Physiological pH is 7.4.",
        },

        // {
        //     type: UserArgType.Checkbox,
        //     id: "regen3DCoords",
        //     label: "Regenerate 3D coordinates",
        //     val: false,
        //     description:
        //         "Whether to regenerate 3D atomic coordinates given the new protonation state.",
        // },
        getGen3DUserArg(
            "Regenerate 3D coordinates",
            "Whether to regenerate 3D atomic coordinates given the new protonation state.",
            true
        ),
    ];

    /**
     * Runs before the popup opens. Starts importing the modules needed for the
     * plugin.
     */
    async onBeforePopupOpen() {
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
    async onPopupDone(): Promise<void> {
        const compounds: FileInfo[] = this.getUserArg("makemolinputparams");

        const pH = this.getUserArg("pH");
        // const regen3DCoords = this.getUserArg("regen3DCoords");

        const gen3DParams = {
            whichMols: WhichMolsGen3D.All,
            level: this.getUserArg("gen3D"),
        } as IGen3DOptions;

        const molTexts = (await convertFileInfosOpenBabel(
            compounds,
            "mol2",
            gen3DParams,
            pH
        )) as string[];

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
            const treeNode = TreeNode.loadFromFileInfo({
                fileInfo,
                tag: this.pluginId,
            });
            treeNodePromises.push(treeNode);
        }

        let treeNodes = (await Promise.all(
            treeNodePromises
        )) as (void | TreeNode)[];

        const initialCompoundsVisible = await getSetting("initialCompoundsVisible");

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

        rootNode.addToMainTree(this.pluginId);

        return;

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
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    runJobInBrowser(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    async getTests(): Promise<ITest[]> {
        return [
            {
                beforePluginOpens: new TestCmdList().loadExampleMolecule(true),
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "Compounds:protonated"
                ),
            },
            {
                beforePluginOpens: new TestCmdList().loadExampleMolecule(true),
                pluginOpen: new TestCmdList().setUserArg(
                    "gen3D",
                    "medium",
                    this.pluginId
                ),
                // .click(
                //     "#regen3DCoords-protonatecomps-item"
                // ),
                afterPluginCloses: new TestCmdList().waitUntilRegex(
                    "#navigator",
                    "Compounds:protonated"
                ),
            },
        ];
    }
}
</script>

<style scoped lang="scss"></style>
