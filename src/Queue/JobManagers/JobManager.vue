<template>
  <div>
    <span
      v-for="(jobManagerName, idx) of jobManagerNames"
      :key="jobManagerName"
    >
      <Table
        v-if="jobStatusesForTable[idx] && jobStatusesForTable[idx].rows.length > 0"
        :tableData="jobStatusesForTable[idx]"
        :caption="jobManagerNames[idx]"
      />
    </span>
  </div>
</template>
  
  <script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import Table, { ITableData } from "@/UI/Components/Table.vue";
import { Options, Vue } from "vue-class-component";
import { IJobStatusInfo } from "../Types/TypesEndpointResponse";
import { jobManagers } from "./JobManagerParent";

const headers = [
  { text: "Job ID" },
  { text: "Processors" },
  { text: "Status" },
  { text: "Time" },
  //   { text: "Start Time"},
];

/**
 * JobManager
 */
@Options({
  components: {
    Table,
  },
})
export default class JobManager extends Vue {
  //   @Prop({ required: true }) jobManagers!: JobManagerParent[];

  // jobManagers: JobManagerParent[] = [];
  jobManagerNames: string[] = [];
  jobStatusInfos: IJobStatusInfo[][] = [];

  /**
   * Get the job statuses, sorted and formatted.
   *
   * @returns {ITableData[]}.  The job statuses, sorted and formatted.
   */
  get jobStatusesForTable(): ITableData[] {
    if (this.jobStatusInfos.length === 0) {
      // Not ready yet.
      return [];
    }

    const jobStatuseInfos: ITableData[] = [];

    for (const jobStatusInfo of this.jobStatusInfos) {
      let rows = jobStatusInfo.map((r) => {
        return {
          "Job ID": `${r.commandName}:${r.id.slice(3)}`,
          Processors: r.numProcessors?.toString() as string,
          Status: r.status.toString(),
          Time: r.timestamp as string | number,
        };
      });

      // Sort first by status (pending, running, anything else), then by
      // timestamp.
      rows = rows.sort((a, b) => {
        if (a.Status === b.Status) {
          // Status is the same, so sort by timestamp.
          return a.Time < b.Time ? 1 : -1;
        } else {
            const order = ["pending", "running"];
            const aIndex = order.indexOf(a.Status);
            const bIndex = order.indexOf(b.Status);
            if (aIndex === -1) {
              // a is not in the order array (done, error, incorporated, etc.),
              // so it should be last.
              return 1;
            } else if (bIndex === -1) {
              // b is not in the order array, so it should be last.
              return -1;
            } else {
              // Both are in the order array, so sort by the order array.
              return aIndex < bIndex ? -1 : 1;
            }
        }
      });

      // Replace timestamp with string version
        rows = rows.map((r) => {
            r.Time = new Date(r.Time).toLocaleString();
            return r;
        });

      jobStatuseInfos.push({
        headers: headers,
        rows: rows,
      });
    }

    return jobStatuseInfos;
  }

  /**
   * The mounted function.
   */
  mounted() {
    // Periodically pull the job manager data
    setInterval(() => {
      this.jobManagerNames = jobManagers.map((j) => j.jobManagerName);

      const promsManagers = jobManagers.map((jm) => jm.getJobs());
      Promise.all(promsManagers)
        .then((managersResults) => {
          // if (managersResults[0].length > 0) debugger
          this.jobStatusInfos = managersResults;
          return;
        })
        .catch((err) => {
          console.log(err);
          return;
        });
    }, 1000);
  }
}
</script>
  <!-- Add "scoped" attribute to limit CSS to this component only -->
  <style scoped lang="scss">
</style>
  
  