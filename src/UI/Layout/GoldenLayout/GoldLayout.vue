<template>
    <span>
        <div ref="golden-layout-data" id="golden-layout-data">
            <GoldenLayoutContainer type="column">
                <GoldenLayoutContainer type="row" :height="100">
                    <GoldenLayoutComponent name="Navigator" extraClass="sortable-group" state="{}" :width="20">
                        <div @click.self="clearSelection" style="height: 100%; overflow-x: clip">
                            <TreeView />
                        </div>
                    </GoldenLayoutComponent>

                    <GoldenLayoutContainer type="stack" :width="60">
                        <GoldenLayoutComponent name="Viewer" state="{}" :style="'height:100%; padding:0 !important;'">
                            <div v-if="!viewerLoaded" class="splash-screen">
                                <div class="container-fluid p-3">
                                    <div style="
                                            float: right;
                                            margin-left: 0.5rem;
                                        " class="d-none d-sm-block">
                                        <img :src="logoPath" class="rounded mx-auto d-block" alt="Logo"
                                            style="width: 128px; height: 128px" />
                                        <p class="text-center">
                                            {{ appInfo }}
                                        </p>
                                    </div>
                                    <p>
                                        <span v-html="appDescription"> </span>
                                        {{ appName }} is freely accessible for
                                        personal, academic, and commercial use,
                                        without login or registration.
                                    </p>
                                    <p>
                                        To get started, take a look at the
                                        <PluginPathLink plugin="help" :title="appName + ' Help System'">
                                        </PluginPathLink>, read the
                                        <PluginPathLink plugin="documentation" title="documentation"></PluginPathLink>,

                                        <!-- , view a
                                        <PluginPathLink
                                            plugin="videotutorials"
                                            title=" helpful video tutorial"
                                        >
                                        </PluginPathLink>, -->
                                        or load some
                                        <PluginPathLink plugin="openexampleproject" title="example data">
                                        </PluginPathLink>.
                                    </p>
                                    <!-- New Browser Warning Alert -->
                                    <Alert v-if="!isChromeBrowser" type="warning">
                                        We test {{ appName }} on many browsers to ensure it works well everywhere.
                                        However, if you experience any unexpected issues, consider Chrome for a smoother
                                        experience.
                                    </Alert>
                                    <!-- Additional Messages -->
                                    <Alert v-for="msg in additionalMessages" v-bind:key="msg.text" :type="msg.type">
                                        {{ msg.text }}
                                    </Alert>
                                    <!-- Existing Activity Focus Alert -->
                                    <Alert v-if="activityFocusModeInfo[0] !== 'All'" type="info">
                                        You are running {{ appName }} in
                                        <b>{{ activityFocusModeInfo[0] }}</b>
                                        mode. In this mode, {{ appName }} hides
                                        some tools so you can
                                        {{ activityFocusModeInfo[1] }} <a :href="standardModeUrl">Switch to All
                                            mode</a> to restore access to all tools.
                                    </Alert>
                                </div>
                            </div>
                            <ViewerPanel @onViewerLoaded="onViewerLoaded" />
                        </GoldenLayoutComponent>
                        <GoldenLayoutComponent name="Jobs" state="{}">
                            <QueuePanel />
                        </GoldenLayoutComponent>
                        <GoldenLayoutComponent name="Data" state="{}">
                            <DataPanel />
                        </GoldenLayoutComponent>
                        <!-- Moved Log Panel Here -->
                        <GoldenLayoutComponent name="Log" state="{}" :paddingSize="2">
                            <LogPanel />
                        </GoldenLayoutComponent>
                    </GoldenLayoutContainer>

                    <GoldenLayoutContainer type="column" :width="20">
                        <GoldenLayoutComponent name="Styles" state="{}" :width="20" :height="66">
                            <StylesPanel />
                        </GoldenLayoutComponent>

                        <GoldenLayoutComponent name="Information" state="{}" :width="20" :height="34">
                            <InformationPanel />
                        </GoldenLayoutComponent>
                    </GoldenLayoutContainer>
                </GoldenLayoutContainer>
                <!-- <GoldenLayoutContainer type="row" :height="20">
                    <GoldenLayoutComponent
                        name="Moose"
                        state="{}"
                        :paddingSize="0"
                    >
                    </GoldenLayoutComponent>
                </GoldenLayoutContainer> -->
            </GoldenLayoutContainer>
        </div>

        <div id="golden-layout"></div>
    </span>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";
import { ComponentContainer } from "golden-layout";
import GoldenLayoutContainer from "./GoldenLayoutContainer.vue";
import GoldenLayoutComponent from "./GoldenLayoutComponent.vue";
// import "bootstrap/js/dist/tab";
import { addBootstrapColorClasses } from "./GoldenLayoutBootstrapCompatibility";
import StylesPanel from "@/UI/Panels/Options/StylesPanel.vue";
import TreeView from "@/UI/Navigation/TreeView/TreeView.vue";
import LogPanel from "@/UI/Panels/Log/LogPanel.vue";
import * as api from "@/Api";
import InformationPanel from "@/UI/Panels/Information/InformationPanel.vue";
import QueuePanel from "@/UI/Panels/Queue/QueuePanel.vue";
import { goldenLayout, makeGoldenLayout } from "./GoldenLayoutCommon";
import ViewerPanel from "@/UI/Panels/Viewer/ViewerPanel.vue";
import DataPanel from "@/UI/Panels/Data/DataPanel.vue";
import { appName, appVersion, appDescription, logoPath } from "@/Core/GlobalVars";
import PluginPathLink from "@/UI/Navigation/PluginPathLink.vue";
import { getActivityFocusMode, getActvityFocusModeDescription } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { capitalize, lowerize } from "@/Core/Utils/StringUtils";
import Alert from "../Alert.vue";
import { detectBrowser, BrowserType } from "@/Core/HostOs"; // Import browser detection
import { fetcher, ResponseType } from "@/Core/Fetcher";
import { localStorageGetItem } from "@/Core/LocalStorage";
import { registerResetLayoutFunc } from "@/Api/Layout";
/**
 * GoldLayout component
 */
@Options({
    components: {
        GoldenLayoutContainer,
        GoldenLayoutComponent,
        ViewerPanel,
        StylesPanel,
        TreeView,
        LogPanel,
        InformationPanel,
        QueuePanel,
        DataPanel,
        PluginPathLink,
        Alert
    },
})
export default class GoldLayout extends Vue {
    viewerLoaded = false;
    additionalMessages: { text: string; type: string }[] = [];
    defaultLayoutConfig: any = null;
    private componentContents: { [key: string]: HTMLElement } = {};
    /**
     * Gets the activity focus mode information.
     *
     * @returns {string[]}  An array containing the mode and its description.
     */
    get activityFocusModeInfo(): string[] {
        const mode = getActivityFocusMode();
        const [shortDesc, longDesc] = getActvityFocusModeDescription(mode);

        return [capitalize(mode), lowerize(shortDesc)];
    }

    /**
     * Gets the URL to switch to standard mode.
     *
     * @returns {string}  The URL to switch to standard mode.
     */
    get standardModeUrl(): string {
        // Get the current URL, without the "focus" query parameter
        let url = new URL(window.location.href);
        url.searchParams.delete("focus");
        return url.toString();
    }

    /**
     * Checks if the current browser is Google Chrome.
     *
     * @returns {boolean} True if the browser is Chrome, false otherwise.
     */
    get isChromeBrowser(): boolean {
        return detectBrowser() === BrowserType.Chrome;
    }

    /**
     * Gets the app name and version.
     *
     * @returns {string}  The app name and version.
     */
    get appInfo(): string {
        return appName + " " + appVersion;
    }

    /**
     * Gets the logo path.
     *
     * @returns {string}  The logo path.
     */
    get logoPath(): string {
        return logoPath;
    }

    /**
     * Gets the app name.
     *
     * @returns {string}  The app name.
     */
    get appName(): string {
        return appName;
    }

    /**
     * Gets the app description.
     *
     * @returns {string}  The app description.
     */
    get appDescription(): string {
        return appDescription;
    }

    /**
     * Extract data from the DOM.
     *
     * @param {HTMLElement} dom  The DOM element to extract data from.
     * @returns {any[]}  The data extracted from the DOM.
     */
    private _convertDOMToData(dom: HTMLElement): any[] {
        let children = dom.children;
        let content = [];
        for (const el of children) {
            let child = el as HTMLElement;
            let type = child.getAttribute("data-type");
            let width = child.getAttribute("data-width");
            let height = child.getAttribute("data-height");

            if (type !== "component") {
                // It's a container
                content.push({
                    type: type,
                    content: this._convertDOMToData(child),
                    width: width,
                    height: height,
                });
            } else {
                // It's a component
                // let componentName = child.getAttribute("data-componentName");
                let title = child.getAttribute("data-title");
                let componentState = JSON.parse(
                    child.getAttribute("data-componentState") as string
                );
                // Base component configuration
                const componentConfig: any = {
                    type: type,
                    componentType: type, // GoldenLayout needs componentType
                    title: title,
                    componentState: componentState,
                    width: width,
                    height: height,
                };

                // Special handling for the "Moose" component
                if (title === 'Moose') {
                    componentConfig.hasHeaders = false; // Add this setting
                    componentConfig.isClosable = false; // Prevent closing
                }

                content.push(componentConfig);
            }
        }
        return content;
    }


    /**
     * Set up the Golden Layout.
     *
     * @param {HTMLElement} dataDOM  The DOM.
     * @param {any}         config   The Golden Layout configuration.
     */
    private _setupGoldenLayout(dataDOM: HTMLElement, config: any) {
        const glContainer = document.getElementById(
            "golden-layout"
        ) as HTMLElement;

        const myLayout = makeGoldenLayout(glContainer);

        myLayout.registerComponentFactoryFunction(
            "component",
            (container: ComponentContainer, componentState: any) => {
                const domID = componentState.domID;
                let el = this.componentContents[domID];
                if (!el) {
                    // If not cached, find it in the original template DOM
                    el = dataDOM.querySelector(`#${domID}`) as HTMLElement;
                    if (el) {
                        // and cache it for future use
                        this.componentContents[domID] = el;
                    }
                }
                if (el) {
                    container.element.appendChild(el);
                } else {
                    console.error(
                        `Golden Layout component content with ID #${domID} not found.`
                    );
                }
            }
        );

        // @ts-ignore
        myLayout.loadLayout(config);

        myLayout.on("stateChanged", () => {
            //now save the state
            // this.makeGoldenLayoutBootstrapCompatible();
            addBootstrapColorClasses();
        });

        // Listen to resize and update layout
        window.addEventListener("resize", () => {
            // @ts-ignore
            myLayout.setSize();
        });

        addBootstrapColorClasses();

        // this.makeGoldenLayoutBootstrapCompatible();
    }

    /**
     * Clears any selected molecules. This is called when the user clicks on the
     * background of the tree view.
     */
    clearSelection() {
        api.plugins.runPlugin("clearselection");
    }

    /**
     * Resets the layout to the default configuration without reloading the page.
     */
    resetLayout() {
        if (this.defaultLayoutConfig && goldenLayout) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            goldenLayout.loadLayout(this.defaultLayoutConfig);
        } else {
            console.error("Default layout configuration not available for reset.");
        }
    }
    /** mounted function */
    async mounted() {
        let dataDOM = this.$refs["golden-layout-data"] as HTMLElement;
        // First, generate and store the default layout from the template
        this.defaultLayoutConfig = {
            settings: {
                showPopoutIcon: false,
                // showCloseIcon: false
            },
            content: this._convertDOMToData(dataDOM),
        };
        // Register the reset function
        registerResetLayoutFunc(this.resetLayout.bind(this));
        const savedLayout = await localStorageGetItem("goldenLayoutState");
        const config = savedLayout ? savedLayout : this.defaultLayoutConfig;
        this._setupGoldenLayout(dataDOM, config);
        // It is now safe to remove dataDOM as its contents have been cached or moved.
        dataDOM.remove();
        try {
            const messages = await fetcher("messages.json", { responseType: ResponseType.JSON, cacheBust: true });
            if (Array.isArray(messages)) {
                this.additionalMessages = messages.filter(
                    (msg) =>
                        msg && typeof msg.text === "string" && typeof msg.type === "string"
                );
            }
        } catch (error: any) {
            // According to user request, log if parsing error, but ignore if file not found.
            // Axios error object has `response.status`.
            if (error.response && error.response.status === 404) {
                console.log("messages.json not found, skipping additional messages.");
            } else {
                console.error("Error fetching or parsing messages.json:", error);
            }
        }
    }
    /**
     * Called when the viewer is loaded.
     */
    onViewerLoaded() {
        this.viewerLoaded = true;
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
@import "golden-layout/dist/css/goldenlayout-base.css";
// @import "golden-layout/dist/css/themes/goldenlayout-dark-theme.css";
// @import "golden-layout/dist/css/themes/goldenlayout-translucent-theme.css";
// @import "golden-layout/dist/css/themes/goldenlayout-soda-theme.css";
// @import "golden-layout/dist/css/themes/goldenlayout-light-theme.css";
@import "./my-theme.css";
// @import "golden-layout/dist/css/themes/goldenlayout-borderless-dark-theme.css";

#golden-layout {
    /* Takes up whole screen */
    display: block;
    width: 100%;
    height: 100%;
}

#golden-layout-data {
    display: none;
}

.splash-screen {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 50;
}
</style>

<style lang="scss">
// When adding classes programmatically, css can't be scoped. See
// https://forum.vuejs.org/t/scoped-css-not-applied-for-programmatically-created-style-tag/45750/3

// Below is to make golden layout work with bootstrap
.reduced-padding-on-right {
    padding-right: 10px !important;
}

// I don't want anything to be closable, but I want it to still be draggable.
// This seems to be the way to do it.
.lm_close_tab,
.lm_close {
    display: none;
}

// Need to make hamburger menu look good.
.lm_header {
    z-index: 0;
}
</style>

<!-- <style lang="scss">
// When adding classes programmatically, css can't be scoped. See
// https://forum.vuejs.org/t/scoped-css-not-applied-for-programmatically-created-style-tag/45750/3

// Below is to make golden layout work with bootstrap
.lm_tab {
  height: inherit !important;
  margin-top: inherit !important;
  padding: inherit !important;
  padding-right: inherit !important;
}

.lm_header .lm_tab .lm_title {
  display: inherit !important;
}

.tab-content {
  // alarming magic number
  margin-top: 25px;
}
</style> -->
