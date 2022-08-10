<template>
  <div ref="golden-layout-data" id="golden-layout-data">
    <GoldenLayoutContainer type="column">
      <GoldenLayoutContainer type="row" :height="90">
        <GoldenLayoutComponent name="Molecules" extraClass="sortable-group" state="{}" :width="20">
          <TreeView />
        </GoldenLayoutComponent>

        <GoldenLayoutComponent
          name="Viewer"
          state="{}"
          :width="60"
          :style="'height:100%;'"
        >
          <ViewerPanel />
        </GoldenLayoutComponent>

        <GoldenLayoutComponent name="Options" state="{}" :width="20">
          <OptionsPanel />
        </GoldenLayoutComponent>
      </GoldenLayoutContainer>
      <GoldenLayoutContainer type="row" :height="10">
        <GoldenLayoutComponent name="Information" state="{}"
          >CCC</GoldenLayoutComponent
        >
      </GoldenLayoutContainer>
    </GoldenLayoutContainer>
  </div>

  <div id="golden-layout"></div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";
import { GoldenLayout, ComponentContainer } from "golden-layout";
import GoldenLayoutContainer from "./GoldenLayoutContainer.vue";
import GoldenLayoutComponent from "./GoldenLayoutComponent.vue";
import "bootstrap/js/dist/tab";
import { addBootstrapColorClasses } from "./GoldenLayoutBootstrapCompatibility";
import ViewerPanel from "@/UI/Panels/Viewer/ViewerPanel.vue";
import OptionsPanel from "@/UI/Panels/Options/OptionsPanel.vue";
import TreeView from "@/UI/Navigation/TreeView/TreeView.vue";

@Options({
  components: {
    GoldenLayoutContainer,
    GoldenLayoutComponent,
    ViewerPanel,
    OptionsPanel,
    TreeView,
  },
})
export default class GoldLayout extends Vue {
  // msg!: string;

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

  private _setupGoldenLayout(dataDOM: HTMLElement, config: any) {
    const glContainer = document.getElementById("golden-layout") as HTMLElement;
    const myLayout = new GoldenLayout(glContainer);
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

  // Mounted
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
  width: 100%;
  height: 100%;
}

#golden-layout-data {
  display: none;
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
