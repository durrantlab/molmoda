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
import { PluginParent } from "@/Plugins/PluginParent";
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { Options } from "vue-class-component";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import { Prop } from "vue-property-decorator";
import { appName } from "@/main";
import { PopupPluginParent } from "../PopupPluginParent";

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

  get appName(): string {
    return appName;
  }

  onPopupDone(): void {
    // Does nothing
    return;
  }

  runJob(parameters: any) {
    // About plugin does not have a job.
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
