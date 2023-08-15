import { IMenuItem } from "@/UI/Navigation/Menu/Menu";

interface ILicense {
    name: string;
    url: string;
}

export const Licenses: { [key: string]: ILicense } = {
    MIT: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
    },
    APACHE2: {
        name: "Apache-2.0",
        // name: "Apache License, Version 2.0",
        url: "https://opensource.org/licenses/Apache-2.0",
    },
    GPL3: {
        // NOTE: Viral license! Avoid if possible.
        name: "GPL-3.0",
        // name: "GNU General Public License, Version 3",
        url: "https://opensource.org/licenses/GPL-3.0",
    },
    GPL2: {
        // NOTE: Viral license! Avoid if possible.
        name: "GPL-2.0",
        // name: "GNU General Public License, Version 2",
        url: "https://opensource.org/licenses/GPL-2.0",
    },
    BSD3: {
        name: "BSD-3-Clause",
        // name: "BSD 3-Clause License",
        url: "https://opensource.org/licenses/BSD-3-Clause",
    },
    BSD2: {
        name: "BSD-2-Clause",
        // name: "BSD 2-Clause License",
        url: "https://opensource.org/licenses/BSD-2-Clause",
    },
    BSD1: {
        name: "BSD-1-Clause",
        // name: "BSD 1-Clause License",
        url: "https://opensource.org/licenses/BSD-1-Clause",
    },
    CC0: {
        name: "CC0 1.0",
        // name: "CC0 1.0 Universal",
        url: "https://creativecommons.org/publicdomain/zero/1.0/",
    },
    CCBY4: {
        name: "CC BY 4.0",
        // name: "CC BY 4.0",
        url: "https://creativecommons.org/licenses/by/4.0/",
    },
    PUBLICDOMAIN: {
        name: "Public Domain",
        url: "https://creativecommons.org/publicdomain/zero/1.0/",
    },
    CUSTOM: {
        name: "Custom Open Source",
        url: "https://opensource.org/licenses/",
    },
};

export type Credits = (ISoftwareCredit | IContributorCredit)[];

export interface ICitation {
    title: string;
    authors: string[];
    journal: string;
    volume: string;
    issue?: string;
    pages: string;
    year: string;
}

export function formatCitation(citation: ICitation): string {
    // Go through authors. Each one should have a comma. If not, throw an error.
    for (const author of citation.authors) {
        if (author.indexOf(",") === -1) {
            throw new Error(
                `Author name does not contain a comma: ${author}. Format should be LAST NAME, GIVEN NAMES.`
            );
        }
    }

    // Go through authors and make all given names a single letter, followed by a period.
    for (let i = 0; i < citation.authors.length; i++) {
        const author = citation.authors[i];
        const commaIndex = author.indexOf(",");
        const lastName = author.substring(0, commaIndex);
        const givenNames = author.substring(commaIndex + 1).trim();
        const givenNamesArray = givenNames.split(" ");
        const newGivenNamesArray = [];
        for (const givenName of givenNamesArray) {
            if (givenName.length > 0) {
                newGivenNamesArray.push(givenName[0] + ".");
            }
        }
        citation.authors[i] = `${lastName}, ${newGivenNamesArray.join(" ")}`;
    }

    // If there is more than one author, use "et al." for all but the first author.
    if (citation.authors.length > 1) {
        const firstAuthor = citation.authors[0];
        citation.authors = [firstAuthor, "<i>et al</i>"];
    }

    // Make sure title ends in punctuation (.!?). If not, add period.
    const lastChar = citation.title[citation.title.length - 1];
    if (lastChar !== "." && lastChar !== "!" && lastChar !== "?") {
        citation.title += ".";
    }

    // make volume string. If issue is present, add it.
    let volumeString = citation.volume;
    if (citation.issue) {
        volumeString += `(${citation.issue})`;
    }

    return `${citation.authors.join(", ")}. ${citation.title} <i>${
        citation.journal
    }</i> ${citation.year};${volumeString};${citation.pages}.`;
}

export interface ISoftwareCredit {
    name: string;
    url: string;
    license: ILicense;
    citations?: ICitation[];
}

export interface IContributorCredit {
    name: string;
    url?: string;
}

export interface IPluginSetupInfo {
    softwareCredits: ISoftwareCredit[];
    contributorCredits: IContributorCredit[];
    menuData: IMenuItem;
    pluginId: string;
}
