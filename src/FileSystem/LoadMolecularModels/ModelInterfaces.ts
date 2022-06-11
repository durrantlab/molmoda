export interface IAtom {
    chain: string;
    resi: number;
    resn: string;
}

export interface IResidue {
    text: string;
    atoms?: IAtom[];
    model?: any;
    icon?: string;
    class?: string;
}

export interface IChain {
    text: string;
    atoms?: IAtom[];
    model?: any;
    residues?: IResidue[];
    nodes?: IResidue[];
    icon?: string;
    class?: string;
}

export interface IMolEntry {
    text: string;
    chains?: IChain[];
    nodes?: IChain[];
    atoms?: IAtom[];
    model?: any;
    icon?: string;
    class?: string;
}

export interface IFileContents {
    text: string;
    mols?: IMolEntry[];
    nodes?: IMolEntry[];
    atoms?: IAtom[];
    model?: any;
    icon?: string;
    class?: string;
}
