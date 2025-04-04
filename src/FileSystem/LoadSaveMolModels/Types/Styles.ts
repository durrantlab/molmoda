import {
    getMoleculesFromStore,
    setStoreVar,
} from "@/Store/StoreExternalAccess";
import { IStyle, TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import isEqual from "lodash.isequal";

export const unbondedAtomsStyle: IStyle = {
    sphere: {
        radius: 0.5,
    },
};

const _sphereStyle: IStyle = {
    sphere: {},
};

const _stickStyle: IStyle = {
    stick: {},
};

export const defaultProteinStyle: IStyle[] = [
    {
        cartoon: {
            color: "spectrum",
        },
    },
];

export const defaultNucleicStyle: IStyle[] = [_stickStyle];

export const defaultLigandsStyle: IStyle[] = [_stickStyle];

export const defaultMetalsStyle: IStyle[] = [_sphereStyle];

export const defaultLipidStyle: IStyle[] = [_stickStyle];

export const defaultIonsStyle: IStyle[] = [_sphereStyle];

export const defaultSolventStyle: IStyle[] = [_stickStyle];

// export const defaultOtherStyle: IStyle[] = [_sphereStyle];

// Empty on purpose to satisfy typescript
const regionStyle: IStyle[] = [];

// This is used to restore original styling, for example after hiding a
// representation and then bringing it back.
export const defaultStyles: { [key in TreeNodeType]: IStyle[] } = {
    [TreeNodeType.Protein]: defaultProteinStyle,
    [TreeNodeType.Nucleic]: defaultNucleicStyle,
    [TreeNodeType.Compound]: defaultLigandsStyle,
    [TreeNodeType.Metal]: defaultMetalsStyle,
    [TreeNodeType.Lipid]: defaultLipidStyle,
    [TreeNodeType.Ions]: defaultIonsStyle,
    [TreeNodeType.Solvent]: defaultSolventStyle,
    [TreeNodeType.Region]: regionStyle,
    [TreeNodeType.Other]: [],  // Must be defined explicitly (TreeNode.styles = [{...}])
};

// This is the styles actually used. It is initially set to be the same as the
// defaults, but it will change per user specifications.
export const currentStyles: { [key in TreeNodeType]: IStyle[] } = JSON.parse(
    JSON.stringify(defaultStyles)
);

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
            const style = currentStyles[molType];

            // Check if the node type matches this type. If not, skip to the
            // next node.
            if (terminalNode.type !== molType) {
                continue;
            }

            // Add the styles to the node list if it's not empty ({}).
            terminalNode.styles = [];
            if (!isEqual(style, {})) {
                terminalNode.styles.push(style[0]);
            }
            // TODO: Why style[0] above? Can the length ever be more than 1?

            // Mark this for rerendering in viewer.
            terminalNode.viewerDirty = true;
        }
    }

    // Update all molecules. Note that this triggers reactivity
    // onTreeviewChanged() in ViewerPanel.vue.
    setStoreVar("molecules", molecules);
}
