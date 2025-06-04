import {
    getMoleculesFromStore,
    setStoreVar,
} from "@/Store/StoreExternalAccess";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import isEqual from "lodash.isequal";
import { ISelAndStyle } from "./SelAndStyleInterfaces";
import { defaultStyles } from "./SelAndStyleDefinitions";

// These are the styles actually used. It is initially set to be the same as the
// defaults, but it will change per user specifications.
export const currentSelsAndStyles: { [key in TreeNodeType]: ISelAndStyle[] } =
    JSON.parse(JSON.stringify(defaultStyles));

// These are the custom styles that the user can add. They are applied to every
// molecule.
export const customSelsAndStyles: { [key: string]: ISelAndStyle } = {
    "Blue LYS": {
        selection: {
            resn: "LYS",
        },
        sphere: {
            color: "blue",
        },
    },
    "TRP red": {
        selection: {
            resn: "TRP",
        },
        stick: {
            color: "red",
        },
    },
};

/**
 * Updates the styles in the viewer.
 *
 * @param {TreeNodeType} [treeNodeType] The type of node to update. If
 *                                      undefined, all node types are updated.
 */
export function updateStylesInViewer(treeNodeType?: TreeNodeType) {
    // If treeNodeType is undefined, update all node types.
    const treeNodeTypes: TreeNodeType[] = treeNodeType
        ? [treeNodeType]
        : Object.values(TreeNodeType);

    // Get all molecules from the store
    const molecules = getMoleculesFromStore();

    // iterate through terminal nodes
    const terminalNodes = molecules.filters.onlyTerminal;
    for (let idx = 0; idx < terminalNodes.length; idx++) {
        const terminalNode = terminalNodes.get(idx);

        // Terminal node must have a type, styles, and be visible.
        if (
            !terminalNode.type ||
            !terminalNode.styles ||
            terminalNode.type === TreeNodeType.Other // ||
            // !terminalNode.visible
        ) {
            // Note that regions do not have styles. Also, don't mess with Other nodes. The styles of these
            // must be set explicitly (TreeNode.styles = [{...}])
            continue;
        }

        // Iterate through the node types you're considering.
        for (let i = 0; i < treeNodeTypes.length; i++) {
            const molType = treeNodeTypes[i];
            const selStyle = currentSelsAndStyles[molType];

            // Check if the node type matches this type. If not, skip to the
            // next node.
            if (terminalNode.type !== molType) {
                continue;
            }

            // Add the styles to the node list if it's not empty ({}).
            terminalNode.styles = [];
            if (!isEqual(selStyle, {})) {
                terminalNode.styles.push(...selStyle);
            }

            // Also add all custom styles to the node list.
            if (Object.keys(customSelsAndStyles).length > 0) {
                // Add custom styles to the node list.
                for (const customSelAndStyle of Object.values(
                    customSelsAndStyles
                )) {
                    // Check if the custom style is not empty ({}).
                    if (!isEqual(customSelAndStyle, {})) {
                        terminalNode.styles.push(customSelAndStyle);
                    }
                }
            }

            // Mark this for rerendering in viewer.
            terminalNode.viewerDirty = true;
        }
    }

    // Update all molecules. Note that this triggers reactivity
    // onTreeviewChanged() in ViewerPanel.vue.
    setStoreVar("molecules", molecules);
}
