<template>
    <div>
        <div
            v-if="jobStatusInfos[0][1].length > 0"
            style="margin-top: -6px"
            class="text-primary cancel-pending-btn me-2"
            @click="cancelAll()"
        >
            Cancel All
        </div>
        <!-- <div
            class="me-3 badge bg-primary cancel-pending-btn"
        > 
    btn-sm-->
        <!-- </div> -->
        <span v-for="(tableData, idx) of allTableData" :key="idx">
            <div v-if="tableData && tableData.rows.length > 0">
                <Table
                    :tableData="tableData"
                    :caption="jobStatusInfos[idx][0]"
                    @cancelJob="cancelJob"
                    :noFixedTable="true"
                ></Table>
            </div>
            <div v-else>
                <div class="table-title">{{ jobStatusInfos[idx][0] }}</div>
                <p style="font-size: 14px">(Queue empty)</p>
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
import { cancelInQueueStore, getQueueStore } from "./QueueStore";
import { IJobStatusInfo, JobStatus } from "./QueueTypes";

const headers: IHeader[] = [
    {
        text: "",
        width: 25,
        showColumnFunc: (tableData: ITableData): boolean => {
            const statuses = new Set(
                tableData.rows.map((r) => (r.Status as ICellValue).val)
            );

            // Running jobs can be cancelled. If there are any there, you should
            // show this column.
            return statuses.has(JobStatus.Running);
        },
        sortable: false,
    },
    { text: "Job ID", note: "Job ID (type:id)" },
    { text: "Procs", note: "Number of Processors", width: 80 },
    {
        text: "Status",
        note: "Job Status",
        showColumnFunc: (tableData: ITableData): boolean => {
            // If running, job status is unambiguous, so might as well just not
            // show it.
            return (
                (tableData.rows[0].Status as ICellValue).val !==
                JobStatus.Running
            );
        },
    },
    {
        text: "Progress",
        note: "Progress",
        showColumnFunc: (tableData: ITableData): boolean => {
            // Only show progress if it's running.
            return (
                (tableData.rows[0].Status as ICellValue).val ===
                JobStatus.Running
            );
        },
    },
    { text: "Start", note: "Job Start Time" },
    {
        text: "End",
        note: "Job End Time",
        showColumnFunc: (tableData: ITableData): boolean => {
            // Anything but a running job has an end time.
            return (
                (tableData.rows[0].Status as ICellValue).val !==
                JobStatus.Running
            );
        },
    },
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
    jobStatusInfos: any[] = [
        ["Running Jobs", [] as IJobStatusInfo[]],
        ["Completed Jobs", [] as IJobStatusInfo[]],
    ];

    /**
     * Get the table data for the two queues.
     *
     * @returns {ITableData[]}.  The table data for the two queues.
     */
    get allTableData(): ITableData[] {
        return [
            this.jobStatusesToTableData(this.jobStatusInfos[0][1]),
            this.jobStatusesToTableData(this.jobStatusInfos[1][1]),
        ];
    }

    /**
     * Get the job statuses, formatted.
     *
     * @param {IJobStatusInfo[]} jobStatuses  The job statuses.
     * @returns {ITableData[]}.  The job statuses, formatted.
     */
    jobStatusesToTableData(jobStatuses: IJobStatusInfo[]): ITableData {
        // if (this.jobStatusInfos.length === 0) {
        //     // Not ready yet.
        //     return [];
        // }

        // Sort jobStatuses by start time, descending (more recent first)
        jobStatuses.sort((a, b) => {
            return (b.startTime as number) - (a.startTime as number);
        });

        let rows = jobStatuses.map((r) => {
            return {
                "": {
                    val: "",
                    iconClasses: "far fa-rectangle-xmark",
                    iconClickEmitName: "cancelJob",
                    iconShowFilterFunc: (row: {
                        [key: string]: CellValue;
                    }): boolean => {
                        if (row.Status === undefined) {
                            // This is a little complicated. If it's running,
                            // status is unambiguous, so it is not shown.
                            // Consequently, undefined. So this is a way of
                            // determining that it is currently running. Running
                            // jobs can be canceled, so return true.
                            return true;
                        }

                        const status = (row.Status as ICellValue)
                            .val as JobStatus;

                        // Only pending and running jobs can be cancelled.
                        return status === JobStatus.Running;
                    },
                } as ICellValue,
                "Job ID": r.id,
                Procs: r.numProcessors?.toString() as string,
                Status: r.status.toString(),
                Progress: (100 * r.progress).toFixed(1) + "%",
                Start: r.startTime as string | number,
                End: r.endTime as string | number,
            };
        });

        // Reverse rows so that the most recent job is at the top.
        // rows = rows.reverse();

        // Replace timestamp with string version
        rows = rows.map((r) => {
            r.Start = formatTimestamp(r.Start as number);
            r.End = formatTimestamp(r.End as number);

            // r.Time = new Date(r.Time).toLocaleString();
            return r;
        });

        return {
            headers: headers,
            rows: rows,
        };
    }

    /**
     * Cancels all jobs when the user clicks the "Cancel All" button.
     */
    cancelAll() {
        // Iterate through ones in the running queue and cancel them.
        for (const jobStatusInfo of this.jobStatusInfos[0][1]) {
            cancelInQueueStore(jobStatusInfo.id);
        }
    }

    /**
     * Cancels a job when the user clicks the cancel icon on the table row.
     *
     * @param {any} row  A row from the table describing the job to cancel.
     */
    cancelJob(row: { [key: string]: CellValue }) {
        // Get the job info. Note it must be in the active queue to get here.
        const id = (row["Job ID"] as ICellValue).val as string;

        cancelInQueueStore(id);
    }

    /**
     * The mounted function.
     */
    mounted() {
        // Periodically pull the job manager data
        setInterval(() => {
            const queueStore = getQueueStore();
            this.jobStatusInfos[0][1] = queueStore.running;
            this.jobStatusInfos[1][1] = queueStore.done;
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
