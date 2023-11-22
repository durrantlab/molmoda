<template>
  <VisualStudio
    @run="
      (fileName) => {
        runMethod(fileName);
      }
    "
  />
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import VisualStudio from "./VisualStudio.vue";
import { inject } from "vue";

@Options({
  components: {
    VisualStudio,
  },
})
export default class VisualStudioWrapper extends Vue {
  onMounted() {
    console.log("mounted");
  }

  runMethod(fileName: any) {
    /* eslint-disable-next-line */
    // @ts-ignore
    window.bash.dispatch("python " + fileName);
  }
}
</script>
