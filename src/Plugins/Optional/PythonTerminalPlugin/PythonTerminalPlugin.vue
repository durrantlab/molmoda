<template>
  <PluginComponent
    :intro="intro"
    v-model="open"
    :title="title"
    :userArgs="userArgs"
    @onPopupDone="onPopupDone"
    :pluginId="pluginId"
@onUserArgChanged="onUserArgChanged"
    modalWidth="xl"
:isActionBtnEnabled="false"
    :isCloseBtnEnabled="false"
    :infoPayload="infoPayload"
  >
    <WarningMessage
      v-if="warning"
      @destroy="handleDestroy"
      :warning="warningMessage"
    />

    <FileUpload v-if="fileUpload" @done="handleUpload(fileName)" />
    <SnakeLoader v-if="!pyodideInitialized" />
    <vue-command
      v-if="pyodideInitialized"
      :namespace="bash"
      ref="bash"
      :yargs-options="{ alias: { color: ['colour'] } }"
      :commands="commands"
      :title="title"
      prompt="durrantlat@biotite-suitte $"
  :hideButtons="true"
  :history="bashHistory"
  />
  </PluginComponent>
</template>

<script lang="ts">
import axios from "axios";
import PluginComponent from "../../Parents/PluginComponent/PluginComponent.vue";

import { PluginParentClass } from "../../Parents/PluginParentClass/PluginParentClass";
import { Options } from "vue-class-component";
import {
  ISoftwareCredit,
  IContributorCredit,
} from "@/Plugins/PluginInterfaces";
import {
  IUserArgCheckbox,
  IUserArgGroup,
  IUserArgText,
  UserArg,
  UserArgType,
} from "@/UI/Forms/FormFull/FormFullInterfaces";

import VueCommand, { createStdout, newDefaultHistory } from "vue-command";
import { inject } from "vue";
import "vue-command/dist/vue-command.css";
import SnakeLoader from "@/Plugins/Optional/PythonTerminalPlugin/SnakeLoaderOld.vue";
import { Watch } from "vue-property-decorator";
import { dynamicImports } from "@/Core/DynamicImports";
import { ITest } from "@/Testing/TestCmd";
import { TestCmdList } from "@/Testing/TestCmdList";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
//import { PythonCommand } from "./PythonCommand";
import NanoEditor from "./NanoEditor.vue";
import VisualStudioWrapper from "./VisualStudioWrapper.vue";
import FileUpload from "./FileUpload.vue";
import WarningMessage from "./WarningMessage.vue";
import InteractivePythonWrapper from "./InteractivePythonWrapper.vue";
import { treeNodeListDeserialize } from "@/TreeNodes/Deserializers";
import { ITreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

@Options({
  components: {
    PluginComponent,
    VueCommand,
    SnakeLoader,
    NanoEditor,
    InteractivePythonWrapper,
    VisualStudioWrapper,
    FileUpload,
    WarningMessage,
    //  PythonCommand,
  },
})
export default class PythonTerminalPlugin extends PluginParentClass {
  // appendToHistory = inject("appendToHistory");
  // addDispatchedQuery = inject("addDispatchedQuery");
  menuPath = "Python/Python Interpreter...";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Yuri K. Kochnev",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "pythonterminalplugin";

  intro = `This interpreter will try to run your commands against python binary.`;

  title = "Python Terminal Component";
  userArgDefaults: UserArg[] = [
    // {
    //   id: "command",
    //   val: "",
    //   type: UserArgType.Text,
    //   placeHolder: "Type python command here...",
    // } as IUserArgText,
  ];
  command = "";
  pyodideInitialized = false;
  bash = false;
  FS = null;
  pyodide = null;
  myVar: any;
  history: any[] = [];
  bashHistory: any[] = newDefaultHistory();
  pythonHistory: any[] = newDefaultHistory();
  stdOut = "";
  fileUpload = false;
  warning = false;
  warningMessage = "This is a warning";
  pythonInitCode = "";
  pyodidePrint = "[CustomPrint]";
  pyodideUpdateViewportString = "___calling_updateViewport___";
  updateViewport = false;

  boxCoordinates =
    '{"molecules": [{"title": "ATP-pocket", "type": "region", "id": "id_1mzdsevjv9r", "focused": false, "viewerDirty": false, "region": {"center": [41.042, 20.083, 13.138], "color": "#c6aa90", "movable": true, "opacity": 0.9, "dimensions": [20, 20, 20], "type": "Box"}, "visible": true}]}';
  // saving the native console.log
  nativeConsoleLog = console.log;

  // TODO: this is a duplicate code and it will be imported from somewhere else in the future
  jsonStrToState(jsonStr: string): Promise<any> {
    // Viewer needs to reload everything, so set viewierDirty to true in all
    // cases. This is a little hackish, but easier than recursing I think.
    jsonStr = jsonStr.replace(/"viewerDirty": *false/g, '"viewerDirty":true');

    // Now convert it to an object.
    const obj = JSON.parse(jsonStr);

    return treeNodeListDeserialize(obj.molecules as ITreeNode[])
      .then((mols: TreeNodeList) => {
        obj.molecules = mols;
        return obj;
      })
      .catch((err: any) => {
        throw err;
      });
  }

  @Watch("updateViewport")
  onUpdateViewportCalled() {
    this.updateViewport = false;
    let updatedFile = '{"molecules": [';
    updatedFile += new TextDecoder("utf-8").decode(
      /* eslint-disable-next-line */
      // @ts-ignore
      this.pyodide.FS.readFile("/treeNodeUpdated.txt")
    );
    updatedFile += "]}";
    console.warn("updatedFile: %s", updatedFile);
    const parsedFile = JSON.parse(updatedFile);
    console.warn("parsedFile", parsedFile);
    const molsToPassToPython = JSON.parse(updatedFile);
    this.jsonStrToState(updatedFile)
      .then((state: any) => {
        state.molecules.addToMainTree();
        return state;
      })
      .catch((err: any) => {
        console.log("error", err);
        throw err;
      });
  }

  @Watch("pyodide", { deep: true })
  onOutputBufferChanged(newVal: any, oldVal: any) {
    console.log("output buffer changed");
  }

  handleDestroy() {
    this.warning = false;
    console.log = this.nativeConsoleLog;
    console.log("destroyed");
  }

  handleUpload(fileName: string) {
    this.fileUpload = false;
    this.warningMessage = fileName;
    this.warning = true;
  }

  /**
   * This is a hack to get the output from pyodide to the vue-command component
   * It is a hack because it relies on the fact that pyodide uses the console.log function
   * to print to the console. This is not a good idea, but it works for now.
   * The message is wrapped in a custom string, and then unwrapped here.
   *
   * @param {any} message - the message to print to the console
   */
  customLog(message: any) {
    this.nativeConsoleLog("customLog called");
    debugger;
    if (typeof message.startsWith !== "function") return;
    if (message.startsWith(this.pyodidePrint)) {
      let customStringStripped = message
        .slice(this.pyodidePrint.length)
        .slice(0, -this.pyodidePrint.length);
      if (customStringStripped.startsWith(this.pyodideUpdateViewportString)) {
        this.updateViewport = true;
        return;
      }
      if ((window as any).ipython)
        (window as any).ipython.appendToHistory(
          createStdout(customStringStripped)
        );
    } else this.nativeConsoleLog(message);
  }

  @Watch("pyodideInitialized")
  /**
   * This is a watcher that is called when pyodide is initialized.
   * It sets the window.bash variable to the vue-command component.
   * This is a hack, but it works.
   */
  onPyodideInitializedChanged() {
    if (this.pyodideInitialized) {
      // after 0.5 second timeout, run the following code
      setTimeout(() => {
        /* eslint-disable-next-line */
        // @ts-ignore
        window.bash = this.$refs.bash;
        /* eslint-disable-next-line */
        // @ts-ignore
        //    window.bash = this.$refs.bash;
      }, 500);
    }
  }

  molsToPassToPython() {
    // Get the entire tree
    const tree = getMoleculesFromStore();
    const treeDataToPassToPython = tree.serialize();
    // Get the terminal nodes (with actual molecular data). Let's add the path
    // for good measure.
    const mols = getMoleculesFromStore().terminals;
    mols.forEach((treeNode: TreeNode) => {
      const ancestors = treeNode.getAncestry(tree);
      (treeNode as any).path = ancestors.map((m) => m.title).join(" > ");
    });
    // return mols.serialize();
    return JSON.stringify(treeDataToPassToPython);
  }

  commands = {
    ls: (_: any) => {
      let stdOut = "";
      if (_.length === 1) {
        stdOut +=
          // eslint-disable-next-line
          // @ts-ignore
          this.FS.readdir(this.FS.cwd()).toString().split(",").join(" ") + "\n";
        return createStdout(stdOut);
      }
      for (let i = 1; i < _.length; i++) {
        // eslint-disable-next-line
        // @ts-ignore
        stdOut += this.FS.readdir(_[i]).toString().split(",").join(" ") + "\n";
      }
      return createStdout(stdOut);
    },
    // eslint-disable-next-line
    // @ts-ignore
    pwd: () => createStdout(this.FS.cwd()),
    cd: (_: any) => {
      if (_.length === 1) {
        // eslint-disable-next-line
        // @ts-ignore
        this.FS.chdir("/");
        return createStdout("");
      }
      try {
        // eslint-disable-next-line
        // @ts-ignore
        this.FS.chdir(_[1].toString());
        return createStdout("");
      } catch (e) {
        return createStdout(e);
      }
    },
    upload: () => {
      this.fileUpload = true;
      return createStdout("");
    },
    python: (_: any) => {
      if (_.length === 1) return InteractivePythonWrapper;
      const file = _[1].toString();
      try {
        // decode the return value of readFile into a string
        const decodedFile = new TextDecoder("utf-8").decode(
          // eslint-disable-next-line
          // @ts-ignore
          this.FS.readFile(file)
        );
        try {
          // eslint-disable-next-line
          // @ts-ignore
          this.pyodide.setStdout({
            batched: (msg: any) => {
              this.stdOut += msg + "\n";
            },
          });
          // eslint-disable-next-line
          // @ts-ignore
          this.pyodide.runPython(decodedFile);
          return createStdout(this.stdOut);
        } catch (e) {
          return createStdout(e);
        }
      } catch (e) {
        return createStdout(e);
      }
    },
    code: () => VisualStudioWrapper,
    cat: (_: any) => {
      let stdOut = "";
      if (_.length === 1) {
        return createStdout("cat: no file specified");
      }
      for (let i = 1; i < _.length; i++) {
        try {
          // decode the return value of readFile into a string
          stdOut +=
            // eslint-disable-next-line
            // @ts-ignore
            new TextDecoder("utf-8").decode(this.FS.readFile(_[i])) + "\n";
        } catch (e) {
          return createStdout(e);
        }
      }
      return createStdout(stdOut);
    },
  };

  pythoncommands = {};

  async onPopupOpen() {
    console.log = this.customLog;

    async function loadPythonFile(): Promise<string> {
      /* load all .py files from the python folder */
      // TODO - how to handle user uploads on actual filesystem?
      try {
        const response = await axios.get("/python/TreeNode.py");

        if (response.status !== 200) {
          throw new Error("Network response was not ok");
        }

        return response.data;
      } catch (e) {
        console.error(e);
        return "";
      }
    }
    try {
      this.pythonInitCode = await loadPythonFile();
    } catch (e) {
      console.log(e);
    }

    // eslint-disable-next-line
    // @ts-ignore
    if (typeof window.pyodide == "undefined") {
      const pyodide = dynamicImports.pyodide.module;
      pyodide
        .then((pyodide: any) => {
          this.pyodide = pyodide;
          this.FS = pyodide.FS;
          this.pyodideInitialized = true;
          this.bash = true;

          // eslint-disable-next-line
          // @ts-ignore
          this.FS.createDataFile(
            "/",
            "treeNode.txt",
            this.molsToPassToPython(),
            true,
            true,
            true
          );

          // load numpy package; we will use it extensively
          // eslint-disable-next-line
          // @ts-ignore
          this.pyodide
            .loadPackage("numpy")
            .then(() => {
              // eslint-disable-next-line
              // @ts-ignore
              this.pyodide.runPython(`import numpy as np`);
              /* eslint-disable-next-line */
              // @ts-ignore
              this.pyodide.runPython(this.pythonInitCode);
              return;
            })
            .catch((err: any) => {
              console.log(err);
              throw err;
            });

          (window as any).pyodide = pyodide;
          return;
        })
        .catch((err: any) => {
          console.log(err);
          throw err;
        });
    }
    // eslint-disable-next-line
    // @ts-ignore
    else this.pyodide = window.pyodide;
  }

  onPopupDone() {
    console.log("onPopupDone");
    // eslint-disable-next-line
    // @ts-ignore
    window.pyodide = this.pyodide;
  }
  runJobInBrowser() {
    console.log("runJobInBrowser");
    return Promise.resolve();
  }

  getTests(): ITest[] {
    return [];
  }
}
</script>

<style scoped lang="scss">
.vue-command {
  height: 50vh;
  .term {
    -webkit-border-radius: 8px;
    -moz-border-radius: 8px;
    border-radius: 8px;
  }

  .term-std {
    min-height: 300px;
    max-height: 300px;
    overflow-y: scroll;
  }
}
</style>
