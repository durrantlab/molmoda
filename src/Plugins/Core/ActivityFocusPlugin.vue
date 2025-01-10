<template>
    <PluginComponent
      v-model="open"
      :infoPayload="infoPayload"
      actionBtnTxt="Apply"
      @onPopupDone="onPopupDone"
      @onUserArgChanged="onUserArgChanged"
      @onMolCountsChanged="onMolCountsChanged"
    >
      <template #afterForm>
        <div v-if="selectedTag" class="mt-3">
          <Alert type="info">{{ tagDescriptions[selectedTag] }}</Alert>
        </div>
        <Alert type="warning">
          Changing the activity focus will restart the application. Consider
          saving your work first using
          <PluginPathLink plugin="savemolecules"></PluginPathLink> </Alert
      ></template>
    </PluginComponent>
  </template>
  
  <script lang="ts">
  import { Options } from "vue-class-component";
  import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
  import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
  import {
    IContributorCredit,
    ISoftwareCredit,
  } from "@/Plugins/PluginInterfaces";
  import {
    UserArg,
    UserArgType,
    IUserArgSelect,
    IUserArgOption,
  } from "@/UI/Forms/FormFull/FormFullInterfaces";
  import Alert from "@/UI/Layout/Alert.vue";
  import PluginPathLink from "@/UI/Navigation/PluginPathLink.vue";
  import { Tag, tagDescriptions } from "@/Plugins/Tags/Tags";
  import { ITest } from "@/Testing/TestCmd";
  import { TestCmdList } from "@/Testing/TestCmdList";
  import { getUrlParam } from "@/Core/UrlParams";
  import { appName } from "@/Core/GlobalVars";
  
  @Options({
    components: {
      PluginComponent,
      Alert,
      PluginPathLink,
    },
  })
  export default class ActivityFocusPlugin extends PluginParentClass {
    menuPath = appName + "/Activity Focus...";
    title = "Activity Focus";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "activityfocus";
    intro = "Choose which activity to focus on.";
    details =
      "Adapts the interface to show tools and features most relevant to your current activity.";
    tags = [Tag.All];
  
    selectedTag: Tag | null = null;
  
    userArgDefaults: UserArg[] = [
      {
        id: "selectedMode",
        type: UserArgType.Select,
        label: "Activity focus",
        val: Tag.All,
        options: Object.values(Tag).map(
          (tag) =>
            ({
              val: tag,
              description: this.capitalizeFirstLetter(tag.replace("-", " ")),
            } as IUserArgOption)
        ),
        description: "Select which activity you want to focus on.",
      } as IUserArgSelect,
    ];
  
    get tagDescriptions() {
      return tagDescriptions;
    }
  
    capitalizeFirstLetter(string: string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
  
    onUserArgChange() {
      this.selectedTag = this.getUserArg("selectedMode") as Tag;
    }
  
    async onBeforePopupOpen() {
      // Set the initial mode based on URL
      let mode = getUrlParam("focus");
      if (mode === null) {
        mode = "all";
      }
      if (mode && Object.values(Tag).includes(mode as Tag)) {
        this.setUserArg("selectedMode", mode);
        this.selectedTag = mode as Tag;
      }
    }
  
    onPopupDone() {
      const selectedMode = this.getUserArg("selectedMode");
      // Create new URL with mode parameter
      const url = new URL(window.location.origin + window.location.pathname);

      if (selectedMode !== Tag.All) {
        url.searchParams.set("focus", selectedMode);
      }
  
      // Reload the page with the new URL
      window.location.href = url.toString();
    }
  
    async runJobInBrowser(): Promise<void> {
      return Promise.resolve();
    }
  
    async getTests(): Promise<ITest[]> {
      return [
        // Test selecting different modes
        {
          pluginOpen: new TestCmdList().setUserArg(
            "selectedMode",
            Tag.Docking,
            this.pluginId
          ),
          afterPluginCloses: new TestCmdList().waitUntilRegex(
            "#log",
            "Reloading page"
          ),
        },
        {
          pluginOpen: new TestCmdList().setUserArg(
            "selectedMode",
            Tag.Visualization,
            this.pluginId
          ),
          afterPluginCloses: new TestCmdList().waitUntilRegex(
            "#log",
            "Reloading page"
          ),
        },
      ];
    }
  }
  </script>
  
  <style scoped lang="scss">
  </style>