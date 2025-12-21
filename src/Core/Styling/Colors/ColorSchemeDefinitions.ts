import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    BackBoneRepresentation,
    Representation,
} from "../SelAndStyleInterfaces";
import { IColorScheme } from "./ColorInterfaces";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import isEqual from "lodash.isequal";
import { hexToColorName } from "./ColorUtils";
import memoize from "lodash.memoize";

interface IColorSchemeDefinition {
    name: string;
    description: string;
    colorScheme: IColorScheme;

    // NOTE: Can't have both excludeCases and includeCases. If both are present,
    // throws an error.
    excludeCases?: (Representation | TreeNodeType)[];
    includeCases?: (Representation | TreeNodeType)[];
}

export const allColorSchemeDefinitions: IColorSchemeDefinition[] = [
    {
        name: "Element",
        description: "Color by Element",
        colorScheme: { colorscheme: "default" },

        // Only disallowed if backbone (protein).
        excludeCases: [BackBoneRepresentation.Cartoon],
    },
    {
        name: "ColorCarbons",
        description: "Color Carbons",
        colorScheme: { colorscheme: "#COLORNAMECarbon" },
        // colorScheme: { colorscheme: "LightCoralCarbon" },

        // Not allowed if backbone (protein) or metal.
        excludeCases: [BackBoneRepresentation.Cartoon, TreeNodeType.Metal],
    },
    {
        name: "Spectrum",
        description: "Color by Spectrum",
        colorScheme: { color: "spectrum" },

        // Only allowed if backbone (protein).
        includeCases: [BackBoneRepresentation.Cartoon],
    },
    {
        name: "SecondaryStructure",
        description: "Color by Secondary Structure",
        colorScheme: { colorscheme: "ssJmol" },

        // Only makes sense for proteins (all representations).
        includeCases: [TreeNodeType.Protein],
    },
    {
        name: "Chain",
        description: "Color by Chain",
        colorScheme: { colorscheme: "chain" },
        // Always valid option, regardless of molecule type or representation
    },
    {
        name: "Molecule",
        description: "Color by Molecule",
        colorScheme: { color: "@byMolecule" }, // Special marker for molecule-based coloring
        // Always valid option, regardless of molecule type or representation
    },
    {
        name: "Solid",
        description: "Color by Solid",
        colorScheme: { color: "#HEX" },
        // Always valid option, regardless of molecule type or representation
    },
];

// Pre-compute name to index map for O(1) lookups
const colorDefinitionNameToIndexMap = new Map<string, number>(
    allColorSchemeDefinitions.map((def, index) => [def.name, index])
);

/**
 * Adds a color to the style using definition index.
 * Optimized memoization using simple string key instead of JSON.stringify.
 *
 * @param {number} definitionIndex  The index in allColorSchemeDefinitions
 * @param {string} color  The color to add.
 * @returns {IColorScheme}  The color style with the color added.
 */
const _addColorToStyleByIndex = memoize(
    function (definitionIndex: number, color: string): IColorScheme {
        const colorScheme = allColorSchemeDefinitions[definitionIndex].colorScheme;
        const newColorScheme = { ...colorScheme };

        const replacePlaceholders = (val: string): string => {
            let newVal = val;
            if (newVal.includes("#HEX")) {
                newVal = newVal.replace(/#HEX/g, color);
            }
            if (newVal.includes("#COLORNAME")) {
                newVal = newVal.replace(/#COLORNAME/g, hexToColorName(color));
            }
            return newVal;
        };

        if (typeof newColorScheme.color === "string") {
            newColorScheme.color = replacePlaceholders(newColorScheme.color);
        }
        if (typeof newColorScheme.colorscheme === "string") {
            newColorScheme.colorscheme = replacePlaceholders(newColorScheme.colorscheme);
        }
        return newColorScheme;
    },
    // Simple string concatenation instead of JSON.stringify
    (definitionIndex: number, color: string) => `${definitionIndex}|${color}`
);

/**
 * Converts a name to an index in colorSchemes.
 * Uses pre-computed Map for O(1) lookup instead of O(n) array search.
 *
 * @param {string} name  The name.
 * @returns {number} The index.
 */
export const colorDefinitionNameToIndex = memoize(function (
    name: string
): number {
    const index = colorDefinitionNameToIndexMap.get(name);
    return index !== undefined ? index : -1;
});

/**
 * Converts an index in the colorSchemes array to a name.
 *
 * @param {number} index  The index.
 * @returns {string} The name.
 */
export function colorDefinitionIndexToName(index: number): string {
    return allColorSchemeDefinitions[index].name;
}

// Pre-computed indices for commonly used color definitions
const MOLECULE_INDEX = colorDefinitionNameToIndex("Molecule");
const SOLID_INDEX = colorDefinitionNameToIndex("Solid");
const COLOR_CARBONS_INDEX = colorDefinitionNameToIndex("ColorCarbons");
const SECONDARY_STRUCTURE_INDEX = colorDefinitionNameToIndex("SecondaryStructure");
const CHAIN_INDEX = colorDefinitionNameToIndex("Chain");

/**
 * Converts a style to an index in the colorSchemes array.
 *
 * @param {IColorScheme} colorScheme  The style.
 * @returns {number} The index.
 */
export function colorSchemeToDefinitionIndex(
    colorScheme: IColorScheme
): number {
    const { color, colorscheme } = colorScheme;

    // Check color-based schemes first
    if (color !== undefined) {
        if (color === "@byMolecule") {
            return MOLECULE_INDEX;
        }
        if (color !== "spectrum") {
            return SOLID_INDEX;
        }
    }

    // Check colorscheme-based schemes
    if (colorscheme !== undefined) {
        if (colorscheme.endsWith("Carbon")) {
            return COLOR_CARBONS_INDEX;
        }
        if (colorscheme === "ssJmol") {
            return SECONDARY_STRUCTURE_INDEX;
        }
        if (colorscheme === "chain") {
            return CHAIN_INDEX;
        }
    }

    // Fallback to deep equality check (rare case)
    return allColorSchemeDefinitions.findIndex((def) =>
        isEqual(def.colorScheme, colorScheme)
    );
}

/**
 * Given an index in the colorSchemes array, returns the color style.
 *
 * @param {number} index  The index.
 * @param {string} color  The color to add to the style.
 * @returns {IColorScheme}  The color style.
 */
export function colorDefinitionIndexToScheme(
    index: number,
    color: string
): IColorScheme {
    return _addColorToStyleByIndex(index, color);
}

/**
 * Given a name, returns the color style.
 *
 * @param {string} name  The name.
 * @param {string} color  The color to add to the style.
 * @returns {IColorScheme}  The color style.
 */
export function colorDefinitionNameToScheme(
    name: string,
    color: string
): IColorScheme {
    const index = colorDefinitionNameToIndex(name);
    return _addColorToStyleByIndex(index, color);
}