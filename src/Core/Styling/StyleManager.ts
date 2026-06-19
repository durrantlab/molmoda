import {
    getMoleculesFromStore,
    setStoreVar,
} from "@/Store/StoreExternalAccess";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { isEqual } from 'lodash';
import { ISelAndStyle } from "./SelAndStyleInterfaces";
import { defaultStyles } from "./SelAndStyleDefinitions";
import { messagesApi } from "@/Api/Messages"; // Added import
import { reactive } from "vue"; // Import reactive
import {
    BINDING_POCKET_DISTANCE,
    bindingPocketSignature,
    computeBindingPocketSelections,
    perChainToSelection,
    PocketSelectionsByNodeId,
} from "./BindingPocket";
import { allHooks } from "@/Api/Hooks";

// These are the styles actually used. It is initially set to be the same as the
// defaults, but it will change per user specifications.
export const currentSelsAndStyles: { [key in TreeNodeType]: ISelAndStyle[] } =
    JSON.parse(JSON.stringify(defaultStyles));

/**
 * Replaces the per-mol-type styles with a restored set, mutating the existing
 * object in place (it is exported as a const, so it cannot be reassigned).
 * Only keys present in `newStyles` are overwritten, so a type absent from a
 * saved session keeps its default styling. This is what lets a reloaded
 * .molmoda reproduce the user's per-component representations instead of
 * reverting to defaults the next time updateStylesInViewer rebuilds node
 * styles from this map.
 *
 * @param {Partial<Record<TreeNodeType, ISelAndStyle[]>>} newStyles  The styles
 *     to restore, keyed by mol type.
 */
export function replaceAllCurrentStyles(
    newStyles: Partial<Record<TreeNodeType, ISelAndStyle[]>>
): void {
    for (const key of Object.keys(newStyles) as TreeNodeType[]) {
        if (key in currentSelsAndStyles) {
            currentSelsAndStyles[key] = newStyles[key] as ISelAndStyle[];
        }
    }
}

// These are the custom styles that the user can add. They are applied to every
// molecule.
export const customSelsAndStyles: { [key: string]: ISelAndStyle } = reactive({
    // "Blue LYS": {
    //     selection: {
    //         resn: "LYS",
    //     },
    //     sphere: {
    //         color: "blue",
    //     },
    // },
    // "TRP red": {
    //     selection: {
    //         resn: "TRP",
    //     },
    //     stick: {
    //         color: "red",
    //     },
    // },
});

// setInterval(() => {
//     console.log(JSON.stringify(customSelsAndStyles, null, 2));
// }, 1000);

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
 * Returns the names of all custom styles currently toggled off. Exposed so the
 * .molmoda saver can persist the disabled state; without it, reloading a saved
 * session would lose which custom visualizations the user had hidden.
 *
 * @returns {string[]} The disabled custom style names.
 */
export function getDisabledCustomStyleNames(): string[] {
    return Array.from(disabledCustomStyleNames);
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
 * @param {string} name          The name of the custom style.
 * @param {ISelAndStyle} style   The custom style object.
 * @param {boolean} [overwrite]  Whether to overwrite if a style with the same
 *                               name exists. Default is false.
 * @returns {boolean}            True if the style was added/updated, false if a
 *                               name collision occurred and overwrite was
 *                               false.
 */
export function addCustomStyle(
    name: string,
    style: ISelAndStyle,
    overwrite = false
): boolean {
    if (customSelsAndStyles[name] && !overwrite) {
        messagesApi.popupError(
            `A custom visualization with the name "${name}" already exists.`
        );
        return false;
    }
    customSelsAndStyles[name] = style;
    updateStylesInViewer(); // Trigger viewer update
    // The VizualizationsCustom.vue component uses a computed property that directly reads
    // from customSelsAndStyles. Vue's reactivity should handle the update
    // automatically if customSelsAndStyles is a reactive object.
    // If it doesn't, we might need an event bus or a different reactivity trigger.
    return true;
}

/**
 * Replaces all custom styles with a new set.
 *
 * @param {{ [key: string]: ISelAndStyle }} newStyles  The new styles to apply.
 * @param {string[]} [disabledNames]  Names that should be restored to the
 *     disabled (toggled-off) state. Defaults to none, so a fresh set starts
 *     fully enabled. Passed when reloading a saved session to reproduce the
 *     user's prior toggle state.
 */
export function replaceAllCustomStyles(
    newStyles: {
    [key: string]: ISelAndStyle;
    },
    disabledNames: string[] = []
): void {
    // Clear existing styles
    for (const name in customSelsAndStyles) {
        delete customSelsAndStyles[name];
    }
    disabledCustomStyleNames.clear();
    // Add new styles
    for (const name in newStyles) {
        customSelsAndStyles[name] = newStyles[name];
    }
    // Restore the disabled state for any styles that were toggled off.
    for (const name of disabledNames) {
        disabledCustomStyleNames.add(name);
    }
    updateStylesInViewer();
}

// Binding-pocket styling is applied as an independent layer over protein nodes
// (restricted to the pocket residues), so it is held separately from the
// per-mol-type styles rather than in currentSelsAndStyles.
const _bindingPocketState = reactive<{ style: ISelAndStyle }>({ style: {} });
let _pocketSelectionsByNodeId: PocketSelectionsByNodeId = {};
let _pocketCacheSignature = "";
let _pocketComputeInFlight = false;

export function getBindingPocketStyle(): ISelAndStyle {
    return _bindingPocketState.style;
}

export function setBindingPocketStyle(style: ISelAndStyle): void {
    // Wire up live recomputation the first time the pocket is used.
    _registerBindingPocketAutoUpdate();
    _bindingPocketState.style = style;
    updateStylesInViewer();
}

/**
 * A pocket layer is only worth computing/applying when it actually draws
 * something. With the default "none" style this is false, so the feature adds
 * negligible cost until the user enables a representation.
 */
function _bindingPocketStyleIsActive(): boolean {
    const s = _bindingPocketState.style;
    return !!(s.sphere || s.stick || s.line || s.cartoon || s.surface);
}

let _bindingPocketAutoUpdateRegistered = false;

/**
 * Recompute the pocket whenever the molecule set changes, so showing or hiding
 * a protein or compound refreshes the visualization. bindingPocketSignature()
 * tracks visibility, so this is a no-op unless the visible protein/compound set
 * actually changed, and _ensureBindingPocketSelections short-circuits entirely
 * while the pocket style is inactive. Registered lazily (once) to avoid a
 * module-load side effect and to only attach when the feature is used.
 */
function _registerBindingPocketAutoUpdate(): void {
    if (_bindingPocketAutoUpdateRegistered) {
        return;
    }
    _bindingPocketAutoUpdateRegistered = true;
    allHooks.onMoleculesChanged.push(() => {
        void _ensureBindingPocketSelections();
    });
}

/**
 * Recompute pocket residues when needed, then re-apply styles so the pocket
 * paints. Skips work when the pocket is inactive or the visible molecule set is
 * unchanged. The distance search runs after a microtask yield so the current
 * style pass can paint first.
 */
async function _ensureBindingPocketSelections(): Promise<void> {
    if (!_bindingPocketStyleIsActive()) {
        // Drop any stale cache so reactivation triggers a fresh compute.
        if (Object.keys(_pocketSelectionsByNodeId).length > 0) {
            _pocketSelectionsByNodeId = {};
            _pocketCacheSignature = "";
        }
        return;
    }

    const signature = bindingPocketSignature();
    if (signature === _pocketCacheSignature || _pocketComputeInFlight) {
        return;
    }

    _pocketComputeInFlight = true;
    let staleResult = false;
    try {
        await Promise.resolve();
        const selections = computeBindingPocketSelections(
            BINDING_POCKET_DISTANCE
        );
        // Only commit if the visible set has not changed mid-computation.
        if (bindingPocketSignature() === signature) {
            _pocketSelectionsByNodeId = selections;
            _pocketCacheSignature = signature;
            // Re-apply; the signature now matches, so this will not recompute.
            updateStylesInViewer();
        } else {
            staleResult = true;
        }
    } finally {
        _pocketComputeInFlight = false;
    }

    // The visible set moved while computing, so the result was discarded.
    // Recompute against the current set. This terminates because it returns
    // early once the signature matches the committed cache.
    if (staleResult) {
        void _ensureBindingPocketSelections();
    }
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
                        if (customSelAndStyle.moleculeId) {
                            // This style is for a specific molecule.
                            if (
                                customSelAndStyle.moleculeId ===
                                terminalNode.id
                            ) {
                                terminalNode.styles.push(customSelAndStyle);
                            }
                        } else {
                            // This style is for all molecules.
                            terminalNode.styles.push(customSelAndStyle);
                        }
                    }
                }
            }
            // Overlay the binding-pocket layer on protein nodes, restricted to
            // this node's pocket residues. Added as an extra style so it stacks
            // on top of the protein's own representation.
            if (
                molType === TreeNodeType.Protein &&
                _bindingPocketStyleIsActive()
            ) {
                const perChain =
                    _pocketSelectionsByNodeId[terminalNode.id as string];
                if (perChain) {
                    const pocketStyle = JSON.parse(
                        JSON.stringify(_bindingPocketState.style)
                    ) as ISelAndStyle;
                    pocketStyle.selection = perChainToSelection(perChain);
                    terminalNode.styles.push(pocketStyle);
                }
            }
            // Mark this for rerendering in viewer.
            // console.log("MOO", JSON.stringify(terminalNode.styles, null, 2));
            terminalNode.viewerDirty = true;
        }
    }

    // Update all molecules. Note that this triggers reactivity
    // onTreeviewChanged() in ViewerPanel.vue.
    setStoreVar("molecules", molecules);
    // Fire-and-forget: computes pocket residues off the critical path and
    // re-applies styles once ready.
    void _ensureBindingPocketSelections();
}
