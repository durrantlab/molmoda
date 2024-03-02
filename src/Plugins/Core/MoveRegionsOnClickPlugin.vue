<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        cancelBtnTxt="Cancel"
        actionBtnTxt="Move"
        @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged"
    >
        <ul>
            <li v-for="title of selectedRegionsTitles" :key="title">
                {{ title }}
            </li>
        </ul>

        <Alert type="info">
            You can also change a region's position and other properties (e.g.,
            size) by selecting it in the Navigator panel and editing in the
            Styles panel.
        </Alert>
    </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IRegion } from "@/UI/Navigation/TreeView/TreeInterfaces";
import Alert from "@/UI/Layout/Alert.vue";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { ITest } from "@/Testing/TestCmd";
import * as api from "@/Api";

/** AboutPlugin */
@Options({
    components: {
        PluginComponent,
        Alert,
    },
})
export default class MoveRegionsOnClickPlugin extends PluginParentClass {
    menuPath = null; // Not available through menu system
    title = "Move regions?";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "moveregionsonclick";
    intro = `Move all selected regions to this atom's position:`;

    userArgDefaults: UserArg[] = [];
    alwaysEnabled = true;
    logJob = false;

    newCenter: [number, number, number] = [0, 0, 0];

    /**
     * Checks if the plugin is allowed to run. Returns true if allowed, false if
     * not allowed, or a string if not allowed and there's a user message.
     *
     * @returns {string | null}  Null if allowed, or a message if not allowed.
     */
    checkPluginAllowed(): string | null {
        if (this.selectedRegionsTitles.length === 0) {
            return "No regions selected.";
        }
        return null;
    }

    /**
     * Called right before the plugin popup opens.
     *
     * @param {number[]} payload  The payload from the event (new box center).
     * @return {boolean | void}  If false, the popup will not open (abort).
     *                            Anything else, and the popup will open.
     */
    onBeforePopupOpen(payload: [number, number, number]) {
        // Save new center.
        this.newCenter = payload;
        return;
    }

    /**
     * Get the selected regions.
     *
     * @returns {TreeNodeList}  The selected regions.
     */
    get selectedRegions(): TreeNodeList {
        // Get terminal nodes
        let terminalNodes = (this.$store.state.molecules as TreeNodeList)
            .filters.onlyTerminal;

        // Get the ones that are selected and regions
        terminalNodes = terminalNodes.filters.keepSelected();
        terminalNodes = terminalNodes.filters.keepRegions();
        return terminalNodes;
    }

    /**
     * Get the titles of the selected regions.
     *
     * @returns {string[]}  The titles of the selected regions.
     */
    get selectedRegionsTitles(): string[] {
        const selectedRegions = this.selectedRegions;
        return selectedRegions.map((node) =>
            node.descriptions.pathName(" > ", 0)
        );
    }

    /**
     * Runs when the popup closes via done button. Here, does nothing.
     */
    onPopupDone() {
        this.submitJobs(this.selectedRegions.toArray() as TreeNode[]);
    }

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @param {TreeNode} treeNode  The molecule container associated with the
     *                             region.
     * @returns {Promise<void>}  Resolves when the job is done.
     */
    runJobInBrowser(treeNode: TreeNode): Promise<void> {
        const newRegion = {
            ...treeNode.region,
            center: this.newCenter,
        } as IRegion;
        treeNode.region = newRegion;
        treeNode.viewerDirty = true;

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
        // Not going to test closing, etc. (Too much work.) But at least opens
        // to see if an error occurs.

        api.plugins.runPlugin(this.pluginId, [0, 0, 0]);

        return [];
    }
}
</script>

<style scoped lang="scss">
.inverse-indent {
    text-indent: -1em;
    padding-left: 1em;
}
</style>
