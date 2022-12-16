<template>
  <div>
    <span
      v-for="(jobManagerName, idx) of jobManagerNames"
      :key="jobManagerName"
    >
      <div
        v-if="
          jobStatusesForTable[idx] && jobStatusesForTable[idx].rows.length > 0
        "
      >
        <Table
          :tableData="jobStatusesForTable[idx]"
          :caption="jobManagerNames[idx]"
          @cancelJob="cancelJob"
          :allowTextWrap="false"
        >
          <template #afterHeader>
            <div
              class="me-3 badge bg-primary cancel-pending-btn"
              @click="cancelAll(jobManagerName)"
            >
              <!-- <button type="button" class="btn btn-primary btn-sm"> -->
              Cancel All
              <!-- </button> -->
            </div>
          </template>
        </Table>

        <!-- <div class="btn-group" role="group" style="float:right; top:-12px;" aria-label="Basic example"> -->
        <!-- <div
          role="group"
          style="float: right; top: -12px; position: relative"
          aria-label="Basic example"
        >
          <button type="button" class="btn btn-primary btn-sm">
            Cancel Pending
          </button>
        </div> -->
        <!-- <button type="button" class="btn btn-primary btn-sm ms-2">Cancel All</button> -->

        <!-- <button
          type="button"
          class="btn-close btn-close-white"
          data-bs-dismiss="modal"
          aria-label="Close"
        >
          moo
        </button> -->
      </div>
      <div v-else>
        <div class="table-title">{{ jobManagerNames[idx] }}</div>
        <p style="font-size: 14px">You have not yet submitted any jobs</p>
      </div>
    </span>
  </div>
</template>
  
  <script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { formatTimestamp } from "@/Core/Utils";
import Table from "@/UI/Components/Table/Table.vue";
import {
  ICellValue,
  ITableData,
  CellValue,
  IHeader,
} from "@/UI/Components/Table/Types";
import { Options, Vue } from "vue-class-component";
import { IJobStatusInfo, JobStatus } from "../Types/TypesEndpointResponse";
import { JobManagerParent, jobManagers } from "./JobManagerParent";

const headers: IHeader[] = [
  {
    text: "",
    width: 20,
    showColumnFunc: (tableData: ITableData): boolean => {
      const statuses = new Set(
        tableData.rows.map((r) => (r.Status as ICellValue).val)
      );

      // Pending and running jobs can be cancelled. If there are any there, you
      // should show this column.
      return statuses.has(JobStatus.Pending) || statuses.has(JobStatus.Running);
    },
  },
  { text: "Job ID", note: "Job ID (type:id)" },
  { text: "Procs", note: "Number of Processors", width: 50 },
  { text: "Status", note: "Job Status" },
  { text: "Submit", note: "Job Submit Time" },
  { text: "Start", note: "Job Start Time" },
  { text: "End", note: "Job End Time" },
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
  // @Prop({ default: true }) allowTextWrap!: boolean;

  // jobManagers: JobManagerParent[] = [];
  jobManagerNames: string[] = [];
  jobStatusInfos: IJobStatusInfo[][] = [];

  /**
   * Get the job statuses, formatted.
   *
   * @returns {ITableData[]}.  The job statuses, formatted.
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
          "": {
            val: "",
            iconClasses: "far fa-rectangle-xmark",
            iconClickEmitName: "cancelJob",
            iconShowFilterFunc: (row: {
              [key: string]: CellValue;
            }): boolean => {
              const status = (row.Status as ICellValue).val as JobStatus;

              // Only pending and running jobs can be cancelled.
              return (
                [JobStatus.Pending, JobStatus.Running].indexOf(status) >= 0
              );
            },
          } as ICellValue,
          "Job ID": `${r.commandName}:${r.id.slice(3)}`,
          Procs: r.numProcessors?.toString() as string,
          Status: r.status.toString(),
          Submit: r.submitTime as string | number,
          Start: r.startTime as string | number,
          End: r.endTime as string | number,
        };
      });

      // Reverse rows so that the most recent job is at the top.
      // rows = rows.reverse();

      // Replace timestamp with string version
      rows = rows.map((r) => {
        r.Submit = formatTimestamp(r.Submit as number);
        r.Start = formatTimestamp(r.Start as number);
        r.End = formatTimestamp(r.End as number);

        // r.Time = new Date(r.Time).toLocaleString();
        return r;
      });

      jobStatuseInfos.push({
        headers: headers,
        rows: rows,
      });
    }

    // if (jobStatuseInfos[0].rows.length !== 0) {
    //   debugger;
    // }

    return jobStatuseInfos;
  }

  /**
   * Cancels all jobs when the user clicks the "Cancel All" button.
   *
   * @param {string} jobManagerName  The name of the job manager.
   */
  cancelAll(jobManagerName: string) {
    // Get manager with this name
    const jobManager = jobManagers.find(
      (jm) => jm.jobManagerName === jobManagerName
    ) as JobManagerParent;
    jobManager.cancelAllJobs();
  }

  /**
   * Cancels a job when the user clicks the cancel icon on the table row.
   *
   * @param {any} row  A row from the table describing the job to cancel.
   */
  cancelJob(row: { [key: string]: CellValue }) {
    for (const jobManager of jobManagers) {
      const id = "id_" + (row["Job ID"] as any).val.split(":")[1];
      jobManager.cancelJobs([id]);
    }
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
          throw err;
        });
    }, 1000);
  }
}
</script>
  <!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.cancel-pending-btn {
  position: absolute;
  right: 0;
  top: 18px;
  font-weight: 400;
  cursor: pointer !important;
}
</style>
  
  