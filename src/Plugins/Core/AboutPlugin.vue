<template>
  <Popup title="About" v-model="open" cancelBtnTxt="Done">
    <p v-html="intro"></p>

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

    <!-- <span
      v-for="credit in softwareCreditsToShowInOrder"
      v-bind:key="credit.name"
      class="badge bg-primary rounded-pill"
      style="margin-right: 4px"
    >
      <a :href="credit.url" target="_blank" class="text-white">
        {{ credit.name }}
      </a>
      |&nbsp;<a :href="credit.license.url" target="_blank" class="text-white">
        {{ credit.license.name }}
      </a>
    </span> -->
  </Popup>
</template>

<script lang="ts">
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import { Prop } from "vue-property-decorator";
import { PopupPluginParent } from "@/Plugins/Parents/PopupPluginParent";
import { appName } from "@/Core/AppName";

/** AboutPlugin */
@Options({
  components: {
    Popup,
  },
})
export default class AboutPlugin extends PopupPluginParent {
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
   * Runs before the popup opens. Will almost always need this, so requiring
   * children to define it.
   */
  beforePopupOpen(): void {
    return;
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
  runJob() {
    return;
  }
}
</script>

<style scoped lang="scss">
.inverse-indent {
  text-indent: -1em;
  padding-left: 1em;
}
</style>
