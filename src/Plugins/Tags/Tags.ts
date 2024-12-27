import { getUrlParam } from "@/Core/UrlParams";

export enum Tag {
    All = "all",
    Docking = "docking",
    Visualization = "visualization"
}

const appTags: Tag[] = [];

/**
 * Setup the tags for the app.
 */
export function setupTags() {
    // Get "tags" from the url parameter
    const tags = getUrlParam("tags");
    if (tags) {
        // Split the tags by comma
        const tagArray = tags.split(",");
        // Iterate through the tags
        for (const tag of tagArray) {
            // If the tag is in the Tag enum, add it to the tags array
            if (Object.values(Tag).includes(tag as Tag)) {
                appTags.push(tag as Tag);
            }
        }
    }

    if (appTags.length === 0) {
        appTags.push(Tag.All);
    }

    console.log(appTags);
}

/**
 * Check if the plugin matches the tags.
 * 
 * @param {Tag[]} pluginTags  The tags of the plugin.
 * @returns {boolean}  True if the plugin matches the tags, false otherwise.
 */
export function matchesTag(pluginTags: Tag[]): boolean {
    // If Tag.All is in pluginTags, always return true.
    if (pluginTags.includes(Tag.All)) {
        return true;
    }

    // If Tag.All is in appTags, also return true;
    if (appTags.includes(Tag.All)) {
        return true;
    }

    // If there are tags, check if the plugin has any of the tags
    for (const tag of appTags) {
        if (pluginTags.includes(tag)) {
            return true;
        }
    }

    return false;
}

// export const appTitles: { [key in Tag]: string } = {
//     [Tag.All]: "All Title",
//     [Tag.Docking]: "Docking Title"
// };