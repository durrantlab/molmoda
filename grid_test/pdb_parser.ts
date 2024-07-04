import { Atom } from "./grid_types";


export function parsePDB(pdbContent: string, typerFunc: (s: string) => number): Atom[] {
    const lines = pdbContent.split("\n");
    const atoms: Atom[] = [];

    lines.forEach((line) => {
        if (line.startsWith("ATOM") || line.startsWith("HETATM")) {
            const atomName = line.substring(12, 16).trim();
            atoms.push({
                x: parseFloat(line.substring(30, 38)),
                y: parseFloat(line.substring(38, 46)),
                z: parseFloat(line.substring(46, 54)),
                type: typerFunc(atomName)
            });
        }
    });

    return atoms;
}
