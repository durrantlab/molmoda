<template>
    <span>
        <h5>Jobs: Running/Completed</h5>
        <JobManager />
    </span>
</template>

<script lang="ts">
/* eslint-disable no-unreachable */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";

// import JobManager from "@/Queue/JobManagers/JobManager.vue";
import Section from "@/UI/Layout/Section.vue";
import JobManager from "@/Queue/JobManager.vue";

/**
 * QueuePanel component
 */
@Options({
    components: {
        JobManager,
        Section,
    },
})
export default class QueuePanel extends Vue {}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
#mol-viewer {
    width: 100%;
    height: 100%;
    position: relative;
}

// #mol-viewer canvas {
//   padding: 0 !important;
// }
</style>
