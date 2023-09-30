<template>
    <span>
        <div ref="golden-layout-data" id="golden-layout-data">
            <GoldenLayoutContainer type="column">
                <GoldenLayoutContainer type="row" :height="80">
                    <GoldenLayoutComponent
                        name="Navigator"
                        extraClass="sortable-group"
                        state="{}"
                        :width="20"
                    >
                        <div
                            @click.self="clearSelection"
                            style="height: 100%; overflow-x: clip"
                        >
                            <TreeView />
                        </div>
                    </GoldenLayoutComponent>

                    <GoldenLayoutContainer type="stack" :width="60">
                        <GoldenLayoutComponent
                            name="Viewer"
                            state="{}"
                            :style="'height:100%; padding:0 !important;'"
                        >
                            <div v-if="!viewerLoaded" class="splash-screen">
                                <div class="container-fluid p-2">
                                    <div class="row">
                                        <div class="col-12">
                                            <img
                                                src="img/icons/android-chrome-192x192.png"
                                                class="rounded mx-auto d-block"
                                                alt="Logo"
                                                style="
                                                    width: 192px;
                                                    height: 192px;
                                                "
                                            />
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-12">
                                            <p class="text-center">
                                                {{ appInfo }}
                                            </p>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-12">
                                            <p>
                                                <span
                                                    v-html="appDescription"
                                                ></span>
                                                To get started, take a look at
                                                the
                                                <PluginPathLink
                                                    plugin="help"
                                                    :title='appName + " Help System"'
                                                ></PluginPathLink
                                                >.
                                            </p>
                                        </div>
                                    </div>
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
                    </GoldenLayoutContainer>

                    <GoldenLayoutContainer type="column" :width="20">
                        <GoldenLayoutComponent
                            name="Styles"
                            state="{}"
                            :width="20"
                        >
                            <StylesPanel />
                        </GoldenLayoutComponent>

                        <GoldenLayoutComponent
                            name="Information"
                            state="{}"
                            :width="20"
                        >
                            <InformationPanel />
                        </GoldenLayoutComponent>
                    </GoldenLayoutContainer>
                </GoldenLayoutContainer>
                <GoldenLayoutContainer type="row" :height="20">
                    <GoldenLayoutComponent
                        name="Log"
                        state="{}"
                        :paddingSize="2"
                    >
                        <LogPanel />
                    </GoldenLayoutComponent>
                </GoldenLayoutContainer>
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
import { makeGoldenLayout } from "./GoldenLayoutCommon";
import ViewerPanel from "@/UI/Panels/Viewer/ViewerPanel.vue";
import DataPanel from "@/UI/Panels/Data/DataPanel.vue";
import { appName, appVersion, appDescription } from "@/Core/AppInfo";
import PluginPathLink from "@/UI/Navigation/PluginPathLink.vue";

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
    },
})
export default class GoldLayout extends Vue {
    viewerLoaded = false;

    /**
     * Gets the app name and version.
     *
     * @returns {string}  The app name and version.
     */
    get appInfo(): string {
        return appName + " " + appVersion;
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
                content.push({
                    type: type,
                    componentType: type,
                    // componentName: componentName,
                    title: title,
                    componentState: componentState,
                    width: width,
                    height: height,
                });
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
                // container.element.innerHTML = "<h2>" + componentState.label + "</h2>";
                let domID = componentState.domID;

                // search dataDOM for the element with the given ID
                let el = dataDOM.querySelector(`#${domID}`) as HTMLElement;

                // Move el to the container
                container.element.appendChild(el);

                // Also add classes to make it work with bootstrap
                // container.element
                // container.tab.element
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

    /** mounted function */
    mounted() {
        let dataDOM = this.$refs["golden-layout-data"] as HTMLElement;

        let config = {
            settings: {
                showPopoutIcon: false,
                // showCloseIcon: false
            },
            content: this._convertDOMToData(dataDOM),
        };

        this._setupGoldenLayout(dataDOM, config);

        // Remove dataDOM
        dataDOM.remove();
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
