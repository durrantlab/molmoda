import { IColorStyle, IStyle } from "@/UI/Navigation/TreeView/TreeInterfaces";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import isEqual from "lodash.isequal";
import { hexToColorName, colorNameToHex } from "./ColorConverter";


interface INameAndColorStyle {
    name: string;
    colorStyle: IColorStyle;
}

/**
 * Data class to store information about color styles.
 */
export class ColorOptions {
    private _colorStyles: INameAndColorStyle[] = [
        {
            name: "Element",
            colorStyle: { colorscheme: "default" },
        },
        {
            name: "ColorCarbons",
            colorStyle: { colorscheme: "#COLORNAMECarbon" },
            // colorStyle: { colorscheme: "LightCoralCarbon" },
        },
        {
            name: "Spectrum",
            colorStyle: { color: "spectrum" },
        },
        {
            name: "SecondaryStructure",
            colorStyle: { colorscheme: "ssJmol" },
        },
        {
            name: "Chain",
            colorStyle: { colorscheme: "chain" },
        },
        {
            name: "Solid",
            colorStyle: { color: "#HEX" },
        },
    ];

    public defaultColor = "#C0C0C0"; // silver
    public color = "#C0C0C0"; // silver

    /**
     * Converts a name to an index in _colorStyles.
     *
     * @param {string} name  The name.
     * @returns {number} The index.
     */
    public nameToIndex(name: string): number {
        return this._colorStyles.findIndex(
            (colorStyle) => colorStyle.name === name
        );
    }

    /**
     * Converts a style to an index in the _colorStyles array.
     *
     * @param {IColorStyle} style  The style.
     * @returns {number} The index.
     */
    public styleToIndex(style: IColorStyle): number {
        if (style.color !== undefined && style.color !== "spectrum") {
            // It must be "Solid"
            return this.nameToIndex("Solid");
        }

        if (
            style.colorscheme !== undefined &&
            style.colorscheme.endsWith("Carbon")
        ) {
            // It must be "ColorCarbons"
            return this.nameToIndex("ColorCarbons");
        }

        // If you get here, it's easy to determine based on deep equality. 
        return this._colorStyles.findIndex((colorStyle) =>
            isEqual(colorStyle.colorStyle, style)
        );
    }

    /**
     * Converts an index in the _colorStyles array to a name.
     *
     * @param {number} index  The index.
     * @returns {string} The name.
     */
    public indexToName(index: number): string {
        return this._colorStyles[index].name;
    }

    /**
     * Given an index in the _colorStyles array, returns the color style.
     *
     * @param {number} index  The index.
     * @returns {IColorStyle}  The color style.
     */
    public indexToStyle(index: number): IColorStyle {
        let {colorStyle} = this._colorStyles[index];
        colorStyle = this._addColorToStyle(colorStyle);
        return colorStyle;
    }

    /**
     * Given a name, returns the color style.
     *
     * @param {string} name  The name.
     * @returns {IColorStyle}  The color style.
     */
    public nameToStyle(name: string): IColorStyle {
        let {colorStyle} = this._colorStyles[this.nameToIndex(name)];
        colorStyle = this._addColorToStyle(colorStyle);
        return colorStyle;
    }

    /**
     * Given a color style, get the hex colors.
     *
     * @param {IStyle} style  The style.
     * @returns {string[]}  The hex colors.
     */
    public extractHexColorsFromStyle(style: IStyle): string[] {
        const styleRecast = style as { [key: string]: IColorStyle };
        const colors: string[] = [];
        for (const rep in styleRecast) {
            const colorStyle = styleRecast[rep] as IColorStyle;
            // Is it hex?
            if (colorStyle.color?.startsWith("#")) {
                colors.push(colorStyle.color);
            }

            // Is it colorName?
            if (colorStyle.colorscheme?.endsWith("Carbon")) {
                // Remove Carbon at end.
                const colorName = colorStyle.colorscheme.substring(
                    0,
                    colorStyle.colorscheme.length - 6
                );
                colors.push(colorNameToHex(colorName));
            }
        }

        return colors;
    }

    /**
     * Adds a color to the style
     *
     * @param {IColorStyle} colorStyle  The color style.
     * @returns {IColorStyle}  The color style with the color added.
     */
     private _addColorToStyle(colorStyle: IColorStyle): IColorStyle {
        let strColorStyle = JSON.stringify(colorStyle);

        // Has #HEX?
        if (strColorStyle.indexOf("#HEX") > -1) {
            strColorStyle = strColorStyle.replace(/#HEX/g, this.color);
        }

        // Has #COLORNAME?
        if (strColorStyle.indexOf("#COLORNAME") > -1) {
            strColorStyle = strColorStyle.replace(
                /#COLORNAME/g,
                hexToColorName(this.color)
            );
        }

        return JSON.parse(strColorStyle);
    }
}
