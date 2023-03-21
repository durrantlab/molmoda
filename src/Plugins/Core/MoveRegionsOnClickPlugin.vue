<template>
    <PluginComponent
        :userArgs="userArgs"
        v-model="open"
        title="Move regions?"
        cancelBtnTxt="Cancel"
        actionBtnTxt="Move"
        :intro="intro"
        @onPopupDone="onPopupDone"
        :pluginId="pluginId"
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
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IRegion } from "@/UI/Navigation/TreeView/TreeInterfaces";
import Alert from "@/UI/Layout/Alert.vue";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

/** AboutPlugin */
@Options({
    components: {
        PluginComponent,
        Alert,
    },
})
export default class MoveRegionsOnClickPlugin extends PluginParentClass {
    menuPath = null; // Not available through menu system
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Jacob D. Durrant",
            url: "http://durrantlab.com/",
        },
    ];
    pluginId = "moveregionsonclick";
    intro = `Do you wish to move all selected regions to this atom's position? Selected regions:`;

    userArgs: FormElement[] = [];
    alwaysEnabled = true;
    logJob = false;

    /**
     * Called right before popup opens. Returns true if popup should open,
     * false if not.
     *
     * @returns {boolean}  True if popup should open, false if not.
     */
    onBeforePopupOpen(): boolean {
        return !(this.selectedRegionsTitles.length === 0);
    }

    /**
     * Get the selected regions.
     *
     * @returns {TreeNodeList}  The selected regions.
     */
    get selectedRegions(): TreeNodeList {
        // Get terminal nodes
        let terminalNodes = (this.$store.state.molecules as TreeNodeList).filters.onlyTerminal;

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
        return selectedRegions.map((node) => node.descriptions.pathName(" > ", 0));
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
     * @param {TreeNode} treeNode  The molecule container associated
     *     with the region.
     */
    runJobInBrowser(treeNode: TreeNode) {
        const newRegion = {
            ...treeNode.region,
            center: this.payload,
        } as IRegion;
        treeNode.region = newRegion;
        treeNode.viewerDirty = true;

        return;
    }
}
</script>

<style scoped lang="scss">
.inverse-indent {
    text-indent: -1em;
    padding-left: 1em;
}
</style>
