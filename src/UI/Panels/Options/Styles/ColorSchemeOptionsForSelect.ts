import { colorNameToHex } from "@/Core/Styling/Colors/ColorUtils";
import { ISelAndStyle, Representation } from "@/Core/Styling/SelAndStyleInterfaces";
import { IColorScheme } from "@/Core/Styling/Colors/ColorInterfaces";
import { IUserArgOption } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    allColorSchemeDefinitions,
    colorDefinitionIndexToScheme,
    colorDefinitionNameToIndex,
    colorDefinitionNameToScheme,
} from "@/Core/Styling/Colors/ColorSchemeDefinitions";

export const defaultColor = "#C0C0C0"; // silver

/**
 * Data class to store information about color styles. This is used to populate
 * a select dropdown for color styles in the UI (ColorSchemeSelect).
 */
export class ColorSchemeOptionsForSelect {
    public color = "#C0C0C0"; // silver

    /**
     * Color options (e.g., Color by Element) are presented as a select box.
     * This gets the appropriate options for that box. Depends on type of
     * molecule.
     *
     * @param {Representation} rep  The representation name.
     * @param {TreeNodeType}   molType  The type of molecule (e.g., protein,
     *                                  nucleic).
     * @returns {IUserArgOption[]}  The options for the color-style select box.
     */
    public createColorSchemeOptionsForSelect(
        rep: Representation,
        molType: TreeNodeType
    ): IUserArgOption[] {
        const colorFormOptions: IUserArgOption[] = [];

        for (const colorSchemeDefinition of allColorSchemeDefinitions) {
            // Make sure it doesn't have both excludeCases and includeCases.
            if (colorSchemeDefinition.excludeCases && colorSchemeDefinition.includeCases) {
                throw new Error(
                    "Color style must have either excludeCases or includeCases, but not both."
                );
            }

            // If it has excludeCases, make sure the current representation and
            // molecule type are not in the excludeCases.
            if (
                colorSchemeDefinition.excludeCases &&
                (colorSchemeDefinition.excludeCases.includes(rep) ||
                    colorSchemeDefinition.excludeCases.includes(molType))
            ) {
                continue; // Skip this color style
            }

            // If it has includeCases, make sure the current representation and
            // molecule type are in the includeCases.
            if (
                colorSchemeDefinition.includeCases &&
                !(
                    colorSchemeDefinition.includeCases.includes(rep) ||
                    colorSchemeDefinition.includeCases.includes(molType)
                )
            ) {
                continue; // Skip this color style
            }

            // If we get here, the color style is valid for this mol type/representation.
            colorFormOptions.push({
                description: colorSchemeDefinition.description,
                val: colorDefinitionNameToIndex(colorSchemeDefinition.name),
            });
        }

        return colorFormOptions;
    }

    /**
     * Given a color style, get the hex colors.
     *
     * @param {ISelAndStyle} style  The style.
     * @returns {string[]}  The hex colors.
     */
    public extractHexColorsFromStyle(style: ISelAndStyle): string[] {
        const styleRecast = style as { [key: string]: IColorScheme };
        const colors: string[] = [];
        for (const rep in styleRecast) {
            const colorScheme = styleRecast[rep] as IColorScheme;
            // Is it hex?
            if (colorScheme.color?.startsWith("#")) {
                colors.push(colorScheme.color);
            }

            // Is it colorName?
            if (colorScheme.colorscheme?.endsWith("Carbon")) {
                // Remove Carbon at end.
                const colorName = colorScheme.colorscheme.substring(
                    0,
                    colorScheme.colorscheme.length - 6
                );
                colors.push(colorNameToHex(colorName));
            }
        }

        return colors;
    }

    /**
     * Given an index in the colorSchemes array, returns the color style.
     *
     * @param {number} index  The index.
     * @returns {IColorScheme}  The color style.
     */
    public colorDefinitionIndexToScheme(index: number): IColorScheme {
        return colorDefinitionIndexToScheme(index, this.color);
    }

    /**
     * Given a name, returns the color style.
     *
     * @param {string} name  The name.
     * @returns {IColorScheme}  The color style.
     */
    public colorDefinitionNameToScheme(name: string): IColorScheme {
        return colorDefinitionNameToScheme(name, this.color);
    }
}
