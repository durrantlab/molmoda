<template>
  <h5>Jobs: Running/Completed</h5>
  <JobManagerV2 />
</template>

<script lang="ts">
/* eslint-disable no-unreachable */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";

// import JobManager from "@/Queue/JobManagers/JobManager.vue";
import Section from "@/UI/Layout/Section.vue";
import JobManagerV2 from "@/Queue/NewQueue/JobManagerV2.vue";

/**
 * QueuePanel component
 */
@Options({
  components: {
    JobManagerV2,
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
