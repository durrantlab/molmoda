<template>
  <div class="log-container" ref="log-container">
    <table class="table table-striped table-sm">
      <!-- <thead>
    <tr>
      <td scope="col">Time</td>
      <td scope="col">Message</td>
    </tr>
  </thead> -->
      <tbody>
        <tr v-for="log in logsToShow" :key="log.timestamp">
          <td style="width: 160px">
            <small>{{ log.timestamp }}</small>
          </td>
          <td>
            <small>{{ log.message }}</small>
          </td>
          <td>
            <small>{{ log.jobId }}</small>
          </td>
          <td style="max-width:50%">
            <small>{{ log.parameters }}</small>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Watch } from "vue-property-decorator";
import { ILog } from "./LogUtils";

/**
 * StylesPanel component
 */
@Options({
  components: {},
})
export default class LogPanel extends Vue {
  /**
   * Get the logs to show. Ones that have any message.
   * 
   * @returns {ILog[]}  The logs to show.
   */
  get logsToShow(): ILog[] {
    return this.$store.state.log.filter((log: ILog) => {
      return log.message !== ""
    });
  }

  /**
   * Watch for changes in the logsToShow property. Scroll to bottom on change.
   */
  @Watch("logsToShow")
  onLogsToShowChanged() {
    // It's changed, so scroll to the bottom.
    this.$nextTick(() => {
      const logPanel = this.$refs["log-container"] as HTMLElement;
      if (logPanel) {
        logPanel.scrollTop = logPanel.scrollHeight;
      }
    });
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
  .log-container {
    overflow-y: scroll; 
    height: 100%;
    scroll-behavior: smooth;
  }
</style>
