<template>
  <JobManager />
</template>

<script lang="ts">
/* eslint-disable no-unreachable */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options, Vue } from "vue-class-component";
import { Watch } from "vue-property-decorator";

import * as api from "@/Api/";
import {
  getAllNodesFlattened,
  getTerminalNodes,
} from "@/UI/Navigation/TreeView/TreeUtils";

import {
  GLModel,
  IMolContainer,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { unbondedAtomsStyle } from "@/FileSystem/LoadSaveMolModels/Types/DefaultStyles";
import { dynamicImports } from "@/Core/DynamicImports";
import JobManager from "@/Queue/JobManagers/JobManager.vue";
import Section from "@/UI/Layout/Section.vue";

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
