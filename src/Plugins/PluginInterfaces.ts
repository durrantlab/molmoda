import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { IMenuItem } from "@/UI/Navigation/Menu/Menu";
import { ICitation } from "./Citations";

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

export interface IContributorCredit {
    name: string;
    url?: string;
    citations?: ICitation[];
}

export interface ISoftwareCredit extends IContributorCredit {
    license: ILicense;
}

export interface IInfoPayload {
    title: string;
    userArgs: UserArg[];
    pluginId: string;
    intro: string;
    details?: string;
    softwareCredits: ISoftwareCredit[];
    contributorCredits: IContributorCredit[];
}

export interface IPluginSetupInfo {
    softwareCredits: ISoftwareCredit[];
    contributorCredits: IContributorCredit[];
    menuData: IMenuItem;
    pluginId: string;
}
