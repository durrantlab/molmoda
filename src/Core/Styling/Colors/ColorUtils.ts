import { memoize } from "lodash";

interface IColorInfo {
    hex: string;
    name: string;
    rgb?: number[];
}

/**
 * Cache to store molecule colors to ensure consistency within a session
 */
const namedPastelColors: { [key: string]: string } = {};

// See https://www.scaler.com/topics/html-color-names/
let colorInfomation = [
    { hex: "#F0F8FF", name: "AliceBlue" },
    { hex: "#FAEBD7", name: "AntiqueWhite" },
    { hex: "#00FFFF", name: "Aqua" },
    { hex: "#7FFFD4", name: "Aquamarine" },
    { hex: "#F0FFFF", name: "Azure" },
    { hex: "#F5F5DC", name: "Beige" },
    { hex: "#FFE4C4", name: "Bisque" },
    { hex: "#000000", name: "Black" },
    { hex: "#FFEBCD", name: "BlanchedAlmond" },
    { hex: "#0000FF", name: "Blue" },
    { hex: "#8A2BE2", name: "BlueViolet" },
    { hex: "#A52A2A", name: "Brown" },
    { hex: "#DEB887", name: "BurlyWood" },
    { hex: "#5F9EA0", name: "CadetBlue" },
    { hex: "#7FFF00", name: "Chartreuse" },
    { hex: "#D2691E", name: "Chocolate" },
    { hex: "#FF7F50", name: "Coral" },
    { hex: "#6495ED", name: "CornflowerBlue" },
    { hex: "#FFF8DC", name: "Cornsilk" },
    { hex: "#DC143C", name: "Crimson" },
    { hex: "#00008B", name: "DarkBlue" },
    { hex: "#008B8B", name: "DarkCyan" },
    { hex: "#B8860B", name: "DarkGoldenRod" },
    { hex: "#A9A9A9", name: "DarkGrey" },
    { hex: "#006400", name: "DarkGreen" },
    { hex: "#BDB76B", name: "DarkKhaki" },
    { hex: "#8B008B", name: "DarkMagenta" },
    { hex: "#556B2F", name: "DarkOliveGreen" },
    { hex: "#FF8C00", name: "Darkorange" },
    { hex: "#9932CC", name: "DarkOrchid" },
    { hex: "#8B0000", name: "DarkRed" },
    { hex: "#E9967A", name: "DarkSalmon" },
    { hex: "#8FBC8F", name: "DarkSeaGreen" },
    { hex: "#483D8B", name: "DarkSlateBlue" },
    { hex: "#2F4F4F", name: "DarkSlateGrey" },
    { hex: "#00CED1", name: "DarkTurquoise" },
    { hex: "#9400D3", name: "DarkViolet" },
    { hex: "#FF1493", name: "DeepPink" },
    { hex: "#00BFFF", name: "DeepSkyBlue" },
    { hex: "#696969", name: "DimGray" },
    { hex: "#1E90FF", name: "DodgerBlue" },
    { hex: "#B22222", name: "FireBrick" },
    { hex: "#FFFAF0", name: "FloralWhite" },
    { hex: "#228B22", name: "ForestGreen" },
    { hex: "#FF00FF", name: "Fuchsia" },
    { hex: "#DCDCDC", name: "Gainsboro" },
    { hex: "#F8F8FF", name: "GhostWhite" },
    { hex: "#FFD700", name: "Gold" },
    { hex: "#DAA520", name: "GoldenRod" },
    { hex: "#808080", name: "Grey" },
    { hex: "#008000", name: "Green" },
    { hex: "#ADFF2F", name: "GreenYellow" },
    { hex: "#F0FFF0", name: "HoneyDew" },
    { hex: "#FF69B4", name: "HotPink" },
    { hex: "#CD5C5C", name: "IndianRed" },
    { hex: "#4B0082", name: "Indigo" },
    { hex: "#FFFFF0", name: "Ivory" },
    { hex: "#F0E68C", name: "Khaki" },
    { hex: "#E6E6FA", name: "Lavender" },
    { hex: "#FFF0F5", name: "LavenderBlush" },
    { hex: "#7CFC00", name: "LawnGreen" },
    { hex: "#FFFACD", name: "LemonChiffon" },
    { hex: "#ADD8E6", name: "LightBlue" },
    { hex: "#F08080", name: "LightCoral" },
    { hex: "#E0FFFF", name: "LightCyan" },
    { hex: "#FAFAD2", name: "LightGoldenRodYellow" },
    { hex: "#D3D3D3", name: "LightGrey" },
    { hex: "#90EE90", name: "LightGreen" },
    { hex: "#FFB6C1", name: "LightPink" },
    { hex: "#FFA07A", name: "LightSalmon" },
    { hex: "#20B2AA", name: "LightSeaGreen" },
    { hex: "#87CEFA", name: "LightSkyBlue" },
    { hex: "#778899", name: "LightSlateGrey" },
    { hex: "#B0C4DE", name: "LightSteelBlue" },
    { hex: "#FFFFE0", name: "LightYellow" },
    { hex: "#00FF00", name: "Lime" },
    { hex: "#32CD32", name: "LimeGreen" },
    { hex: "#FAF0E6", name: "Linen" },
    { hex: "#800000", name: "Maroon" },
    { hex: "#66CDAA", name: "MediumAquaMarine" },
    { hex: "#0000CD", name: "MediumBlue" },
    { hex: "#BA55D3", name: "MediumOrchid" },
    { hex: "#9370D8", name: "MediumPurple" },
    { hex: "#3CB371", name: "MediumSeaGreen" },
    { hex: "#7B68EE", name: "MediumSlateBlue" },
    { hex: "#00FA9A", name: "MediumSpringGreen" },
    { hex: "#48D1CC", name: "MediumTurquoise" },
    { hex: "#C71585", name: "MediumVioletRed" },
    { hex: "#191970", name: "MidnightBlue" },
    { hex: "#F5FFFA", name: "MintCream" },
    { hex: "#FFE4E1", name: "MistyRose" },
    { hex: "#FFE4B5", name: "Moccasin" },
    { hex: "#FFDEAD", name: "NavajoWhite" },
    { hex: "#000080", name: "Navy" },
    { hex: "#FDF5E6", name: "OldLace" },
    { hex: "#808000", name: "Olive" },
    { hex: "#6B8E23", name: "OliveDrab" },
    { hex: "#FFA500", name: "Orange" },
    { hex: "#FF4500", name: "OrangeRed" },
    { hex: "#DA70D6", name: "Orchid" },
    { hex: "#EEE8AA", name: "PaleGoldenRod" },
    { hex: "#98FB98", name: "PaleGreen" },
    { hex: "#AFEEEE", name: "PaleTurquoise" },
    { hex: "#D87093", name: "PaleVioletRed" },
    { hex: "#FFEFD5", name: "PapayaWhip" },
    { hex: "#FFDAB9", name: "PeachPuff" },
    { hex: "#CD853F", name: "Peru" },
    { hex: "#FFC0CB", name: "Pink" },
    { hex: "#DDA0DD", name: "Plum" },
    { hex: "#B0E0E6", name: "PowderBlue" },
    { hex: "#800080", name: "Purple" },
    { hex: "#FF0000", name: "Red" },
    { hex: "#BC8F8F", name: "RosyBrown" },
    { hex: "#4169E1", name: "RoyalBlue" },
    { hex: "#8B4513", name: "SaddleBrown" },
    { hex: "#FA8072", name: "Salmon" },
    { hex: "#F4A460", name: "SandyBrown" },
    { hex: "#2E8B57", name: "SeaGreen" },
    { hex: "#FFF5EE", name: "SeaShell" },
    { hex: "#A0522D", name: "Sienna" },
    { hex: "#C0C0C0", name: "Silver" },
    { hex: "#87CEEB", name: "SkyBlue" },
    { hex: "#6A5ACD", name: "SlateBlue" },
    { hex: "#708090", name: "SlateGrey" },
    { hex: "#FFFAFA", name: "Snow" },
    { hex: "#00FF7F", name: "SpringGreen" },
    { hex: "#4682B4", name: "SteelBlue" },
    { hex: "#D2B48C", name: "Tan" },
    { hex: "#008080", name: "Teal" },
    { hex: "#D8BFD8", name: "Thistle" },
    { hex: "#FF6347", name: "Tomato" },
    { hex: "#40E0D0", name: "Turquoise" },
    { hex: "#EE82EE", name: "Violet" },
    { hex: "#F5DEB3", name: "Wheat" },
    { hex: "#FFFFFF", name: "White" },
    { hex: "#F5F5F5", name: "WhiteSmoke" },
    { hex: "#FFFF00", name: "Yellow" },
    { hex: "#9ACD32", name: "YellowGreen" },
];

/**
 * Convert hex to rgb values
 *
 * @param  {string} hex  Hex color value
 * @returns {number[] | null}  RGB values
 */
function _hexToRgb(hex: string): number[] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [
              parseInt(result[1], 16),
              parseInt(result[2], 16),
              parseInt(result[3], 16),
          ]
        : null;
}

/**
 * Convert rgb to hex value.
 *
 * @param  {number[]} rgb  RGB values
 * @returns {string}  Hex color value
 */
function _rgbToHex(rgb: number[]): string {
    return (
        "#" +
        ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2])
            .toString(16)
            .slice(1)
    );
}

colorInfomation = colorInfomation.map((v: IColorInfo): IColorInfo => {
    v.rgb = _hexToRgb(v.hex) as number[];
    return v;
});

/**
 * Get the color name closest to a given hex color
 *
 * @param  {string} hex  Hex color value
 * @returns {string}  Color name
 */
export const hexToColorName = memoize(function (hex: string): string {
    // First, get rgb
    const rgb = _hexToRgb(hex) as number[];
    // No go through colorInformation and calculate distance to rgb
    const distances = colorInfomation.map((v: IColorInfo): number => {
        const rgb2 = v.rgb as number[];
        // distance
        return Math.sqrt(
            Math.pow(rgb2[0] - rgb[0], 2) +
                Math.pow(rgb2[1] - rgb[1], 2) +
                Math.pow(rgb2[2] - rgb[2], 2)
        );
    });
    // Get index on min distance
    const minDistanceIndex = distances.indexOf(Math.min(...distances));
    return colorInfomation[minDistanceIndex].name;
});

/**
 * Get the hex color value closest to a given color name
 *
 * @param  {string} name  Color name
 * @returns {string}  Hex color value
 */
export const colorNameToHex = memoize(function (name: string): string {
    name = name.toUpperCase();
    const color = colorInfomation.find(
        (v: IColorInfo): boolean => v.name.toUpperCase() === name
    );
    if (color) {
        return color.hex;
    }
    return "";
});

/**
 * Get the color information for a given color
 *
 * @param  {string | number[]} color  Color name or hex color value or rgb
 *         values.
 * @returns {IColorInfo}  Color information.
 */
export const analyzeColor = memoize(function (
    color: string | number[]
): IColorInfo {
    const colorInfo = {
        hex: "",
        name: "",
        rgb: [0, 0, 0],
    } as IColorInfo;

    // If it starts with "#", it's a hex color
    if (typeof color === "string" && color.startsWith("#")) {
        colorInfo.hex = color;
        colorInfo.name = hexToColorName(color);
        colorInfo.rgb = _hexToRgb(color) as number[];
    }

    // If it's an array of numbers, it's rgb
    else if (Array.isArray(color) && color.length === 3) {
        colorInfo.hex = _rgbToHex(color);
        colorInfo.name = hexToColorName(colorInfo.hex);
        colorInfo.rgb = color;
    }

    // It's a color name
    else if (typeof color === "string") {
        colorInfo.name = color;
        colorInfo.hex = colorNameToHex(color);
        colorInfo.rgb = _hexToRgb(colorInfo.hex) as number[];
    }

    return colorInfo;
});

/**
 * Get a hash from a string using FNV-1a algorithm. This is a simple hash
 * function that produces a 32-bit hash. It is not cryptographically secure, but
 * it is fast and suitable for generating consistent pseudo-random numbers from
 * strings.
 *
 * @param {string} str  The string to hash.
 * @returns {number}  The 32-bit hash value.
 */
function _fnv1aHash(str: string) {
    let hash = 2166136261; // FNV-1a 32-bit offset basis
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 16777619) >>> 0; // Prime multiplication and force 32-bit unsigned
    }
    return hash;
}

/**
 * Convert a seed string to three normalized numbers. This function uses the
 * FNV-1a hash to generate a consistent pseudo-random triplet of numbers
 * between 0 and 1 from the input string.
 *
 * @param {string} seedStr  The seed string to convert.
 * @returns {number[]}  An array of three normalized numbers.
 */
function _stringToThreeNumbers(seedStr: string) {
    const hash = _fnv1aHash(seedStr); // Get the hash
    const n1 = (hash & 0xffffff) / 0x1000000; // Extract lower 24 bits and normalize
    const n2 = ((hash >> 8) & 0xffffff) / 0x1000000;
    const n3 = ((hash >> 16) & 0xffffff) / 0x1000000;
    return [n1, n2, n3];
}

/**
 * Get a random pastel color as a hex value.
 *
 * @param {string} [seedStr]  Seed string to generate a consistent color.
 * @returns {string}  Hex color value
 */
export function randomPastelColor(seedStr?: string): string {
    let r = 0;
    let g = 0;
    let b = 0;

    if (seedStr === undefined) {
        // Use random numbers
        r = Math.floor(Math.random() * 256);
        g = Math.floor(Math.random() * 256);
        b = Math.floor(Math.random() * 256);
    } else {
        // Generate from the seed string for consistency.
        const [r1, g1, b1] = _stringToThreeNumbers(seedStr);
        r = Math.floor(r1 * 256);
        g = Math.floor(g1 * 256);
        b = Math.floor(b1 * 256);
    }

    // Make the color
    let rgb = [r, g, b];

    // Saturate it 10%
    const max = Math.max(...rgb);
    const sat = 0.1;
    rgb = rgb.map((val) => {
        return Math.floor(val + sat * (max - val));
    });

    // Mix it with white
    const mix = 0.5;
    rgb = rgb.map((val) => {
        return Math.floor(val * mix + 255 * (1 - mix));
    });

    // Set color to hex
    return "#" + rgb.map((val) => val.toString(16)).join("");
}

/**
 * Gets a consistent pastel color for a given name (e.g., molecule ID). The
 * color will be the same each time for a given name within a session.
 *
 * @param {string} name  The molecule name.
 * @returns {string}  The color.
 */
export function getNamedPastelColor(name: string): string {
    if (!namedPastelColors[name]) {
        namedPastelColors[name] = randomPastelColor();
    }
    return namedPastelColors[name];
}
