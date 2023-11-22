<template>
  <client-only>
    <code-editor value="console.log(13)"></code-editor>
    <!-- or -->
    <CodeEditor value="console.log(13)"></CodeEditor>
  </client-only>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import hljs from "highlight.js";
import CodeEditor from "simple-code-editor";

export default {
  mounted() {
    console.log("mounted");
  },
};
</script>

<style scoped></style>
```
