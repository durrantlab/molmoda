<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        @onUserArgChanged="onUserArgChanged"
        @onPopupDone="onPopupDone"
        modalWidth="xl"
    >
        <div
            ref="chemComposer"
            style="width: 100%; height: 600px"
            ></div>
            <!-- data-widget="Kekule.Editor.Composer" -->
    </PluginComponent>
</template>

<script lang="ts">
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { Options } from "vue-class-component";

import { FileInfo } from "@/FileSystem/FileInfo";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
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
    menuPath = "File/Import/[8] Draw...";
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

    userArgDefaults: UserArg[] = [];

    kekule: any;
    chemComposer: any;

    onBeforePopupOpen() {
        dynamicImports.kekule.module
            .then((module: any) => {
                this.kekule = module.Kekule;
                this.chemComposer = new this.kekule.Editor.Composer(
                    this.$refs["chemComposer"]
                );
                return;
            })
            .catch((err: any) => {
                throw err;
            });
    }

    onPopupDone() {
        debugger;
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
    }

    runJobInBrowser(arg: any): Promise<void> {
        return Promise.resolve();
    }

    getTests() {
        return [];
    }
}
</script>
