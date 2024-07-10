import * as fs from "fs";
import { parsePDB } from "./pdb_parser";
import { Atom, TypeInfo } from "./grid_types";
import { GridMaker } from "./grid_maker";

function main() {
    // For node.
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error("Please provide a PDB file path");
        process.exit(1);
    }

    const pdbPath = args[0];
    const pdbContent = fs.readFileSync(pdbPath, "utf8");

    const typerFunc = (s: string) => {
        if (s.startsWith("C")) {
            return 0;
        }
        return 1;
    }

    const atoms = parsePDB(pdbContent, typerFunc);

    const typeInfo = [
        {
            radius: 1, // .7,
            // name: "C",
            // atomic_number: 6,
            // covalent_radius: 0.77,
            // ad_depth: 0.15,
            // ad_solvation: 0.13,
            // ad_volume: 0.13,
            // xs_hydrophobe: true,
            // xs_donor: false,
            // xs_acceptor: false,
            // ad_heteroatom: false,
        },
        {
            radius: 1
        }
    ] as TypeInfo[];

    const gridMaker = new GridMaker(0.5, 48, undefined, undefined, {
        x: 40.761002,
        y: 17.421,
        z: 12.23,
    });
    const grid = gridMaker.makeGrid(atoms, typeInfo);

    console.log("Grid created:", grid.shape);
    // You can save or further process the grid here

    // Export all channels
    for (let i = 0; i < typeInfo.length; i++) {
        gridMaker.exportGridChannelToDX(grid, i, `output_grid_channel${i}.dx`);
    }
}

main();
