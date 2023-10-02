<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        @onUserArgChanged="onUserArgChanged"
    ></PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options } from "vue-class-component";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";

import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { TestCmdList } from "@/Testing/TestCmdList";

/**
 * ToggleVisiblePlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class ToggleVisiblePlugin extends PluginParentClass {
    menuPath = ["Edit", "Molecules", "[5] Toggle Visible..."];
    title = "";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "togglevisiblemols";
    intro = "Toggle the visibility of the selected molecules.";
    userArgDefaults: UserArg[] = [];

    noPopup = true;
    alwaysEnabled = true;
    logJob = false;

    /**
     * Every plugin runs some job. This is the function that does the job
     * running.
     */
    runJobInBrowser() {
        let selecteds = getMoleculesFromStore().filters.keepSelected(
            true,
            true
        );

        if (selecteds.length === 0) {
            selecteds = getMoleculesFromStore().flattened;
        }

        selecteds.forEach((node) => {
            console.log(node.title, node.visible);
            node.visibleWithoutChildren = !node.visible;
            node.viewerDirty = true;
        });

        // How many of these are visible?
        // const numVisible = selecteds.filters.keepVisible(true, false).length;
        // const numNotvisible = selecteds.length - numVisible;

        // if (numVisible > numNotvisible) {
        //     // Set them to be invisible
        //     selecteds.forEach((node) => {
        //         node.visible = false;
        //         node.viewerDirty = true;
        //     });
        // } else {
        //     // Set them to be visible
        //     selecteds.forEach((node) => {
        //         node.visible = true;
        //         node.viewerDirty = true;
        //     });
        // }

        return;
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    getTests(): ITest[] {
        return [
            {
                beforePluginOpens: new TestCmdList().loadExampleProtein(true),
            },
        ];
    }
}
</script>

<style scoped lang="scss"></style>
