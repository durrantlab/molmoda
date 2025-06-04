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
import { messagesApi } from "@/Api/Messages"; // Added import
import { reactive } from "vue"; // Import reactive

// These are the styles actually used. It is initially set to be the same as the
// defaults, but it will change per user specifications.
export const currentSelsAndStyles: { [key in TreeNodeType]: ISelAndStyle[] } =
    JSON.parse(JSON.stringify(defaultStyles));

// These are the custom styles that the user can add. They are applied to every
// molecule.
export const customSelsAndStyles: { [key: string]: ISelAndStyle } = reactive({
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
});

const disabledCustomStyleNames: Set<string> = reactive(new Set<string>());

/**
 * Checks if a custom style is currently enabled.
 *
 * @param {string} name The name of the custom style.
 * @returns {boolean} True if the style is enabled, false otherwise.
 */
export function isCustomStyleEnabled(name: string): boolean {
    return !disabledCustomStyleNames.has(name);
}

/**
 * Toggles the enabled/disabled state of a custom style.
 *
 * @param {string} name The name of the custom style to toggle.
 */
export function toggleCustomStyle(name: string): void {
    if (disabledCustomStyleNames.has(name)) {
        disabledCustomStyleNames.delete(name);
    } else {
        disabledCustomStyleNames.add(name);
    }
    updateStylesInViewer();
}

/**
 * Deletes a custom style.
 *
 * @param {string} name The name of the custom style to delete.
 */
export function deleteCustomStyle(name: string): void {
    delete customSelsAndStyles[name];
    disabledCustomStyleNames.delete(name); // Ensure it's also removed from disabled set
    updateStylesInViewer();
}

/**
 * Adds a new custom style to the application.
 *
 * @param {string} name The name of the custom style.
 * @param {ISelAndStyle} style The custom style object.
 * @param {boolean} [overwrite=false] Whether to overwrite if a style with the same name exists.
 * @returns {boolean} True if the style was added/updated, false if a name collision occurred and overwrite was false.
 */
export function addCustomStyle(
    name: string,
    style: ISelAndStyle,
    overwrite = false
): boolean {
    if (customSelsAndStyles[name] && !overwrite) {
        messagesApi.popupError(
            `A custom style with the name "${name}" already exists.`
        );
        return false;
    }
    customSelsAndStyles[name] = style;
    updateStylesInViewer(); // Trigger viewer update
    // The StylesCustom.vue component uses a computed property that directly reads
    // from customSelsAndStyles. Vue's reactivity should handle the update
    // automatically if customSelsAndStyles is a reactive object.
    // If it doesn't, we might need an event bus or a different reactivity trigger.
    return true;
}

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
                for (const [styleName, customSelAndStyle] of Object.entries(
                    customSelsAndStyles
                )) {
                    if (disabledCustomStyleNames.has(styleName)) {
                        continue;
                    }
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
