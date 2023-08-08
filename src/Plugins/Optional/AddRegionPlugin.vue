<template>
    <PluginComponent
        :userArgs="userArgs"
        v-model="open"
        :title="title"
        :intro="intro"
        @onPopupDone="onPopupDone"
        :pluginId="pluginId"
        actionBtnTxt="Add Region"
        :hideIfDisabled="true"
        @onUserArgChanged="onUserArgChanged"
    >
    </PluginComponent>
</template>

<script lang="ts">
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { ITreeNode, TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import {
    UserArg,
    UserArgType,
    IUserAlert,
    IUserArgOption,
    IUserArgSelect,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import Alert from "@/UI/Layout/Alert.vue";
import {
    IAtom,
    RegionType,
    TreeNodeType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { GLModel } from "@/UI/Panels/Viewer/GLModelType";
import { Options } from "vue-class-component";
import { randomPastelColor } from "@/UI/Panels/Options/Styles/ColorSelect/ColorConverter";

/**
 * AddRegionPlugin
 */
@Options({
    components: {
        PluginComponent,
        Alert,
    },
})
export default class AddRegionPlugin extends PluginParentClass {
    menuPath = "Edit/Regions/Add Region...";
    title = "Add Region";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "addregion";

    intro = `Add a new box or spherical region to the workspace.`;

    userArgDefaults: UserArg[] = [
        {
            val: `After adding a region, select it in the Navigator panel. You can then change its location and size via the Styles panel or by clicking atoms in the Viewer panel.`,
            id: "alert",
            alertType: "info",
        } as IUserAlert,
        {
            // type: UserArgType.MoleculeInputParams,
            label: "Type",
            id: "regionType",
            options: [
                { description: "Box", val: "box" },
                { description: "Sphere", val: "sphere" },
            ] as IUserArgOption[],
            val: "box",
        } as IUserArgSelect,
        {
            label: "Name",
            id: "regionName",
            val: "region",
        },
        {
            type: UserArgType.Vector3D,
            label: "Dimensions",
            id: "dimensions",
            val: [1, 1, 1],
            enabled: true,
        },
        {
            label: "Radius",
            id: "radius",
            val: 1,
            enabled: false,
        },
        {
            type: UserArgType.Vector3D,
            label: "Center",
            id: "center",
            val: [0, 0, 0],
        },
        {
            label: "Color",
            id: "color",
            val: "#0000ff",
        },
        {
            label: "Opacity",
            id: "opacity",
            val: 0.9,
            min: 0,
            max: 1,
            step: 0.05,
        },
    ];

    /**
     * Detects when user arguments have changed, and updates UI accordingly.
     */
     onUserArgChange() {
        let regionType = this.getUserArg("regionType") as string;
        if (regionType === "box") {
            this.setUserArgEnabled("dimensions", true);
            this.setUserArgEnabled("radius", false);
        } else {
            // sphere
            this.setUserArgEnabled("dimensions", false);
            this.setUserArgEnabled("radius", true);
        }
    }

    /**
     * Runs before the popup opens. Starts importing the modules needed for the
     * plugin.
     */
    onBeforePopupOpen() {
        // You're probably going to need open babel and rdkitjs
        // dynamicImports.rdkitjs.module;
        // dynamicImports.openbabeljs.module;

        // Decide on default values to use. First, get visible molecules.
        let nodes = this.$store.state["molecules"] as TreeNodeList;
        nodes = nodes.terminals;
        nodes = nodes.filters.keepVisible(true, false);
        nodes = nodes.filters.keepModels(true, false);

        let cnt = 0;
        let x = 0;
        let y = 0;
        let z = 0;

        let max_x = -Infinity;
        let max_y = -Infinity;
        let max_z = -Infinity;
        let min_x = Infinity;
        let min_y = Infinity;
        let min_z = Infinity;

        nodes.forEach((node) => {
            const mol = node.model as GLModel;
            if (mol) {
                const atoms = mol.selectedAtoms({}) as IAtom[];
                for (let i = 0; i < atoms.length; i = i + 10) {
                    // NOTE: Look at every 10th atom to speed up the calculation.
                    cnt += 1;
                    const atom = atoms[i];
                    x += atom.x as number;
                    y += atom.y as number;
                    z += atom.z as number;

                    max_x = Math.max(max_x, atom.x as number);
                    max_y = Math.max(max_y, atom.y as number);
                    max_z = Math.max(max_z, atom.z as number);
                    min_x = Math.min(min_x, atom.x as number);
                    min_y = Math.min(min_y, atom.y as number);
                    min_z = Math.min(min_z, atom.z as number);
                }
            }
        });

        if (cnt > 0) {
            const center_x = Math.round((1000 * x) / cnt) / 1000;
            const center_y = Math.round((1000 * y) / cnt) / 1000;
            const center_z = Math.round((1000 * z) / cnt) / 1000;

            const dimens = [max_x - min_x, max_y - min_y, max_z - min_z];

            // Limit to less than 20
            for (let i = 0; i < dimens.length; i++) {
                if (dimens[i] > 20) {
                    dimens[i] = 20;
                }
                dimens[i] = Math.round(1000 * dimens[i]) / 1000;
            }

            // Get max dimension
            let max_dim = 0;
            for (let i = 0; i < dimens.length; i++) {
                if (dimens[i] > max_dim) {
                    max_dim = dimens[i];
                }
            }

            this.setUserArg("radius", Math.round(500 * max_dim) / 1000);
            this.setUserArg("center", [center_x, center_y, center_z]);
            this.setUserArg("dimensions", dimens);
        }

        this.setUserArg("color", randomPastelColor());
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     *
     * @returns {Promise<void>}  A promise that resolves when the popup is done.
     */
    onPopupDone(): Promise<void> {
        const regionType = this.getUserArg("regionType");
        const regionName = this.getUserArg("regionName");
        const color = this.getUserArg("color");
        const opacity = this.getUserArg("opacity");

        // Make a tree node
        const treeNode = new TreeNode({
            title: regionName,
            type: TreeNodeType.Region,
        } as ITreeNode);

        let region: any = {
            center: this.getUserArg("center"),
            color: color,
            movable: true,
            opacity: opacity,
        };

        if (regionType === "box") {
            region = {
                ...region,
                dimensions: this.getUserArg("dimensions"),
                type: RegionType.Box,
            };
        } else {
            region = {
                ...region,
                radius: this.getUserArg("radius"),
                type: RegionType.Sphere,
            };
        }
        treeNode.region = region;
        treeNode.visible = true;
        treeNode.addToMainTree();

        return Promise.resolve();
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @returns {Promise<undefined>}  A promise that resolves when the job is
     *     done.
     */
    runJobInBrowser(): Promise<void> {
        // return calcMolProps(
        //     compoundBatch.map((f) => f.contents),
        //     compoundBatch.map((f) => f.treeNode)
        // )
        //     .then(() => {
        //         return;
        //     })
        //     .catch((err: any): void => {
        //         throw err;
        //     });
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
