import { IMenuItem } from "@/UI/Navigation/Menu/Menu";

export interface ILicense {
    name: string;
    url: string;
}

export const Licenses = {
    MIT: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
    } as ILicense,
    APACHE2: {
        name: "Apache-2.0",
        // name: "Apache License, Version 2.0",
        url: "https://opensource.org/licenses/Apache-2.0",
    } as ILicense,
    GPL3: {
        // NOTE: Viral license! Avoid if possible.
        name: "GPL-3.0",
        // name: "GNU General Public License, Version 3",
        url: "https://opensource.org/licenses/GPL-3.0",
    } as ILicense,
    BSD3: {
        name: "BSD-3-Clause",
        // name: "BSD 3-Clause License",
        url: "https://opensource.org/licenses/BSD-3-Clause",
    } as ILicense,
    BSD2: {
        name: "BSD-2-Clause",
        // name: "BSD 2-Clause License",
        url: "https://opensource.org/licenses/BSD-2-Clause",
    } as ILicense,
    BSD1: {
        name: "BSD-1-Clause",
        // name: "BSD 1-Clause License",
        url: "https://opensource.org/licenses/BSD-1-Clause",
    } as ILicense,
    CC0: {
        name: "CC0 1.0",
        // name: "CC0 1.0 Universal",
        url: "https://creativecommons.org/publicdomain/zero/1.0/",
    } as ILicense,
    CCBY4: {
        name: "CC BY 4.0",
        // name: "CC BY 4.0",
        url: "https://creativecommons.org/licenses/by/4.0/",
    } as ILicense,
    PUBLICDOMAIN: {
        name: "Public Domain",
        url: "https://creativecommons.org/publicdomain/zero/1.0/",
    } as ILicense,
};

export type Credits = (ISoftwareCredit | IContributorCredit)[];

export interface ISoftwareCredit {
    name: string;
    url: string;
    license: ILicense;
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
