import { getUrlParam } from "@/Core/UrlParams";

export enum Tag {
    All = "all",
    Docking = "docking",
    Visualization = "visualization",
    Modeling = "modeling",
    Cheminformatics = "cheminformatics",
    LeadOptimization = "lead-optimization",
}

const tagShortDescriptions: { [key in Tag]: string } = {
    [Tag.All]: "Access all available tools and features.",
    [Tag.Docking]: "Focus on computational prediction of protein-ligand interactions.",
    [Tag.Visualization]: "Focus on visual exploration of molecular structures.",
    [Tag.Modeling]: "Focus on building and modifying molecular structures.",
    [Tag.Cheminformatics]: "Focus on chemical structures and their properties.",
    [Tag.LeadOptimization]: "Focus on the iterative process of improving the binding affinities of compounds (ligands).."
};

const tagLongDescriptions: { [key in Tag]: string } = {
    [Tag.All]: "Recommended for users who need the full range of capabilities or who are performing multiple types of tasks.",
    [Tag.Docking]: "Ideal for researchers studying how small molecules bind to protein targets.",
    [Tag.Visualization]: "Perfect for examining structural details and creating high-quality molecular visualizations for publications or presentations.",
    [Tag.Modeling]: "Suitable for researchers who need to prepare molecules for computational analysis or modify existing structures.",
    [Tag.Cheminformatics]: "Designed for analyzing molecular features and managing chemical information systematically.",
    [Tag.LeadOptimization]: "Ideal for researchers working to optimize candidate molecules."
};

const appTags: Tag[] = [];

/**
 * Setup the tags for the app.
 */
export function setupTags() {
    // Get "tags" from the url parameter
    const tags = getUrlParam("focus");
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

/**
 * Get the activity focus mode.
 * 
 * @returns {string}  The activity focus mode.
 */
export function getActivityFocusMode(): string {
    // Set the initial mode based on URL
    let mode = getUrlParam("focus");
    if (mode === null) {
        mode = "all";
    }
    return mode;
}

/**
 * Get the activity focus mode description.
 * 
 * @param {string} mode  The activity focus mode.
 * @returns {string}  The activity focus mode description.
 */
export function getActvityFocusModeDescription(mode: string): string[] {
    return [tagShortDescriptions[mode as Tag], tagLongDescriptions[mode as Tag]];
}


// export const appTitles: { [key in Tag]: string } = {
//     [Tag.All]: "All Title",
//     [Tag.Docking]: "Docking Title"
// };