<template>
    <PluginComponent
        :userArgs="userArgs"
        v-model="open"
        title="Move shapes?"
        cancelBtnTxt="Cancel"
        actionBtnTxt="Move"
        :intro="intro"
        @onPopupDone="onPopupDone"
        :pluginId="pluginId"
    >
        <ul>
            <li v-for="title of selectedShapesTitles" :key="title">
                {{ title }}
            </li>
        </ul>

        <Alert type="info">
            You can also change a shape's position and other properties (e.g.,
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
import {
extractFlattenedContainers,
    getTerminalNodes,
    nodePathName,
} from "@/UI/Navigation/TreeView/TreeUtils";
import {
    IMolContainer,
    IShape,
    SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import Alert from "@/UI/Layout/Alert.vue";

/** AboutPlugin */
@Options({
    components: {
        PluginComponent,
        Alert,
    },
})
export default class MoveShapesOnClickPlugin extends PluginParentClass {
    menuPath = null; // Not available through menu system
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Jacob D. Durrant",
            url: "http://durrantlab.com/",
        },
    ];
    pluginId = "moveshapesonclick";
    intro = `Do you wish to move all selected shapes to this atom's position? Selected shapes:`;

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
        return !(this.selectedShapesTitles.length === 0);
    }

    /**
     * Get the selected shapes.
     *
     * @returns {IMolContainer[]}  The selected shapes.
     */
    get selectedShapes(): IMolContainer[] {
        // Get terminal nodes
        const terminalNodes = getTerminalNodes(
            this.$store.state.molecules as IMolContainer[]
        );

        // Get the ones that are selected and shapes
        return extractFlattenedContainers(terminalNodes, {
            selected: true,
            shape: true,
        });
    }

    /**
     * Get the titles of the selected shapes.
     *
     * @returns {string[]}  The titles of the selected shapes.
     */
    get selectedShapesTitles(): string[] {
        const selectedShapes = this.selectedShapes;
        return selectedShapes.map((node) => nodePathName(node, " > ", 0));
    }

    /**
     * Runs when the popup closes via done button. Here, does nothing.
     */
    onPopupDone() {
        this.submitJobs(this.selectedShapes);
    }

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     *
     * @param {IMolContainer} molContainer  The molecule container associated
     *     with the shape.
     */
    runJobInBrowser(molContainer: IMolContainer) {
        const newShape = {
            ...molContainer.shape,
            center: this.payload,
        } as IShape;
        molContainer.shape = newShape;
        molContainer.viewerDirty = true;
    }
}
</script>

<style scoped lang="scss">
.inverse-indent {
    text-indent: -1em;
    padding-left: 1em;
}
</style>
