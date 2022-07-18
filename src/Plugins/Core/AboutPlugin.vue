<template>
  <Popup title="About" v-model="open" cancelBtnTxt="Done">
    <p>TODO: Info about biotite here.</p>

    <p>
      We would like to thank the following open-source projects that make
      biotite possible:
    </p>
    <span
      v-for="credit in creditsToShowInOrder"
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
    </span>
  </Popup>
</template>

<script lang="ts">
import { PluginParent } from "@/Plugins/PluginParent";
import Popup from "@/UI/Layout/Popup.vue";
import { Options } from "vue-class-component";
import { ICredit } from "../PluginInterfaces";
import { Prop } from "vue-property-decorator";

@Options({
  components: {
    Popup,
  },
})
export default class AboutPlugin extends PluginParent {
  @Prop({ required: true }) creditsToShow!: ICredit[];

  menuPath = ["Biotite", "About"];
  credits: ICredit[] = [];
  pluginId = "about";
  
  open = false;

  get creditsToShowInOrder(): ICredit[] {
    // Sort by name.
    return this.creditsToShow.sort((a, b) => {
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
  }

  start(): void {
    this.open = true;
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
