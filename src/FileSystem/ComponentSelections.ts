export const proteinSel = {
    resn: [
        "ALA",
        "ASX",
        "CYS",
        "CYX",
        "ASP",
        "GLU",
        "PHE",
        "GLY",
        "HIS",
        "ILE",
        "LYS",
        "LEU",
        "MET",
        "ASN",
        "PRO",
        "GLN",
        "ARG",
        "SER",
        "THR",
        "SEC",
        "VAL",
        "TRP",
        "TYR",
        "GLX",
        "MSE",

        // https://proteopedia.org/wiki/index.php/Standard_Residues
        "SEC",
        "PYL",

        // http://prody.csb.pitt.edu/manual/reference/atomic/flags.html
        "CSO",
        "HIP",
        "HSD",
        "HSE",
        "HSP",
        "SEP",
        "TPO",
        "PTR",
        "XLE",
        "XAA",
    ],
};

export const solventSel = {
    resn: [
        "HOH",
        "WAT",
        "TIP3",
        "TIP4",
        "TIP5",
        "TIP",
        "H2O",

        // See http://prody.csb.pitt.edu/manual/reference/atomic/flags.html
        "DOD",
        "OH2",
        "TIP2",
    ],
};

export const metalSel = {
    elem: [
        "Ag",
        "As",
        "Be",
        "Bi",
        "Ca",
        "Cd",
        "Co",
        "Cs",
        "Cu",
        "Er",
        "Fe",
        "Ho",
        "Mg",
        "Mn",
        "Mo",
        "Nb",
        "Ni",
        "Pb",
        "Pd",
        "Pt",
        "Rb",
        "Rh",
        "Sn",
        "Sr",
        "Tl",
        "Tm",
        "V",
        "Y",
        "Zn",
        "Zr",
    ],
};

export const ionSel = {
    or: [
        { elem: ["K", "Na", "Cl", "Br", "I", "F"] },
        // See http://prody.csb.pitt.edu/manual/reference/atomic/flags.html
        { resn: ["CL", "IOD", "K", "NA", "CLA", "POT", "SOD"] },
    ],
    bonds: 0,
};

export const nucleicSel = {
    resn: [
        "DA",
        "DC",
        "DG",
        "DT",
        "DI",
        "DU",
        "A",
        "C",
        "G",
        "I",
        "T",
        "U",
        "RA",
        "RC",
        "RG",
        "RT",
        "RU",
        "5MU", // T
    ],
};

// See http://prody.csb.pitt.edu/manual/reference/atomic/flags.html
export const lipidSel = {
    resn: [
        "GPE",
        "LPP",
        "OLA",
        "SDS",
        "STE",
        "POPC",
        "LPPC",
        "POPE",
        "DLPE",
        "PCGL",
        "STEA",
        "PALM",
        "OLEO",
        "DMPC",
    ],
};
