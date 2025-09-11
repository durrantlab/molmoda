<template>
  <PluginComponent
    v-model="open"
    :infoPayload="infoPayload"
    cancelBtnTxt="Done"
    actionBtnTxt=""
    @onPopupDone="onPopupDone"
    @onUserArgChanged="onUserArgChanged"
    @onMolCountsChanged="onMolCountsChanged"
  >
  <img :src="lazyLoadedImg" class="img-thumbnail mb-2 mx-auto" style="display:block; width:192px; height: 192px;" />
    <p>
      The following organizations and individuals have contributed, directly or
      indirectly, to the {{ appName }} project:
    </p>

    <ul>
      <li
        v-for="credit of contributorCreditsToShowInOrder"
        v-bind:key="credit.name"
      >
        <a v-if="credit.url" :href="credit.url" target="_blank">{{
          credit.name
        }}</a>
        <span v-else>{{ credit.name }}</span>
      </li>
    </ul>

    <p>
      We also thank the following open-source projects that make {{ appName }}
      possible:
    </p>

    <ul>
      <li
        v-for="credit of softwareCreditsToShowInOrder"
        v-bind:key="credit.name"
      >
        <a :href="credit.url" target="_blank">{{ credit.name }}</a> (<a
    :href="getLicenseUrl(credit)"
          target="_blank"
          >{{ credit.license.name }} </a
        >)
      </li>
    </ul>
    <p>This version of {{ appName }} was compiled on {{ appCompileTime }}.</p>
  </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import { Prop } from "vue-property-decorator";
import { appName, appCompileTime, appIntro, appDetails, logoPath } from "@/Core/GlobalVars";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { Tag } from "./ActivityFocus/ActivityFocusUtils";
import { detectPlatform, HostOs } from "@/Core/HostOs";

/** AboutPlugin */
@Options({
  components: {
    PluginComponent,
  },
})
export default class AboutPlugin extends PluginParentClass {
  @Prop({ required: true }) softwareCreditsToShow!: ISoftwareCredit[];
  @Prop({ required: true }) contributorCreditsToShow!: IContributorCredit[];

  menuPath = detectPlatform() === HostOs.Mac ? [`[1] ${appName}`, "[1] About..."] : ["Help", "[9] About..."];
  
  title = "About";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "about";
  intro = appIntro;
  details = appDetails;
  userArgDefaults: UserArg[] = [];
  
  logJob = false;
  tags = [Tag.All];

  lazyLoadedImg = "";

  /**
   * Get the software credits to show in order.
   *
   * @returns {ISoftwareCredit[]} The software credits to show, in order.
   */
  get softwareCreditsToShowInOrder(): ISoftwareCredit[] {
    // Sort by name.
    return this.softwareCreditsToShow.sort((a, b) => {
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
  }

  /**
   * Get the contributor credits to show in order.
   *
   * @returns {IContributorCredit[]} The contributor credits to show, in order.
   */
  get contributorCreditsToShowInOrder(): IContributorCredit[] {
    // Sort by last name in name
    return this.contributorCreditsToShow.sort((a, b) => {
      const an = (a.name.split(" ").pop() as string).toLowerCase();
      const bn = (b.name.split(" ").pop() as string).toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
  }

  /**
   * Get the license URL for a software credit. Prioritizes licenseUrl over
   * the default license URL.
   *
   * @param {ISoftwareCredit} credit The software credit.
   * @returns {string} The URL for the license.
   */
  getLicenseUrl(credit: ISoftwareCredit): string {
    return credit.licenseUrl || credit.license.url;
  }
  
  /**
   * Get the name of the app.
   *
   * @returns {string} The name of the app.
   */
  get appName(): string {
    return appName;
  }

  /**
   * Get the compile time of the app.
   *
   * @returns {string} The compile time of the app.
   */
  get appCompileTime(): string {
    return appCompileTime;
  }

  /**
   * Load the image before the popup opens.
   */
  async onBeforePopupOpen() {
    this.lazyLoadedImg = logoPath;
  }

  /**
   * Runs when the popup closes via done button. Here, does nothing.
   */
  onPopupDone() {
    return;
  }

  /**
   * Every plugin runs some job. This is the function that does the
   * job running. About plugin does not have a job.
   * 
   * @returns {Promise<void>}  Resolves when the job is done.
   */
  runJobInBrowser(): Promise<void> {
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
      closePlugin: new TestCmdList().pressPopupButton(".cancel-btn", this.pluginId),
    };
  }
}
</script>

<style scoped lang="scss">
.inverse-indent {
  text-indent: -1em;
  padding-left: 1em;
}
</style>
