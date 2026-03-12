<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onPopupDone="onPopupDone" actionBtnTxt="Create Region"
        :hideIfDisabled="true" @onUserArgChanged="onUserArgChanged" @onMolCountsChanged="onMolCountsChanged">
    </PluginComponent>
</template>

<script lang="ts">
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { ITreeNode, TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import {
    UserArg,
    UserArgType,
    IUserArgMoleculeInputParams,
    IUserArgNumber,
    IUserArgSelect,
    IUserArgOption,
    IUserArgText,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import {
    IAtom,
    IBox,
    ISphere,
    RegionType,
    SelectedType,
    TreeNodeType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { randomPastelColor } from "@/Core/Styling/Colors/ColorUtils";
import { makeEasyParser } from "@/FileSystem/LoadSaveMolModels/ParseMolModels/EasyParser";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { checkAnyMolLoaded } from "@/Plugins/CheckUseAllowedUtils";
import { FileInfo } from "@/FileSystem/FileInfo";
import { messagesApi } from "@/Api/Messages";
import { Component } from "vue-facing-decorator";

/**
 * RegionFromMoleculesPlugin creates a box or spherical region that
 * surrounds all atoms in the specified molecules, with optional padding.
 * This is useful for quickly defining docking search spaces that
 * encompass one or more binding partners.
 */
@Component({
    components: {
        PluginComponent,
    },
})
export default class RegionFromMoleculesPlugin extends PluginParentClass {
    menuPath = "Regions/Region from Molecules...";
    title = "Region from Molecules";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "regionfrommolecules";
    intro = "Create a region that surrounds the specified molecules.";
    details =
        "This plugin calculates a bounding box or sphere around all atoms in the chosen molecules, with configurable padding.";
    tags = [Tag.Docking, Tag.Visualization];

    userArgDefaults: UserArg[] = [
        {
            id: "makemolinputparams",
            type: UserArgType.MoleculeInputParams,
            val: new MoleculeInput({
                considerProteins: true,
                considerCompounds: true,
                proteinFormat: "pdb",
                compoundFormat: "mol2",
                includeSolventAsProtein: false,
                allowUserToToggleIncludeSolventAsProtein: false,
                includeMetalsAsProtein: true,
                allowUserToToggleIncludeMetalsAsProtein: true,
            }),
            label: "Molecules to enclose",
        } as IUserArgMoleculeInputParams,
        {
            label: "Region name",
            id: "regionName",
            val: "region",
            placeHolder: "Name for the new region...",
            description: "A descriptive name for the new region.",
            warningFunc: (val: string) => {
                if (val === "region") {
                    return "We recommend renaming this region to make it more descriptive.";
                }
                return "";
            },
        } as IUserArgText,
        {
            label: "Type",
            id: "regionType",
            type: UserArgType.Select,
            options: [
                { description: "Box", val: "box" },
                { description: "Sphere", val: "sphere" },
            ] as IUserArgOption[],
            val: "box",
            description: "The shape of the region to create.",
        } as IUserArgSelect,
        {
            label: "Padding",
            id: "padding",
            type: UserArgType.Number,
            val: 3.4,
            description:
                "Extra space (in Angstroms) added in all directions beyond the bounding atoms.",
            validateFunc: (val: number) => !isNaN(val) && val >= 0,
            warningFunc: (val: number) => {
                if (val === 0) {
                    return "A padding of 0 means the region will tightly wrap the atoms with no extra space.";
                }
                return "";
            },
        } as IUserArgNumber,
        {
            label: "Opacity",
            id: "opacity",
            type: UserArgType.Range,
            val: 0.9,
            min: 0,
            max: 1,
            step: 0.05,
            description: "The transparency of the region in the viewer.",
        },
    ];

    /**
     * Checks whether at least one molecule is loaded before allowing the
     * plugin to run.
     *
     * @returns {string | null} Error message if not allowed, null otherwise.
     */
    checkPluginAllowed(): string | null {
        return checkAnyMolLoaded();
    }

    /**
     * Initializes default values before the popup opens, including
     * generating a random color for the region.
     */
    async onBeforePopupOpen(): Promise<void> {
        // Color is not a user arg — we just pick a random pastel each time.
        return;
    }

    /**
     * Gathers atom coordinates from all terminal nodes in the provided
     * molecule file infos to compute axis-aligned bounding extents.
     *
     * @param {FileInfo[]} fileInfos The molecule file infos from MoleculeInputParams.
     * @returns {{ minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number } | null}
     *   The bounding extents, or null if no atoms were found.
     */
    private _computeBoundsFromFileInfos(
        fileInfos: FileInfo[]
    ): {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
        minZ: number;
        maxZ: number;
    } | null {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;
        let atomCount = 0;

        for (const fileInfo of fileInfos) {
            if (!fileInfo.treeNode) {
                continue;
            }

            // Walk terminal nodes under this treeNode to get all models
            const terminalNodes = fileInfo.treeNode.nodes
                ? fileInfo.treeNode.nodes.terminals
                : new TreeNodeList([fileInfo.treeNode]);

            for (let tIdx = 0; tIdx < terminalNodes.length; tIdx++) {
                const termNode = terminalNodes.get(tIdx);
                if (!termNode.model) {
                    continue;
                }

                const parser = makeEasyParser(termNode.model);
                const atoms: IAtom[] = parser.atoms;

                for (const atom of atoms) {
                    const x = atom.x as number;
                    const y = atom.y as number;
                    const z = atom.z as number;
                    if (isNaN(x) || isNaN(y) || isNaN(z)) {
                        continue;
                    }
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                    minZ = Math.min(minZ, z);
                    maxZ = Math.max(maxZ, z);
                    atomCount++;
                }
            }
        }

        if (atomCount === 0) {
            return null;
        }

        return { minX, maxX, minY, maxY, minZ, maxZ };
    }

    /**
     * Runs when the user presses the "Create Region" button. Computes the
     * bounding region from the selected molecules and adds it to the tree.
     *
     * @returns {Promise<void>} Resolves when the region has been added.
     */
    async onPopupDone(): Promise<void> {
        const fileInfos: FileInfo[] = this.getUserArg("makemolinputparams");

        if (!fileInfos || fileInfos.length === 0) {
            messagesApi.popupError(
                "No molecules match the current selection criteria."
            );
            return;
        }

        const bounds = this._computeBoundsFromFileInfos(fileInfos);

        if (!bounds) {
            messagesApi.popupError(
                "No atoms found in the selected molecules. Cannot create a region."
            );
            return;
        }

        const padding = this.getUserArg("padding") as number;
        const regionType = this.getUserArg("regionType") as string;
        const regionName = this.getUserArg("regionName") as string;
        const opacity = this.getUserArg("opacity") as number;
        const color = randomPastelColor();

        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        const centerZ = (bounds.minZ + bounds.maxZ) / 2;

        // Round to 3 decimal places for cleanliness
        const round3 = (v: number): number => Math.round(v * 1000) / 1000;

        const treeNode = new TreeNode({
            title: regionName,
            type: TreeNodeType.Region,
        } as ITreeNode);

        if (regionType === "box") {
            const dimX = bounds.maxX - bounds.minX + 2 * padding;
            const dimY = bounds.maxY - bounds.minY + 2 * padding;
            const dimZ = bounds.maxZ - bounds.minZ + 2 * padding;

            treeNode.region = {
                type: RegionType.Box,
                center: [round3(centerX), round3(centerY), round3(centerZ)],
                dimensions: [round3(dimX), round3(dimY), round3(dimZ)],
                color: color,
                opacity: opacity,
                movable: true,
            } as IBox;
        } else {
            // Sphere: radius is the distance from center to the farthest
            // corner of the axis-aligned bounding box, plus padding.
            const halfX = (bounds.maxX - bounds.minX) / 2;
            const halfY = (bounds.maxY - bounds.minY) / 2;
            const halfZ = (bounds.maxZ - bounds.minZ) / 2;
            const radius =
                Math.sqrt(halfX * halfX + halfY * halfY + halfZ * halfZ) + padding;

            treeNode.region = {
                type: RegionType.Sphere,
                center: [round3(centerX), round3(centerY), round3(centerZ)],
                radius: round3(radius),
                color: color,
                opacity: opacity,
                movable: true,
            } as ISphere;
        }

        treeNode.addToMainTree(this.pluginId);
    }

    /**
     * Required by PluginParentClass. This plugin does its work directly
     * in onPopupDone, so no separate job is needed.
     *
     * @returns {Promise<void>} Resolves immediately.
     */
    async runJobInBrowser(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Gets the test commands for the plugin.
     *
     * @returns {Promise<ITest[]>} The test definitions.
     */
    async getTests(): Promise<ITest[]> {
        return [
            // Box region from visible molecules
            {
                beforePluginOpens: () =>
                    new TestCmdList().loadExampleMolecule(true),
                pluginOpen: () =>
                    new TestCmdList()
                        .setUserArg("regionName", "Test Box Region", this.pluginId)
                        .setUserArg("regionType", "box", this.pluginId)
                        .setUserArg("padding", 5, this.pluginId),
                afterPluginCloses: () =>
                    new TestCmdList().waitUntilRegex(
                        "#navigator",
                        "Test Box Region"
                    ),
            },
            // Sphere region from visible molecules
            {
                beforePluginOpens: () =>
                    new TestCmdList().loadExampleMolecule(true),
                pluginOpen: () =>
                    new TestCmdList()
                        .setUserArg("regionName", "Test Sphere Region", this.pluginId)
                        .setUserArg("regionType", "sphere", this.pluginId)
                        .setUserArg("padding", 3, this.pluginId),
                afterPluginCloses: () =>
                    new TestCmdList().waitUntilRegex(
                        "#navigator",
                        "Test Sphere Region"
                    ),
            },
        ];
    }
}
</script>

<style scoped lang="scss"></style>