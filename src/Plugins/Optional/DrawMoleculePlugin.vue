<template>
  <PluginComponent
    :intro="intro"
    v-model="open"
    title="Draw Molecule Component"
    :userArgs="userArgs"
    @onPopupDone="onPopupDone"
    :pluginId="pluginId"
  >
    <div
      id="chemComposer"
      style="width: 50%; height: 600px"
      data-widget="Kekule.Editor.Composer"
    ></div>
  </PluginComponent>
</template>

<script lang="ts">
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { Options } from "vue-class-component";

import { FileInfo } from "@/FileSystem/FileInfo";
import {
  UserArg,
  IUserArgText,
  UserArgType,
  IUserSelectRegion,
  IUserArgGroup,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import {
  ISoftwareCredit,
  IContributorCredit,
} from "@/Plugins/PluginInterfaces";
import { dynamicImports } from "@/Core/DynamicImports";
import { randomID } from "@/Core/Utils";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
/**
 * DrawMoleculePlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class DrawMoleculePlugin extends PluginParentClass {
  menuPath = "Test/Draw Molecule";
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Yuri K. Kochnev",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "drawmoleculeplugin";
  title = "Draw Molecule";

  intro = `Use the editor below to draw your molecule.`;

  userArgDefaults: UserArg[] = [
    {
      id: "group2",
      // type: FormElemType.Group,
      label: "Region Test",
      val: [
        {
          id: "region",
          // label: "Region test",
          val: null, // To use default
          type: UserArgType.SelectRegion,
        } as IUserSelectRegion,
      ],
    } as IUserArgGroup,
  ];

  kekule: any;
  chemComposer: any;

  onBeforePopupOpen() {
    const kekule = dynamicImports.kekule.module;
    kekule
      .then((module: any) => {
        this.kekule = module.Kekule;
        this.chemComposer = new module.Kekule.Editor.Composer(
          document.getElementById("chemComposer")
        );
        return module;
      })
      .catch((err: any) => {
        throw err;
      });
  }

  onPopupDone() {
    console.log("DrawMoleculePlugin onPopupDone");
    const myFile = new FileInfo({
      name: randomID() + ".smi",
      contents: this.kekule.IO.saveFormatData(
        this.chemComposer.getChemObj(),
        "smi"
      ),
    });
    const treeNode = TreeNode.loadFromFileInfo(myFile);
    treeNode
      .then((node: any) => {
        node.title = "DrawMolecule";
        node.type = TreeNodeType.Compound;

        node.addToMainTree();
        return;
      })
      .catch((err: any) => {
        throw err;
      });
    debugger;
  }

  runJobInBrowser(arg: any): Promise<void> {
    console.log("DrawMoleculePlugin runJobInBrowser");
    return Promise.resolve();
  }
}
</script>
