import { dynamicImports } from "@/Core/DynamicImports";
import {
    IMolContainer,
    MolContainerDataType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";

export interface ICalcMolProps {
    lipinski: any[][];
    counts: any[][];
    other: any[][];
}

export function calcMolProps(
    smiles: string,
    associatedMolContainer?: IMolContainer
): Promise<ICalcMolProps> {
    return dynamicImports.rdkitjs.module
        .then((RDKitModule: any) => {
            const mol = RDKitModule.get_mol(smiles);
            const descriptors = JSON.parse(mol.get_descriptors());
            const descriptorsSorted = Object.keys(descriptors)
                .sort(function (a, b) {
                    return a.localeCompare(b, undefined, {
                        sensitivity: "base",
                    });
                })
                .map(function (descriptor) {
                    return [descriptor, descriptors[descriptor]];
                });

            // Some of the molecular desscriptors don't seem to be useful.
            const descriptorsFiltered = descriptorsSorted.filter((d: any[]) => {
                if (["Phi", "amw", "hallKierAlpha"].indexOf(d[0]) !== -1) {
                    return false;
                }

                if (/^chi\d/.test(d[0])) {
                    return false;
                }

                return !/^kappa\d/.test(d[0]);
            });

            // Correct some names and add occasional notes
            const descriptorsCorrected = descriptorsFiltered.map(
                (d: any[]): any[] => {
                    let name = d[0];
                    let value = d[1];
                    let notes = "";

                    switch (name) {
                        case "CrippenClogP":
                            name = "logP";
                            notes =
                                "Wildman-Crippen LogP. See JCICS 39 868-873 (1999)";
                            break;
                        case "exactmw":
                            name = "Weight";
                            break;
                        case "lipinskiHBA":
                            name = "HBA";
                            notes =
                                "Total number of nitrogen and oxygen atoms. See Adv Drug Deliv Rev 46 3-26 (2001)";
                            break;
                        case "lipinskiHBD":
                            name = "HBD";
                            notes =
                                "Total number of N-H and O-H bonds. See Adv Drug Deliv Rev 46 3-26 (2001)";
                            break;
                        case "CrippenMR":
                            name = "MR";
                            notes =
                                "Wildman-Crippen molar refractivity. See JCICS 39 868-873 (1999)";
                            break;
                        case "FractionCSP3":
                            name = "CSP3";
                            notes =
                                "Percentage of carbon atoms that are SP3 hybridized.";
                            value = Math.round(value * 100).toString() + "%";
                            break;
                        case "labuteASA":
                            name = "Surf";
                            notes =
                                "Labute's approximate surface area. See J Mol Graph Mod 18 464-477 (2000)";
                            break;
                        case "tpsa":
                            name = "TPSA";
                            notes =
                                "Topological polar surface area. See J Med Chem 43 3714-3717 (2000)";
                            break;
                    }
                    return [name, value, notes];
                }
            );

            // Pull out lipinski descriptors
            const lipinskiDescriptors = descriptorsCorrected.filter(
                (d: any[]) => {
                    return (
                        ["logP", "Weight", "HBA", "HBD"].indexOf(d[0]) !== -1
                    );
                }
            );

            // Count number lipinski violations
            let lipinskiViolations = 0;
            lipinskiDescriptors.forEach((d: any[]) => {
                if (d[0] === "logP" && d[1] > 5) {
                    lipinskiViolations++;
                }
                if (d[0] === "Weight" && d[1] > 500) {
                    lipinskiViolations++;
                }
                if (d[0] === "HBA" && d[1] > 10) {
                    lipinskiViolations++;
                }
                if (d[0] === "HBD" && d[1] > 5) {
                    lipinskiViolations++;
                }
            });
            lipinskiDescriptors.push([
                "Violations",
                lipinskiViolations,
                "A molecule is druglike if it has 0 or 1 Lipinski violations.",
            ]);

            // Pull out the counts
            const countsDescriptors = descriptorsCorrected
                .filter((d: any[]) => {
                    return /^[Nn]um/.test(d[0]);
                })
                .map((d: any[]) => {
                    d[0] = d[0]
                        .replace("Num", "#")
                        .replace("Atom", "Atm")
                        .replace("atom", "Atm")
                        .replace("Bonds", "Bnds")
                        .replace("Centers", "Cntrs")
                        .replace("Rings", "Rngs")
                        .replace("Unspecified", "Unspec")
                        .replace("Saturated", "Sat")
                        .replace("Aliphatic", "Aliph")
                        .replace("Aromatic", "Arom")
                        .replace("Hetero", "Het")
                    return d;
                });

            // Pull out the other descriptors
            const otherDescriptors = descriptorsCorrected.filter((d: any[]) => {
                return (
                    !lipinskiDescriptors.includes(d) &&
                    !countsDescriptors.includes(d)
                );
            });

            // Map onto object, where keyes are first element, vals, are second.
            // const descriptorsObj = Object.fromEntries(descriptorsFiltered);

            if (associatedMolContainer !== undefined) {
                if (associatedMolContainer.data === undefined) {
                    associatedMolContainer.data = {};
                }

                const lipinskiData: { [key: string]: any } = {};
                for (const d of lipinskiDescriptors) {
                    lipinskiData[d[0] as string] = d[1];
                }

                const countsData: { [key: string]: any } = {};
                for (const d of countsDescriptors) {
                    countsData[d[0] as string] = d[1];
                }

                const otherData: { [key: string]: any } = {};
                for (const d of otherDescriptors) {
                    otherData[d[0] as string] = d[1];
                }

                associatedMolContainer.data = {
                    ...associatedMolContainer.data,
                    "Lipinski Chemical Properties": {
                        data: lipinskiData,
                        type: MolContainerDataType.Table,
                    },
                    "Counts Chemical Properties": {
                        data: countsData,
                        type: MolContainerDataType.Table,
                    },
                    "Other Chemical Properties": {
                        data: otherData,
                        type: MolContainerDataType.Table,
                    },
                };
            }

            return {
                lipinski: lipinskiDescriptors,
                counts: countsDescriptors,
                other: otherDescriptors,
            } as ICalcMolProps;
        })
        .catch((err) => {
            console.log(err);
            return {
                lipinski: [],
                counts: [],
                other: [],
            } as ICalcMolProps;
        });
}
