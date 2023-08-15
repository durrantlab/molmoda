<template>
  <PluginComponent
    :intro="intro"
    v-model="open"
    :title="title"
    :userArgs="userArgs"
    @onPopupDone="onPopupDone"
    :pluginId="pluginId"
    @onUserArgChanged="onUserArgChanged"
  >
    <div id="pasteFile" style="width: 380px; height: 600px">
      <textarea
        id="pasteFileTextArea"
        style="width: 100%; height: 100%"
        v-model="inputText"
      ></textarea>
    </div>
    <div class="container mt-4">
      <h3>Select File Type:</h3>
      <div class="form-check">
        <input
          class="form-check-input"
          type="radio"
          name="fileType"
          id="pdb"
          value="pdb"
          v-model="fileType"
        />
        <label class="form-check-label" for="pdbRadio"> PDB </label>
      </div>
      <div class="form-check">
        <input
          class="form-check-input"
          type="radio"
          name="fileType"
          id="smi"
          value="smi"
          v-model="fileType"
        />
        <label class="form-check-label" for="smiRadio"> SMI </label>
      </div>
      <div class="form-check">
        <input
          class="form-check-input"
          type="radio"
          name="fileType"
          id="sdf"
          value="sdf"
          v-model="fileType"
        />
        <label class="form-check-label" for="sdfRadio"> SDF </label>
      </div>
      <div class="form-check">
        <input
          class="form-check-input"
          type="radio"
          name="fileType"
          id="other"
          value="other"
          v-model="fileType"
        />
        <label class="form-check-label" for="otherRadio"> Other </label>
      </div>
    </div>
  </PluginComponent>
</template>

<script lang="ts">
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { Options } from "vue-class-component";
import { FileInfo } from "@/FileSystem/FileInfo";
import {
  ISoftwareCredit,
  IContributorCredit,
} from "@/Plugins/PluginInterfaces";
import { randomID } from "@/Core/Utils";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { ref } from "vue";
import { Watch } from "vue-property-decorator";
import { reactive } from "vue";
import { IUserArgCheckbox, IUserArgGroup, IUserArgText, UserArg, UserArgType } from "@/UI/Forms/FormFull/FormFullInterfaces";

enum FileType {
  PDB = "pdb",
  SMI = "smi",
  SDF = "sdf",
  OTHER = "other",
}

function getFileExtension(fileType: FileType): string {
  switch (fileType) {
    case FileType.PDB:
      return "pdb";
    case FileType.SMI:
      return "smi";
    case FileType.SDF:
      return "sdf";
    case FileType.OTHER:
      return "other";
  }
}
function detectFileType(contents: string): FileType {
  // Regular expressions for detecting specific file formats
  const pdbRegex1 = /^(?:ATOM|HETATM)/m;
  const pdbRegex2 = /^(?!VENDOR|REMARK)/m;
  const smiRegex = /^[^\n\r]+$/m;
  const sdfRegex = /^\s*M\s+END\s*$/m;

  if (pdbRegex1.test(contents) && pdbRegex2.test(contents)) return FileType.PDB;
  else if (smiRegex.test(contents)) return FileType.SMI;
  else if (sdfRegex.test(contents)) return FileType.SDF;
  return FileType.OTHER;
}

/**
 * PasteFilePlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class PasteFilePlugin extends PluginParentClass {
  menuPath = "Test/Paste File...";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Yuri K. Kochnev",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "pastefileplugin";

  intro = `Use the editor below to paste your file.`;
  title = "Paste File Component";

  userArgDefaults: UserArg[] = reactive([
    {
      id: "group2",
      // type: UserArgType.Group,
      label: "Manual Type Selection",
      val: [
        {
          id: "pdb",
          label: ".pdb",
          val: false, // To use default
          type: UserArgType.Checkbox,
        } as IUserArgCheckbox,
        {
          id: "smi",
          label: ".smi",
          val: false, // To use default
          type: UserArgType.Checkbox,
        } as IUserArgCheckbox,
        {
          id: "sdf",
          label: ".sdf",
          val: false, // To use default
          type: UserArgType.Checkbox,
        } as IUserArgCheckbox,
        {
          id: "other",
          label: "Other",
          val: false, // To use default
          type: UserArgType.Checkbox,
        } as IUserArgCheckbox,
        {
          id: "otherText",
          label: "Other file type:",
          placeholder: "Enter file extension",
          val: "", // To use default
          type: UserArgType.Text,
        } as IUserArgText,
      ],
    } as IUserArgGroup,
  ]);

  inputText = "";
  fileType = FileType.OTHER;

  @Watch("inputText")
  onInputTextChange(val: string, oldVal: string) {
    console.log("PasteFilePlugin: onInputTextChange: val: ", val);

    this.fileType = detectFileType(val);
  }

  onPopupDone() {
    console.log(
      "PasteFilePlugin: onPopupDone: this.inputText: " +
        detectFileType(this.inputText)
    );
    // access userArgs object with id 'pdb' and set the value to true
    const userArgs = this.userArgs;
    console.log("PasteFilePlugin: onPopupDone: userArgs: ", userArgs);

    //userArgs[0].val[0].val = true;

    const fileInfo = new FileInfo({
      name: "PastedFile" + randomID() + "." + "smi", // getFileExtension(detectFileType(this.inputText)),
      contents: this.inputText,
    });
    const treeNode = TreeNode.loadFromFileInfo(fileInfo);
    treeNode
      .then((node: any) => {
        node.title = "Pasted File";
        node.type = TreeNodeType.Compound;

        node.addToMainTree();
        return;
      })
      .catch((err: any) => {
        throw err;
      });
  }

  runJobInBrowser(arg: any): Promise<void> {
    console.log("PasteFilePlugin: runJobInBrowser: arg: ", arg);
    return Promise.resolve();
  }
}
</script>

<style scoped></style>
```