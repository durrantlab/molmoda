<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        actionBtnTxt=""
        @onUserArgChanged="onUserArgChanged"
    >
    </PluginComponent>
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
import { TestCmdList } from "@/Testing/TestCmdList";
import { appName } from "@/Core/GlobalVars";

/** DocumentationLinkPlugin */
@Options({
    components: {
        PluginComponent,
    },
})
export default class DocumentationLinkPlugin extends PluginParentClass {
    menuPath = [`[1] ${appName}`, "[3] Documentation..."];
    title = "Documentation";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Alex Maldonado",
            url: "https://aalexmmaldonado.com/",
        },
    ];
    pluginId = "documentation";

    userArgDefaults: UserArg[] = [];
    alwaysEnabled = true;
    logJob = false;
    intro = `Read the ${appName} documentation.`;
    noPopup = true;

    /**
     * Runs after the popup opens. Good for setting focus in text elements.
     */
    onPopupOpen() {
        // Open the documentation in a new tab. It's at docs/
        window.open("docs/", "_blank");
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     */
    async runJobInBrowser(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest}  The selenium test commands.
     */
    async getTests(): Promise<ITest> {
        return {
            beforePluginOpens: new TestCmdList()
                .loadExampleMolecule()
                .selectMoleculeInTree("Protein"),
            afterPluginCloses: new TestCmdList(),
        };
    }
}
</script>

<style scoped lang="scss"></style>
