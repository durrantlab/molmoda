<template>
  <vue-command v-bind="$attrs"></vue-command>
</template>

<script lang="ts">
import VueCommand, {
  createStdout,
  exit,
  terminal,
  createCommandNotFound,
} from "vue-command";
import "vue-command/dist/vue-command.css";

export default {
  // extends: VueCommand,
  components: {
    VueCommand,
  },
  // inject: ["exit", "setFullscreen", "terminal", "createCommandNotFound"],
  // created() {
  // this.setFullscreen(true);
  // this.createCommandNotFound = this.commandNotFound;
  // },
  mounted() {
    console.log("mounted");
    // console.log(this.prompt);
    debugger;
  },
  createCommandNotFound(command: string) {
    return createStdout("dcvxcvxcvCommand not found" + command);
  },
  createStdOut(text: string) {
    return createStdout(text);
  },
  commandNotFound(command: string) {
    try {
      const result = (window as any).pyodide.runPython(command);
      return createStdout(result);
    } catch (e) {
      return createStdout(e);
    }
  },
};
</script>
