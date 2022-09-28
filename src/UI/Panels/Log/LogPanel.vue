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
            <small>{{ getMessage(log) }}</small>
          </td>
          <!-- <td>
            <small>{{ log.jobId }}</small>
          </td> -->
          <td style="max-width:50%">
            <small v-html="log.parameters"></small>
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

    // this.simplifyRapidlyAddedLogItems();
  }

  /**
   * Adds the jobid to the message.
   * 
   * @param {ILog} log  The log to get the message for.
   * @returns {string}  The message.
   */
  getMessage(log: ILog): string {
    if (log.jobId === undefined) {
      return log.message;
    }

    const jobPrts = log.message.split(" ");
    jobPrts[1] = `"${jobPrts[1]}:${log.jobId.replace(/^id_/g, "")}"`;
    return jobPrts.join(" ");
  }

  /**
   * Simplify the log items that are rapidly added. Leave only the "ended" log
   * entry if many entires added rapidly.
   */
  simplifyRapidlyAddedLogItems() {
    // If multiple log entries have been added in rapid succession, merge them.
    const logEntries = this.logsToShow;
    const lastLogEntry = logEntries[logEntries.length - 1];
    const lastJobId = lastLogEntry.jobId;

    if (lastJobId === undefined) {
      // Some entries don't have job IDs, so we can't merge them.
      return;
    }

    // Keep only logs with same id
    const logEntriesWithLastId = logEntries.filter((log: ILog) => {
      return log.jobId === lastJobId;
    });

    if (logEntriesWithLastId.length <= 1) {
      // There's only one log entry with the same ID, so we can't merge
      // anything.
      return;
    }

    const timestampSecs = logEntriesWithLastId.map((log: ILog) => {
      return log.timestampSecs as number;
    }).sort();

    // If span is less than two seconds, merge them
    if (timestampSecs[timestampSecs.length - 1] - timestampSecs[0] < 2) {
      let newEntry = {
        jobId: lastJobId,
        message: lastLogEntry.message,
        parameters: logEntriesWithLastId.map((log: ILog) => {
          return log.parameters;
        }).join(" "),
        timestamp: lastLogEntry.timestamp,
        timestampSecs: lastLogEntry.timestampSecs
      } as ILog;

      // Remove ones with same id
      const logEntriesWithoutLastId = logEntries.filter((logEntry: ILog) => {
        return logEntry.jobId !== lastJobId;
      });

      // commit to store
      this.$store.commit("setVar", {
        name: "log",
        val: [...logEntriesWithoutLastId, newEntry]
      });
    }
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
