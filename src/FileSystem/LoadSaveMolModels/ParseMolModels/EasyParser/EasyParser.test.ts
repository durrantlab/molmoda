import { FileInfo } from "@/FileSystem/FileInfo";
import { IAtom } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { makeEasyParser } from "./index";
import { EasyParserPDB } from "./EasyParserPDB";
import { EasyParserMol2 } from "./EasyParserMol2";
import { EasyParserSDF } from "./EasyParserSDF";
import { EasyParserIAtomList } from "./EasyParserIAtomList";
import { EasyParserGLModel } from "./EasyParserGLModel";
import { GLModel } from "@/UI/Panels/Viewer/GLModelType";

// Mock data for testing
const pdbContent = `
ATOM      1  N   ALA A   1      27.222  18.520  27.241  1.00 20.00           N
ATOM      2  CA  ALA A   1      27.827  19.324  28.257  1.00 20.00           C
HETATM 1039  ZN   ZN A 201      24.620  20.301  30.824  1.00 23.32          ZN
`;

const mol2Content = `
@<TRIPOS>MOLECULE
MyMol
 5 4 0 0 0
SMALL
GASTEIGER
@<TRIPOS>ATOM
   1 C1         1.0000    2.0000    3.0000 C.3  1 LIG1 -0.1
   2 N1         1.5000    2.5000    3.5000 N.4  1 LIG1 -0.5
   3 O1         2.0000    3.0000    4.0000 O.2  1 LIG1 -0.4
   4 H1         0.5000    1.5000    2.5000 H    1 LIG1  0.1
   5 H2         1.2000    2.2000    3.2000 H    1 LIG1  0.1
@<TRIPOS>BOND
 1 1 2 1
 2 2 3 2
 3 1 4 1
 4 1 5 1
`;

const sdfV2000Content = `
MyMolecule
  -ISIS-  08212314022D

  3  2  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
    -1.0000    0.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  1  3  2  0  0  0  0
M  END
$$$$
`;

const sdfV3000Content = `
MyV3000Mol
  -ISIS-  08212314033D

  0  0  0  0  0  0            999 V3000
M  V30 BEGIN CTAB
M  V30 COUNTS 2 1 0 0 0
M  V30 BEGIN ATOM
M  V30 1 C 1.0 2.0 3.0 0
M  V30 2 N 2.0 3.0 4.0 0 CHG=1
M  V30 END ATOM
M  V30 BEGIN BOND
M  V30 1 1 1 2
M  V30 END BOND
M  V30 END CTAB
M  END
$$$$
`;

const flatSdfContent = `
FlatMolecule
  -ISIS-  08212314042D

  2  1  0  0  0  0  0  0  0  0999 V2000
    1.2345    5.6789    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.2345   -5.6789    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
M  END
$$$$
`;

const iAtomListContent: IAtom[] = [
    { resn: 'ALA', chain: 'A', resi: 1, x: 1, y: 1, z: 1, elem: 'C', bonds: [], bondOrder: [] },
    { resn: 'LYS', chain: 'B', resi: 2, x: 2, y: 2, z: 2, elem: 'N', bonds: [], bondOrder: [] }
];

const mockGLModel: GLModel = {
    selectedAtoms: () => iAtomListContent,
    removeAtoms: () => {},
    hide: () => {},
    show: () => {},
    setStyle: () => {},
    setClickable: () => {},
    setHoverable: () => {},
    id: 123
};


describe("EasyParser Factory and Classes", () => {
    describe("makeEasyParser factory", () => {
        it("should create EasyParserPDB for .pdb files", () => {
            const fileInfo = new FileInfo({ name: "protein.pdb", contents: pdbContent });
            const parser = makeEasyParser(fileInfo);
            expect(parser).toBeInstanceOf(EasyParserPDB);
        });

        it("should create EasyParserMol2 for .mol2 files", () => {
            const fileInfo = new FileInfo({ name: "ligand.mol2", contents: mol2Content });
            const parser = makeEasyParser(fileInfo);
            expect(parser).toBeInstanceOf(EasyParserMol2);
        });

        it("should create EasyParserSDF for .sdf files", () => {
            const fileInfo = new FileInfo({ name: "compound.sdf", contents: sdfV2000Content });
            const parser = makeEasyParser(fileInfo);
            expect(parser).toBeInstanceOf(EasyParserSDF);
        });

        it("should create EasyParserIAtomList for IAtom[]", () => {
            const parser = makeEasyParser(iAtomListContent);
            expect(parser).toBeInstanceOf(EasyParserIAtomList);
            expect(parser.length).toBe(2);
        });

        it("should create EasyParserGLModel for GLModel", () => {
            const parser = makeEasyParser(mockGLModel);
            expect(parser).toBeInstanceOf(EasyParserGLModel);
            expect(parser.length).toBe(2);
        });
    });

    describe("EasyParserPDB", () => {
        const fileInfo = new FileInfo({ name: "protein.pdb", contents: pdbContent });
        const parser = new EasyParserPDB(fileInfo);

        it("should load 3 atom lines", () => {
            expect(parser.length).toBe(3);
        });

        it("should parse an ATOM line correctly", () => {
            const atom = parser.getAtom(0);
            expect(atom.serial).toBe(1);
            expect(atom.atom).toBe("N");
            expect(atom.resn).toBe("ALA");
            expect(atom.chain).toBe("A");
            expect(atom.resi).toBe(1);
            expect(atom.x).toBe(27.222);
            expect(atom.y).toBe(18.520);
            expect(atom.z).toBe(27.241);
            expect(atom.b).toBe(20.00);
            expect(atom.elem).toBe("N");
            expect(atom.hetflag).toBe(false);
        });

        it("should parse a HETATM line correctly", () => {
            const atom = parser.getAtom(2);
            expect(atom.serial).toBe(1039);
            expect(atom.atom).toBe("ZN");
            expect(atom.elem).toBe("Zn");
            expect(atom.hetflag).toBe(true);
        });
    });

    describe("EasyParserMol2", () => {
        const fileInfo = new FileInfo({ name: "ligand.mol2", contents: mol2Content });
        const parser = new EasyParserMol2(fileInfo);

        it("should load 5 atoms", () => {
            expect(parser.length).toBe(5);
        });

        it("should parse a MOL2 atom line correctly", () => {
            const atom = parser.getAtom(1);
            expect(atom.serial).toBe(2);
            expect(atom.atom).toBe("N1");
            expect(atom.x).toBe(1.5);
            expect(atom.y).toBe(2.5);
            expect(atom.z).toBe(3.5);
            expect(atom.elem).toBe("N");
            expect(atom.resn).toBe("LIG1");
            expect(atom.b).toBe(-0.5); // Charge
        });
    });

    describe("EasyParserSDF", () => {
        it("should correctly parse V2000 format", () => {
            const fileInfo = new FileInfo({ name: "v2000.sdf", contents: sdfV2000Content });
            const parser = new EasyParserSDF(fileInfo);
            expect(parser.length).toBe(3);
            const atom1 = parser.getAtom(0);
            expect(atom1.elem).toBe("C");
            expect(atom1.x).toBe(0.0);
            const atom2 = parser.getAtom(1);
            expect(atom2.bonds).toEqual([0]); // Bonded to first atom (index 0)
            expect(atom2.bondOrder).toEqual([1]); // Single bond
        });

        it("should correctly parse V3000 format", () => {
            const fileInfo = new FileInfo({ name: "v3000.sdf", contents: sdfV3000Content });
            const parser = new EasyParserSDF(fileInfo);
            expect(parser.length).toBe(2);
            const atom1 = parser.getAtom(0);
            expect(atom1.elem).toBe("C");
            expect(atom1.x).toBe(1.0);
            expect(atom1.bonds).toEqual([1]);
            expect(atom1.bondOrder).toEqual([1]);
            const atom2 = parser.getAtom(1);
            expect(atom2.elem).toBe("N");
            expect(atom2.b).toBe(1); // Charge
        });
    });

    describe("EasyParserParent functionality", () => {
        it("isFlat() should return true for 2D structures", () => {
            const fileInfo = new FileInfo({ name: "flat.sdf", contents: flatSdfContent });
            const parser = makeEasyParser(fileInfo);
            expect(parser.isFlat()).toBe(true);
        });

        it("isFlat() should return false for 3D structures", () => {
            const fileInfo = new FileInfo({ name: "3d.pdb", contents: pdbContent });
            const parser = makeEasyParser(fileInfo);
            expect(parser.isFlat()).toBe(false);
        });

        it("isWithinDistance() should work correctly", () => {
            const atoms1: IAtom[] = [{ resn: 'A', chain: 'A', resi: 1, x: 0, y: 0, z: 0, elem: 'C', bonds: [], bondOrder: [] }];
            const atoms2: IAtom[] = [{ resn: 'B', chain: 'B', resi: 1, x: 5, y: 0, z: 0, elem: 'N', bonds: [], bondOrder: [] }];
            const atoms3: IAtom[] = [{ resn: 'C', chain: 'C', resi: 1, x: 11, y: 0, z: 0, elem: 'O', bonds: [], bondOrder: [] }];

            const parser1 = new EasyParserIAtomList(atoms1);
            const parser2 = new EasyParserIAtomList(atoms2);
            const parser3 = new EasyParserIAtomList(atoms3);

            expect(parser1.isWithinDistance(parser2, 6)).toBe(true);
            expect(parser1.isWithinDistance(parser3, 10)).toBe(false);
        });

        it("getUniqueResidues() should return unique names and IDs", () => {
            const atoms: IAtom[] = [
                { resn: 'ALA', chain: 'A', resi: 10, elem: 'C', x: 0, y: 0, z: 0, bonds: [], bondOrder: [] },
                { resn: 'ALA', chain: 'A', resi: 10, elem: 'N', x: 0, y: 0, z: 0, bonds: [], bondOrder: [] },
                { resn: 'LYS', chain: 'A', resi: 11, elem: 'C', x: 0, y: 0, z: 0, bonds: [], bondOrder: [] },
            ];
            const parser = new EasyParserIAtomList(atoms);
            const { names, ids } = parser.getUniqueResidues();
            expect(Array.from(names)).toEqual(['ALA', 'LYS']);
            expect(Array.from(ids)).toEqual([10, 11]);
        });
    });
});