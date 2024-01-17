<template>
  <vue-command
    ref="ipython"
    :yargs-options="{ alias: { color: ['colour'] } }"
    title="pyodide"
    prompt=">>> "
    :history="history"
    :namespace="namespace"
    :hideBar="true"
    :is-fillscreen="true"
    :interpreter="pyodideParser"
  >
    <!--template #bar>
      <button @click="exit()">Exit</button>
    </template-->
  </vue-command>
</template>

<script lang="ts">
import VueCommand, {
  createStdout,
  defaultParser,
  newDefaultHistory,
} from "vue-command";
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { inject, markRaw, defineComponent, h } from "vue";

@Options({
  components: {
    VueCommand,
  },
})
export default class InteractivePython extends Vue {
  // @Prop({ required: false }) history: any | undefined;
  @Prop({ required: false }) namespace: any | undefined;
  setFullscreen = inject("setFullscreen");
  exit = inject("exit");
  setQuery = inject("setQuery");
  appendToHistory = inject("appendToHistory");
  history = newDefaultHistory();

  mounted() {
    /* eslint-disable-next-line */
    // @ts-ignore
    this.setFullscreen(true);
    /* eslint-disable-next-line */
    // @ts-ignore
    this.$refs.ipython.appendToHistory(createStdout("Welcome to pyodide!"));
    /* eslint-disable-next-line */
    // @ts-ignore
    this.$refs.ipython.appendToHistory(
      createStdout("Type 'help' for more information.")
    );
    /* eslint-disable-next-line */
    // @ts-ignore
    window.ipython = this.$refs.ipython;

    /* eslint-disable-next-line */
    // @ts-ignore
    window.pythonHistory = this.history;
  }

  commands = {
    // TODO: improve error handling
    py: (_: any) => {
      try {
        // const code = _.slice(1).toString().split(",").join(" ");
        const code = _.toString().split(",").join(" ");
        const result = (window as any).pyodide.runPython(code);
        return createStdout(result);
      } catch (e) {
        return createStdout(e);
      }
    },
  };

  // TODO: rename it to something that would make more sense
  pyodideParser = async (query: string) => {
    const sanitizedCommand = query.trim();
    const parsedQuery = defaultParser(query);

    if (sanitizedCommand === "quit") {
      /* eslint-disable-next-line */
      // @ts-ignore
      return this.exit();
    }

    const getCommand = this.commands["py"];
    const command = await Promise.resolve(getCommand(parsedQuery));
    const component = defineComponent({
      name: "VueCommandOut",
      provide() {
        return {
          // This will be unique for the component and not reactive by design
          context: {
            rawQuery: query,
            parsedQuery,
          },
        };
      },

      // This nesting makes it possible to provide the context
      /* eslint-disable-next-line */
      // @ts-ignore
      render: () => h(command),
    });
    /* eslint-disable-next-line */
    // @ts-ignore
    window.ipython.appendToHistory(markRaw(component));
  };
}
</script>
