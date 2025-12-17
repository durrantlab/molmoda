<template>
    <PluginComponent v-model="open" :infoPayload="infoPayload" @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged"></PluginComponent>
</template>

<script lang="ts">
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { Options } from "vue-class-component";
import { switchToGoldenLayoutPanel } from "./Common";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { TestCmdList } from "@/Testing/TestCmdList";

/**
 * StylesWindowPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class StylesWindowPlugin extends PluginParentClass {
    menuPath = ["[8] Window", "Molecules", "[5] Styles"];
    title = "Styles Panel";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        // {
        //   name: "Jacob D. Durrant",
        //   url: "http://durrantlab.com/",
        // },
    ];
    pluginId = "styleswindow";
    noPopup = true;
    userArgDefaults: UserArg[] = [];

    logJob = false;
    intro = `Switch to the Styles panel.`;
    details = "This plugin brings the Styles panel into focus, where you can change the visual representation of molecules.";
    tags = [Tag.All];

    /**
     * Every plugin runs some job. This is the function that does the job running.
     * 
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     */
    runJobInBrowser(): Promise<void> {
        switchToGoldenLayoutPanel("Styles");
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
  const colorSchemeSelector = "#colorscheme-colorscheme-form-item";

  return [
   {
    beforePluginOpens: () => new TestCmdList().loadExampleMolecule(true).selectMoleculeInTree("Protein"),
    pluginOpen: () => new TestCmdList()
     // --- Test Protein Styles ---
     // Atoms Style
     .text("#atoms-protein", "Atoms: Spheres").wait(1)
     .text(colorSchemeSelector, "Color by Chain").wait(1)
     .text("#atoms-protein", "Atoms: Sticks").wait(1)
     .text(colorSchemeSelector, "Color by Element").wait(1)
     .text("#atoms-protein", "Atoms: Lines").wait(1)
     .text("#atoms-protein", "Atoms: Hidden").wait(1)
     // Backbone Style
     .text("#protein-protein", "Backbone: Cartoon").wait(1)
     .text(colorSchemeSelector, "Color by Spectrum").wait(1)
     .text(colorSchemeSelector, "Color by Chain").wait(1)
     .text("#protein-protein", "Backbone: Hidden").wait(1)
     // Surface Style
     .text("#surface-protein", "Surface").wait(1)
     .text(colorSchemeSelector, "Color by Solid").wait(1)
     .text("#surface-protein", "Surface: Hidden").wait(1)
     // Hydrogens
     .text("#hydrogens", "Polar Only").wait(1)
     .text("#hydrogens", "Hide All").wait(1)
     .text("#hydrogens", "Show All").wait(1)

     // --- Test Compound Styles ---
     .selectMoleculeInTree("Compounds")
     // Atoms Style
     .text("#atoms-compound", "Atoms: Spheres").wait(1)
     .text(colorSchemeSelector, "Color by Solid").wait(1)
     .text("#atoms-compound", "Atoms: Sticks").wait(1)
     .text(colorSchemeSelector, "Color Carbons").wait(1)
     // Surface Style
     .text("#surface-compound", "Surface").wait(1)
     .text(colorSchemeSelector, "Color by Element").wait(1)
     .text("#surface-compound", "Surface: Hidden").wait(1)
     // Reset to standard
     .text("#atoms-compound", "Atoms: Sticks").wait(1)
   }
  ];
    }
}
</script>

<style scoped lang="scss"></style>
