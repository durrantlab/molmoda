<!-- <template> -->
<!--   <div v-show="terminal.isFullscreen"> -->
<!--     <code ref="nano" @keyup.ctrl.x.exact="exit" :value="code"></code> -->
<!--   </div> -->
<!-- </template> -->

<template>
  <div v-show="terminal.isFullscreen">
    <div v-show="!save">
      <button @click="exit()">Exit</button>
      <button @click="saveMethod()">Save</button>
      <button @click="runCode()">Run</button>
      <CodeEditor
        ref="nano"
        :languages="[['Python']]"
        v-model="code"
        @keyup.ctrl.x.exact="exit"
      />
    </div>
    <div v-show="save">
      <label for="fileName">File Name:</label>
      <input
        type="text"
        v-model="fileName"
        ref="fileName"
        @keyup.enter="actualSaveMethod"
      />
      <button @click="actualSaveMethod()">Save</button>
    </div>
  </div>
</template>

<script>
import hljs from "highlight.js";
import CodeEditor from "simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import loadLanguages from "prismjs/components/index.js";
import { Vue } from "vue-class-component";

export default {
  components: {
    CodeEditor,
  },
  emits: ["run"],

  inject: ["exit", "setFullscreen", "terminal"],

  data() {
    return {
      save: false,
      shallRun: false,
      fileName: "main.py",
      code: `import json
data = json.load(open("/test.txt"))
print(data)`,
    };
  },

  /**
   */
  mounted() {
    const FS = window.pyodide.FS;
    if (FS.analyzePath("/main.py").exists)
      try {
        this.code = new TextDecoder("utf-8").decode(
          window.pyodide.FS.readFile("/main.py")
        );
      } catch (e) {
        console.error(e);
      }
    // loadLanguages(["python"]);
    // this.code = Prism.highlight(this.code, Prism.languages.python, "python");
    // this.$refs.nano.focus();
    this.setFullscreen(true);
  },

  methods: {
    /**
     */
    actualSaveMethod(run = false) {
      try {
        window.pyodide.FS.writeFile(this.fileName, this.code);
      } catch (e) {
        console.error(e);
      }
      if (this.shallRun) this.$emit("run", this.fileName);
      this.exit();
    },
    /**
     */
    saveMethod() {
      this.save = true;
      this.$nextTick(() => {
        this.$refs.fileName.focus();
      });
    },
    /**
     */
    runCode() {
      this.shallRun = true;
      this.saveMethod();
    },
  },
};
</script>

<style scoped>
div,
textarea {
  height: 100%;
}
</style>
