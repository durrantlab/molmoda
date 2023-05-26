<template>
  <PluginComponent
    :userArgs="userArgs"
    v-model="open"
    title="About"
    cancelBtnTxt="Done"
    actionBtnTxt=""
    :intro="intro"
    @onPopupDone="onPopupDone"
    :pluginId="pluginId"
  >
  <img :src="lazyLoadedImg" class="img-thumbnail mb-2 mx-auto" style="display:block;" />
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
          :href="credit.license.url"
          target="_blank"
          >{{ credit.license.name }} </a
        >)
      </li>
    </ul>
  </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import { Prop } from "vue-property-decorator";
import { appName } from "@/Core/AppName";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";

/** AboutPlugin */
@Options({
  components: {
    PluginComponent,
  },
})
export default class AboutPlugin extends PluginParentClass {
  @Prop({ required: true }) softwareCreditsToShow!: ISoftwareCredit[];
  @Prop({ required: true }) contributorCreditsToShow!: IContributorCredit[];

  menuPath = ["[3] Biotite", "[1] About"];
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "about";
  intro = `TODO: Info about ${appName} here.`;

  userArgs: FormElement[] = [];
  alwaysEnabled = true;
  logJob = false;
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
   * Get the name of the app.
   *
   * @returns {string} The name of the app.
   */
  get appName(): string {
    return appName;
  }

  /**
   * Load the image before the popup opens.
   */
  onBeforePopupOpen() {
    this.lazyLoadedImg = "./img/icons/android-chrome-192x192.png";
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
   */
  runJobInBrowser(): void {
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
      closePlugin: new TestCmdList().pressPopupButton(".cancel-btn", this.pluginId).cmds,
      afterPluginCloses: [],
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
