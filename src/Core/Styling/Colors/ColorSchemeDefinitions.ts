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

/**
 * Adds a color to the style
 *
 * @param {IColorScheme} colorScheme  The color style.
 * @param {string}      color       The color to add.
 * @returns {IColorScheme}  The color style with the color added.
 */
const _addColorToStyle = memoize(
    function (colorScheme: IColorScheme, color: string): IColorScheme {
        const newColorScheme = { ...colorScheme };
        const replacePlaceholders = (val: string): string => {
            let newVal = val;
            if (newVal.indexOf("#HEX") > -1) {
                newVal = newVal.replace(/#HEX/g, color);
            }
            if (newVal.indexOf("#COLORNAME") > -1) {
                newVal = newVal.replace(/#COLORNAME/g, hexToColorName(color));
            }
            return newVal;
        };

        if (typeof newColorScheme.color === "string") {
            newColorScheme.color = replacePlaceholders(newColorScheme.color);
        }
        if (typeof newColorScheme.colorscheme === "string") {
            newColorScheme.colorscheme = replacePlaceholders(
                newColorScheme.colorscheme
            );
        }
        return newColorScheme;
    },
    (...args) => JSON.stringify(args)
);

/**
 * Converts a name to an index in colorSchemes (since colorSchemes is a list
 * of objects where each entry has a 'name' key).
 *
 * @param {string} name  The name.
 * @returns {number} The index.
 */
export const colorDefinitionNameToIndex = memoize(function (
    name: string
): number {
    if (name === "ByMolecule") {
        debugger;
    }
    return allColorSchemeDefinitions.findIndex(
        (colorSchemeDef) => colorSchemeDef.name === name
    );
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

/**
 * Converts a style to an index in the colorSchemes array.
 *
 * @param {IColorScheme} colorScheme  The style.
 * @returns {number} The index.
 */
export function colorSchemeToDefinitionIndex(
    colorScheme: IColorScheme
): number {
    if (
        colorScheme.color !== undefined &&
        colorScheme.color === "@byMolecule"
    ) {
        return colorDefinitionNameToIndex("Molecule");
    }

    if (colorScheme.color !== undefined && colorScheme.color !== "spectrum") {
        // It must be "Solid"
        return colorDefinitionNameToIndex("Solid");
    }

    if (
        colorScheme.colorscheme !== undefined &&
        colorScheme.colorscheme.endsWith("Carbon")
    ) {
        // It must be "ColorCarbons"
        return colorDefinitionNameToIndex("ColorCarbons");
    }

    if (
        colorScheme.colorscheme !== undefined &&
        colorScheme.colorscheme === "ssJmol"
    ) {
        return colorDefinitionNameToIndex("SecondaryStructure");
    }

    if (
        colorScheme.colorscheme !== undefined &&
        colorScheme.colorscheme === "chain"
    ) {
        return colorDefinitionNameToIndex("Chain");
    }

    // If you get here, it's easy to determine based on deep equality.
    return allColorSchemeDefinitions.findIndex((colorNameAndScheme) =>
        isEqual(colorNameAndScheme.colorScheme, colorScheme)
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
    let { colorScheme } = allColorSchemeDefinitions[index];
    colorScheme = _addColorToStyle(colorScheme, color);
    return colorScheme;
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
    let { colorScheme: colorScheme } =
        allColorSchemeDefinitions[colorDefinitionNameToIndex(name)];
    colorScheme = _addColorToStyle(colorScheme, color);
    return colorScheme;
}
