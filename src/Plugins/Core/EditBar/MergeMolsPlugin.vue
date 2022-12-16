<template>
    <PluginComponent
        ref="pluginComponent"
        v-model="open"
        title="Merge Molecules"
        :intro="intro"
        actionBtnTxt="Merge"
        :userArgs="userArgs"
        :pluginId="pluginId"
        @onPopupDone="onPopupDone"
    ></PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Options } from "vue-class-component";
import {
    IContributorCredit,
    ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";

import {
    cloneMols,
    getNodeAncestory,
    getTerminalNodes,
} from "@/UI/Navigation/TreeView/TreeUtils";
import { IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { getDefaultNodeToActOn, setNodesToActOn } from "./EditBarUtils";
import { checkMultipleMolsSelected } from "../CheckUseAllowedUtils";
import { FormElement, IFormText } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/ParentPluginTestFuncs";
import { IUserArg } from "@/UI/Forms/FormFull/FormFullUtils";

/**
 * MergeMolsPlugin
 */
@Options({
    components: {
        PluginComponent,
    },
})
export default class MergeMolsPlugin extends PluginParentClass {
    menuPath = ["Edit", "Molecules", "[5] Merge..."];
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Jacob D. Durrant",
            url: "http://durrantlab.com/",
        },
    ];
    pluginId = "mergemols";
    intro =
        "The selected molecules will be copied and merged into a single new molecule. Enter the name of the new, merged molecule.";
    userArgs: FormElement[] = [
        {
            id: "newName",
            label: "",
            val: "",
            placeHolder: "Name of new merged molecule",
            validateFunc: (newName: string): boolean => {
                return newName.length > 0;
            },
        } as IFormText,
    ];

    nodesToActOn: IMolContainer[] = [getDefaultNodeToActOn()];
    alwaysEnabled = true;
    logJob = false;

    /**
     * Runs before the popup opens. Will almost always need this, so requiring
     * children to define it.
     */
    onBeforePopupOpen(): void {
        setNodesToActOn(this);

        // Generate the suggested title for merged molecule.
        // Get top of molecule title.
        let titles: string[] = [];
        for (const node of this.nodesToActOn) {
            titles.push(
                getNodeAncestory(node, this.$store.state.molecules)[0].title
            );
        }

        this.updateUserArgs([
            {
                name: "newName",
                // val: title + ":" + nodeToActOn.title + " (cloned)",
                val: titles.join("-") + " (merged)",
            } as IUserArg,
        ]);
    }

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        return checkMultipleMolsSelected(this as any);
    }

    /**
     * Every plugin runs some job. This is the function that does the job running.
     *
     * @param {IUserArg[]} userArgs  The user arguments.
     */
    runJobInBrowser(userArgs: IUserArg[]) {
        if (!this.nodesToActOn) {
            // Nothing to do.
            return;
        }

        // debugging below
        cloneMols(this.nodesToActOn, true)
            .then((molContainers: IMolContainer[]) => {
                const mergedMolContainer = molContainers[0];

                // Keep going through the nodes of each container and merge them into the
                // first container.
                for (let i = 1; i < molContainers.length; i++) {
                    const molContainer = molContainers[i];

                    // Get the terminal nodes
                    const terminalNodes = getTerminalNodes([molContainer]);

                    // Get ancestry of each terminal node
                    for (const terminalNode of terminalNodes) {
                        const ancestry = getNodeAncestory(terminalNode, [
                            molContainer,
                        ]);

                        // Remove first one, which is the root node
                        ancestry.shift();

                        let mergedMolContainerPointer = mergedMolContainer;
                        const mergedMolNodesTitles =
                            mergedMolContainerPointer.nodes?.map(
                                (node) => node.title
                            ) as string[];

                        while (
                            mergedMolNodesTitles?.indexOf(ancestry[0].title) !==
                            -1
                        ) {
                            if (!mergedMolContainerPointer.nodes) {
                                // When does this happen?
                                debugger;
                                break;
                            }

                            // Update the pointer
                            mergedMolContainerPointer =
                                mergedMolContainerPointer.nodes.find(
                                    (node) => node.title === ancestry[0].title
                                ) as IMolContainer;

                            // Remove the first node from the ancestry
                            ancestry.shift();
                        }

                        // You've reached the place where the node should be added. First,
                        // update its parentId.
                        const nodeToAdd = ancestry[0];
                        nodeToAdd.parentId = mergedMolContainerPointer.id;

                        // And add it
                        mergedMolContainerPointer.nodes?.push(nodeToAdd);
                    }
                }

                mergedMolContainer.title = this.getArg(userArgs, "newName");

                this.$store.commit("pushToList", {
                    name: "molecules",
                    val: mergedMolContainer,
                });
                return;
            })
            .catch((err) => {
                throw err;
            });
    }

    /**
     * Gets the selenium test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[]}  The selenium test commands.
     */
    getTests(): ITest[] {
        return [
            {
                beforePluginOpens: [
                    this.testLoadExampleProtein(),
                    ...this.testExpandMoleculesTree("4WP4"),
                    this.testSelectMoleculeInTree("Protein"),
                    this.testSelectMoleculeInTree("Compounds", true),
                ],
                // closePlugin: [],
                afterPluginCloses: [
                    this.testWaitForRegex("#navigator", ".merged."),
                ],
            },
        ];
    }
}
</script>

<style scoped lang="scss"></style>
