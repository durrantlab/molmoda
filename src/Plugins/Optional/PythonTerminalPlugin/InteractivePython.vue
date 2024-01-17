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
    return createStdout("Command not found" + command);
  },
  createStdOut(text: string) {
    return createStdout(text);
  },
  commandNotFound(command: string) {
    try {
      const result = (window as any).pyodide.runPython(command);
      if (result === undefined) {
        return createStdout("Command not found: " + command);
      }
      if (result.error) {
        return createStdout("Error: " + result.error.message);
      }
      return createStdout(result.stdOut);
    } catch (e) {
      /* eslint-disable-next-line */
      // @ts-ignore
      return createStdout(e.message);
    }
  },
};
</script>
