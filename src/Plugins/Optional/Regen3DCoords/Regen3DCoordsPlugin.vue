<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onPopupDone="onPopupDone" actionBtnTxt="Generate"
        @onUserArgChanged="onUserArgChanged" @onMolCountsChanged="onMolCountsChanged">
    </PluginComponent>
</template>
<script lang="ts">
import { Options } from "vue-class-component";
import PluginComponent from "../../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import {
    UserArg,
    IUserArgMoleculeInputParams,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { checkCompoundLoaded } from "@/Plugins/CheckUseAllowedUtils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TestCmdList } from "@/Testing/TestCmdList";
import { ITest } from "@/Testing/TestInterfaces";
import {
    Gen3DLevel,
    IGen3DOptions,
    WhichMolsGen3D,
    convertFileInfosOpenBabel,
    getGen3DUserArg,
} from "@/FileSystem/OpenBabel/OpenBabel";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { dynamicImports } from "@/Core/DynamicImports";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { makeEasyParser } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser";
import { loadHierarchicallyFromTreeNodes } from "@/UI/Navigation/TreeView/TreeUtils";
import { parseAndLoadMoleculeFile } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMoleculeFiles";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

/**
 * Regen3DCoordsPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class Regen3DCoordsPlugin extends PluginParentClass {
    menuPath = "Compounds/Build/[3] Regenerate 3D...";
    title = "Regenerate 3D Coordinates";
    softwareCredits: ISoftwareCredit[] = [dynamicImports.obabelwasm.credit];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "regen3dcoords";
    tags = [Tag.Modeling, Tag.Cheminformatics];
    intro = `Regenerate small-molecule atomic coordinates.`;
    details = `This plugin uses Open Babel to regenerate (correct) the 3D coordinates of compounds that are flat or have poor geometries.`;
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
        getGen3DUserArg(
            "3D generation quality",
            "Choose the quality level for 3D coordinate generation. 'Best' is recommended for accuracy but is slower."
        ),
    ];

    /**
     * Runs before the popup opens. Starts importing the modules needed for the
     * plugin.
     */
    async onBeforePopupOpen() {
        // No special actions needed before opening.
    }

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *  message. If null, proceed to run the plugin.
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
        const gen3DParams: IGen3DOptions = {
            whichMols: WhichMolsGen3D.All, // Always regenerate for this plugin
            level: this.getUserArg("gen3D"),
        };

        const conversionPromises = compounds.map((compound) => {
            const parser = makeEasyParser(compound);
            const hasH = parser.hasHydrogens();
            const phParam = hasH ? undefined : null; // null triggers -d flag (delete hydrogens)

            // Each call to convertFileInfosOpenBabel returns a promise that resolves to string[]
            return convertFileInfosOpenBabel(
                [compound], // Process one file at a time
                "mol2",
                gen3DParams,
                phParam
            );
        });

        const conversionResults = await Promise.all(conversionPromises);
        const molTexts = conversionResults.flat(); // Flatten the array of arrays

        const treeNodePromises: Promise<void | TreeNodeList>[] = [];
        for (let i = 0; i < molTexts.length; i++) {
            const fileInfo = new FileInfo({
                name: compounds[i].name,
                contents: molTexts[i],
                auxData: compounds[i].treeNode?.title,
            });

            const treeNodeList = parseAndLoadMoleculeFile({
                fileInfo,
                tag: this.pluginId,
                desalt: false,
                gen3D: {
                    whichMols: WhichMolsGen3D.None, // Already generated
                },
                addToTree: false
                // surpressMsgs: true,
            });
            treeNodePromises.push(treeNodeList);
        }

        let treeNodeLists = (await Promise.all(
            treeNodePromises
        )) as (void | TreeNodeList)[];

        const onlyTreeNodes = treeNodeLists
            .filter((tl) => tl !== undefined)
            .map((tl) => {
                let n = (tl as TreeNodeList).get(0);
                if (n.nodes) {
                    // Should have only one terminal
                    n = n.nodes.terminals.get(0);
                }
                n.type = TreeNodeType.Compound;
                const compound = compounds.find((c) => c.auxData === n?.title);
                if (compound && compound.treeNode !== undefined) {
                    n.title = compound.treeNode.title;
                }
                return n;
            });

        const rootNode = loadHierarchicallyFromTreeNodes(
            onlyTreeNodes,
            "Compounds:3D"
        );
        rootNode.addToMainTree(this.pluginId);
        return;
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
                name: "Regenerate 3D without hydrogens (input has no H)",
                beforePluginOpens: () =>
                    new TestCmdList().loadSMILESMolecule("c1ccccc1", true), // Load Benzene (flat, no explicit H)
                pluginOpen: () =>
                    new TestCmdList().setUserArg("gen3D", Gen3DLevel.Fastest, this.pluginId),
                afterPluginCloses: () =>
                    new TestCmdList().waitUntilRegex("#navigator", "Compounds:3D"),
            },
            {
                name: "Regenerate 3D with hydrogens (input has H)",
                beforePluginOpens: () =>
                    new TestCmdList().loadSMILESMolecule("[CH4]", true), // Load Methane (with explicit H)
                pluginOpen: () =>
                    new TestCmdList().setUserArg("gen3D", Gen3DLevel.Fastest, this.pluginId),
                afterPluginCloses: () =>
                    new TestCmdList().waitUntilRegex("#navigator", "Compounds:3D"),
            },
        ];
    }
}
</script>
<style scoped lang="scss"></style>