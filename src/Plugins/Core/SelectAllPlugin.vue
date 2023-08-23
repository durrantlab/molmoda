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
import { SelectedType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { checkAnyMolLoaded } from "./CheckUseAllowedUtils";
import { TestCmdList } from "@/Testing/TestCmdList";

/** SelectAllPlugin */
@Options({
    components: {
        PluginComponent,
    },
})
export default class SelectAllPlugin extends PluginParentClass {
    menuPath = ["Edit", "Selection", "[0] Select All"];
    title = "";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //     name: "Jacob D. Durrant",
        //     url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "selectall";
    noPopup = true;
    userArgDefaults: UserArg[] = [];
    alwaysEnabled = true;
    logJob = false;
    intro = "Select all molecules in the tree."

    hotkey = "a";

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        return checkAnyMolLoaded();
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     */
    runJobInBrowser() {
        const allNodes = (this.$store.state["molecules"] as TreeNodeList)
            .flattened;
        allNodes.forEach((n) => {
            n.selected = SelectedType.True;
        });
        return;
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
            beforePluginOpens: new TestCmdList()
                .loadExampleProtein(true).cmds,
            closePlugin: [],
            afterPluginCloses: [],
        };
    }
}
</script>

<style scoped lang="scss"></style>
