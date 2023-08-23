import { IInfoPayload } from "./PluginInterfaces";

export interface ICitation {
    title: string;
    authors: string[];
    journal: string;
    volume: number;
    issue?: number | string;
    pages: string;
    year: number;
}

/**
 * Format a citation.
 * 
 * @param {ICitation} citation  The citation to format.
 * @returns {string} The formatted citation.
 */
function formatCitation(citation: ICitation): string {
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

    // If there is more than one author, use "et al." for all but the first
    // author.
    // const AuthorStr =
    //     citation.authors.length > 1
    //         ? citation.authors[0] + ", <i>et al</i>"
    //         : citation.authors[0];

    // Make sure title ends in punctuation (.!?). If not, add period.
    const lastChar = citation.title[citation.title.length - 1];
    if (lastChar !== "." && lastChar !== "!" && lastChar !== "?") {
        citation.title += ".";
    }

    // make volume string. If issue is present, add it.
    let volumeString = citation.volume.toString();
    if (citation.issue) {
        volumeString += `(${citation.issue})`;
    }

    const searchStr = `"${citation.authors[0]}" "${citation.title}" "${citation.journal}" ${citation.year};${volumeString};${citation.pages}.`;

    // url encode search string
    const urlEncodedSearchStr = encodeURIComponent(searchStr);
    const url = `https://scholar.google.com/scholar?q=${urlEncodedSearchStr}`;

    // return `${AuthorStr}. ${citation.title} <i>${citation.journal}</i> ${citation.year};${volumeString};${citation.pages}.`;
    // return `${AuthorStr}. <i>${citation.journal}</i> ${citation.year};${volumeString};${citation.pages}.`;
    return `<a href="${url}" target="_blank"><i>${citation.journal}</i> ${citation.year};${volumeString};${citation.pages}.</a>`;
}

/**
 * Get multiple citations as a string.
 *
 * @param {IInfoPayload} infoPayload             The info payload. Includes
 *                                               contributor credits and
 *                                               software credits.
 * @param {boolean}      [extraFormatting=true]  Whether to include extra
 *                                               formatting (e.g., bold, small).
 * @returns {string} The citations as a string.
 */
export function citationsTxt(
    infoPayload: IInfoPayload,
    extraFormatting = true
): string {
    const citations = [
        ...infoPayload.contributorCredits,
        ...infoPayload.softwareCredits,
    ]
        .filter((c) => c.citations !== undefined)
        .map((c) => c.citations)
        .reduce(
            (acc, val) => (acc as ICitation[]).concat(val as ICitation[]),
            []
        ) as ICitation[];

    if (citations.length === 0) {
        return "";
    }

    let citationStr = extraFormatting ? "<p class='mb-4'><small><b>" : "";
    citationStr += (citations.length === 1 ? "Citation" : "Citations") + ":";
    citationStr += extraFormatting ? "</b> " : " ";

    for (const citation of citations) {
        citationStr += `${formatCitation(citation)} `;
    }

    if (extraFormatting) {
        citationStr += "</small></p>";
    }

    return citationStr;
}
