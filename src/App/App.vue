<template>
    <div class="full-screen" style="display: flex; flex-direction: column">
        <TestData></TestData>
        <div
            style="
                z-index: 100;
                flex-grow: 5;
                max-height: 56px;
                min-height: 56px;
                height: 56px;
            "
            class="bg-light"
        >
            <Menu :menuData="menuData" />
        </div>
        <div style="flex-grow: 5">
            <GoldLayout />
        </div>
        <AllPlugins
            @onPluginSetup="onPluginSetup"
            :softwareCredits="softwareCredits"
            :contributorCredits="contributorCredits"
            :loadedPlugins="loadedPlugins"
        />
        <DragDropFileLoad />
    </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import GoldLayout from "@/UI/Layout/GoldenLayout/GoldLayout.vue";
import Menu from "@/UI/Navigation/Menu/Menu.vue";
import AllPlugins from "../Plugins/AllPlugins.vue";
import { addMenuItem, IMenuEntry } from "../UI/Navigation/Menu/Menu";
import {
    Credits,
    IContributorCredit,
    IPluginSetupInfo,
    ISoftwareCredit,
} from "../Plugins/PluginInterfaces";
import { dynamicImports } from "@/Core/DynamicImports";
import * as api from "@/Api";
import * as compileErrors from "../compile_errors.json";
import { appName } from "@/Core/GlobalVars";
import TestData from "@/Testing/TestData.vue";
import DragDropFileLoad from "@/UI/DragDropFileLoad.vue";
import Viewer2D from "@/UI/Components/Viewer2D.vue";
import { globalCredits } from "./GlobalCredits";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { loadedPlugins } from "@/Plugins/LoadedPlugins";
import { compile } from "vue";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// import "../assets/MDB5-STANDARD-UI-KIT-Free-6.4.0/js/mdb.min.js";

/**
 * Main app component
 */
@Options({
    components: {
        GoldLayout,
        Menu,
        AllPlugins,
        TestData,
        DragDropFileLoad,
        Viewer2D,
    },
})
export default class App extends Vue {
    // Menu data
    menuData: IMenuEntry[] = [];

    // Here so it will be reactive. See also LoadedPlugins.ts
    loadedPlugins: PluginParentClass[] = [];

    // Software credits (libraries used)
    softwareCredits: ISoftwareCredit[] = globalCredits;

    // Contributor credits (people)
    contributorCredits: IContributorCredit[] = [
        {
            name: "Center for Research Computing (University of Pittsburgh)",
            url: "https://crc.pitt.edu/",
        },
    ];

    // Triggers error modal with this message.
    errorMsg = "";

    /**
     * Removes credits with duplicate names.
     *
     * @param {Credits} credits  Credits to consider.
     * @returns {Credits} The list of credits, with ones that have duplicate names
     *     removed.
     */
    private _removeDuplicateNames(credits: Credits): Credits {
        return credits.filter(
            (v: any, i: any, a: any) =>
                a.findIndex((x: any) => x.name === v.name) === i
        );
    }

    /**
     * Called when a plugin has finished setting up. Collects the menu and
     * credits data. Runs each time a plugin is loaded, so multiple times (since
     * multiple plugins).
     *
     * @param {IPluginSetupInfo} pluginSetupInfo  Information about the plugin
     *                                            that has finished setting up.
     */
    onPluginSetup(pluginSetupInfo: IPluginSetupInfo) {
        this.menuData = addMenuItem(
            pluginSetupInfo.menuData,
            this.menuData,
            pluginSetupInfo.pluginId
        );
        this.softwareCredits = [
            ...this.softwareCredits,
            ...pluginSetupInfo.softwareCredits,
            ...Object.values(dynamicImports).map((v) => v.credit),
        ];

        // Remove items from credits if they have the same name
        this.softwareCredits = this._removeDuplicateNames(
            this.softwareCredits
        ) as ISoftwareCredit[];

        this.contributorCredits = [
            ...this.contributorCredits,
            ...pluginSetupInfo.contributorCredits,
        ];

        // Remove items from contributorCredits if they have the same name
        this.contributorCredits = this._removeDuplicateNames(
            this.contributorCredits
        );

        this.loadedPlugins = Object.keys(loadedPlugins).map(
            (k) => loadedPlugins[k]
        );

        // Sort by title
        this.loadedPlugins.sort((a, b) => {
            const an = a.title.toLowerCase();
            const bn = b.title.toLowerCase();
            if (an < bn) return -1;
            if (an > bn) return 1;
            return 0;
        });
    }

    /** mounted function */
    mounted() {
        api.messages.log(`${appName} suite started`);

        if (
            compileErrors.length > 0 &&
            window.location.search.indexOf("test=") === -1
        ) {
            // There are compile errors
            let compileErrorsArray: string[] = [];
            for (let i = 0; i < compileErrors.length; i++) {
                compileErrorsArray.push(compileErrors[i]);
            }

            api.messages.popupError(
                "<p>The following compile errors were found:</p><ul><li>" +
                    compileErrorsArray.join("</li><li>") +
                    "</li></ul>"
            );
        }
    }
}
</script>

<style lang="scss">
// Global

@import "../assets/standard_bootstrap.scss";

// @import 'bootswatch/dist/cosmo/bootstrap.min.css';
// @import 'bootswatch/dist/sketchy/bootstrap.min.css';  // Love it (funny)
// @import 'bootswatch/dist/zephyr/bootstrap.min.css';  // Looks good

// Not such a fan...
// @import 'bootswatch/dist/materia/bootstrap.min.css';
// @import 'bootswatch/dist/minty/bootstrap.min.css';
// @import 'bootswatch/dist/united/bootstrap.min.css';
// @import "mdb-vue-ui-kit/css/mdb.min.css";

#app {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    position: absolute;
    width: 100%;
    height: 100%;
}

.full-screen {
    position: absolute;
    width: 100%;
    height: 100%;
}

body.waiting * {
    cursor: wait !important;
}

// See https://stackoverflow.com/questions/826782/how-to-disable-text-selection-highlighting

// Select not input not textarea
:not([textarea][input]) {
    -webkit-touch-callout: none; /* iOS Safari */
    -webkit-user-select: none; /* Safari */
    -khtml-user-select: none; /* Konqueror HTML */
    -moz-user-select: none; /* Old versions of Firefox */
    -ms-user-select: none; /* Internet Explorer/Edge */
    user-select: none; /* Non-prefixed version, currently
                                  supported by Chrome, Edge, Opera and Firefox */
}

// https://stackoverflow.com/questions/7855590/preventing-scroll-bars-from-being-hidden-for-macos-trackpad-users-in-webkit-blin

// ::-webkit-scrollbar-x {
//     -webkit-appearance: none;
//     width: 0; /* Remove vertical space */
//     height: 8px;
// }
// ::-webkit-scrollbar-thumb {
//     border-radius: 4px;
//     background-color: rgba(0,0,0,.5);
//     box-shadow: 0 0 1px rgba(255,255,255,.5);
// }
</style>
