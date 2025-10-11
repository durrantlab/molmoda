<template>
  <PluginComponent v-model="open" :infoPayload="infoPayload" actionBtnTxt="Apply" @onPopupDone="onPopupDone"
    @onUserArgChanged="onUserArgChanged" @onMolCountsChanged="onMolCountsChanged">
    <template #afterForm>
      <div v-if="selectedTag" class="mt-3">
        <Alert type="info">{{ tagDescription(selectedTag) }}</Alert>
      </div>
      <Alert type="warning">
        Changing the activity focus will restart {{ appName }}. Consider saving
        your work first using
        <PluginPathLink plugin="savemolecules"></PluginPathLink>
      </Alert>
    </template>
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
import {
  getActivityFocusMode,
  getActvityFocusModeDescription,
  Tag,
} from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { ITest } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { appName } from "@/Core/GlobalVars";
import { capitalize } from "@/Core/Utils/StringUtils";
import { reloadPage } from "@/Core/Utils/CloseAppUtils";

/**
 * ActivityFocusPlugin
 */
@Options({
  components: {
    PluginComponent,
    Alert,
    PluginPathLink,
  },
})
export default class ActivityFocusPlugin extends PluginParentClass {
  menuPath = "View/[9] Activity/Activity Focus...";
  title = "Activity Focus";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [];
  pluginId = "activityfocus";
  intro = "Choose which activity to focus on.";
  details = `This plugin adapts the ${appName} interface to show tools and features most relevant to your chosen activity.`;
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
          description: capitalize(tag.replace("-", " ")),
        } as IUserArgOption)
      ),
      description: "Select which activity you want to focus on.",
    } as IUserArgSelect,
  ];

  /**
   * Gets a tag description.
   *
   * @param {string} selectedTag  The selected tag.
   * @returns {string}  The tag description.
   */
  tagDescription(selectedTag: string): string {
    return getActvityFocusModeDescription(selectedTag).join(" ");
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
   * Runs when the user changes an argument. Updates the selected tag.
   */
  onUserArgChange() {
    this.selectedTag = this.getUserArg("selectedMode") as Tag;
  }

  /**
   * Runs when the user first starts the plugin.
   *
   * @returns {Promise<void>}  Promise that resolves when the plugin is finished
   *                           starting.
   */
  async onBeforePopupOpen() {
    // Set the initial mode based on URL
    const mode = getActivityFocusMode();
    if (mode && Object.values(Tag).includes(mode as Tag)) {
      this.setUserArg("selectedMode", mode);
      this.selectedTag = mode as Tag;
    }
  }

  /**
   * Runs when the user closes the plugin.
   */
  onPopupDone() {
    const selectedMode = this.getUserArg("selectedMode");
    // Create new URL with mode parameter
    const url = new URL(window.location.origin + window.location.pathname);

    if (selectedMode !== Tag.All) {
      url.searchParams.set("focus", selectedMode);
    }

    // Reload the page with the new URL
    reloadPage(url.toString());
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @returns {Promise<void>}  Resolves when the job is done.
   */
  async runJobInBrowser(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Gets the test commands for the plugin.
   *
   * @returns {ITest[]}  The selenium test commands.
   */
  async getTests(): Promise<ITest[]> {
    const tourTest: ITest = {
      name: "Full Tour of Activity Focus",
      pluginOpen: () =>
        new TestCmdList()
          .tourNote(
            "This plugin lets you customize the user interface to focus on a specific activity, like 'Docking' or 'Visualization', hiding less relevant tools.",
            `#modal-${this.pluginId} .modal-body`
          )
          .tourNote(
            "Select an activity from this dropdown. For this tour, let's select 'Docking'.",
            `#selectedMode-${this.pluginId}-item`
          )
          .setUserArg("selectedMode", Tag.Docking, this.pluginId)
          .waitUntilRegex(
            `#modal-${this.pluginId} .alert-info`,
            "Focus on computational prediction"
          ),
      closePlugin: () =>
        new TestCmdList()
          .tourNote(
            "Clicking 'Apply' will restart the application in the selected mode. Your work should be saved first. We will cancel for now.",
            `#modal-${this.pluginId} .action-btn`
          )
          .pressPopupButton(".cancel-btn", this.pluginId),
    };
    return [
      tourTest,
      // Test selecting different modes
      {
        pluginOpen: () =>
          new TestCmdList().setUserArg("selectedMode", Tag.Docking, this.pluginId),
      },
      {
        pluginOpen: () =>
          new TestCmdList().setUserArg(
            "selectedMode",
            Tag.Visualization,
            this.pluginId
          ),
        // afterPluginCloses: () => new TestCmdList()
        //   .waitUntilRegex(
        //     "#modal-statcollection",
        //     "Allow Cookies?"
        //   ),
      },
    ];
  }
}
</script>

<style scoped lang="scss"></style>