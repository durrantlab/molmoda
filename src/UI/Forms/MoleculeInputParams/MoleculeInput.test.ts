import { MoleculeInput, IMoleculeInputParams } from "./MoleculeInput";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import {
    IAtom,
    SelectedType,
    TreeNodeType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { convertFileInfosOpenBabel } from "@/FileSystem/OpenBabel/OpenBabel";
import { FileInfo } from "@/FileSystem/FileInfo";

// Mock dependencies
jest.mock("@/Store/StoreExternalAccess", () => ({
    getMoleculesFromStore: jest.fn(),
}));

jest.mock("@/FileSystem/OpenBabel/OpenBabel", () => ({
    convertFileInfosOpenBabel: jest.fn(),
}));

// Mock the module that uses `import.meta.url` to prevent compilation errors in Jest.
// This also breaks a circular dependency by delaying the instantiation of TreeNodeList.
jest.mock(
    "@/FileSystem/LoadSaveMolModels/ParseMolModels/ParseMolModelsUtils",
    () => ({
        parseMolecularModelFromTexts: jest.fn().mockImplementation(() => {
            // Dynamically require TreeNodeList inside the mock implementation
            // to break the circular dependency at module load time.
            const {
                TreeNodeList,
            } = require("@/TreeNodes/TreeNodeList/TreeNodeList");
            return Promise.resolve(new TreeNodeList([]));
        }),
    })
);

describe("MoleculeInput component filtering", () => {
    beforeEach(() => {
        // Clear mocks before each test
        (getMoleculesFromStore as jest.Mock).mockClear();
        (convertFileInfosOpenBabel as jest.Mock).mockClear();

        // Mock the implementation for OpenBabel to just pass through the PDB content
        // This simulates a format conversion from PDB to PDB.
        (convertFileInfosOpenBabel as jest.Mock).mockImplementation(
            async (fileInfos: FileInfo[], targetFormat: string) => {
                // This test only deals with pdb and pdbqt which are text based.
                if (
                    targetFormat === "pdb" ||
                    targetFormat === "pdbqt" ||
                    targetFormat === "pdbqtlig"
                ) {
                    return fileInfos.map((fi) => fi.contents);
                }
                return [];
            }
        );

        // --- Create a mock TreeNodeList representing a parsed PDB file ---
        // This structure mimics a protein with associated metal and solvent.
        const proteinAtom: IAtom = {
            serial: 1,
            atom: "CA",
            resn: "GLY",
            chain: "A",
            resi: 1,
            elem: "C",
            x: 1,
            y: 1,
            z: 1,
            bonds: [],
            bondOrder: [],
        };
        const metalAtom: IAtom = {
            serial: 2,
            atom: "ZN",
            resn: "ZN",
            chain: "A",
            resi: 201,
            elem: "ZN",
            hetflag: true,
            x: 2,
            y: 2,
            z: 2,
            bonds: [],
            bondOrder: [],
        };
        const solventAtom: IAtom = {
            serial: 3,
            atom: "O",
            resn: "HOH",
            chain: "A",
            resi: 301,
            elem: "O",
            hetflag: true,
            x: 3,
            y: 3,
            z: 3,
            bonds: [],
            bondOrder: [],
        };
        const nucleicAtom: IAtom = {
            serial: 4,
            atom: "P",
            resn: "A",
            chain: "B",
            resi: 1,
            elem: "P",
            x: 4,
            y: 4,
            z: 4,
            bonds: [],
            bondOrder: [],
        };

        // Terminal nodes that hold the actual molecular data
        const proteinTerminalNode = new TreeNode({
            title: "Protein Chain A",
            type: TreeNodeType.Protein,
            model: [proteinAtom],
            visible: true,
            selected: SelectedType.False,
            treeExpanded: false,
            focused: false,
            viewerDirty: false,
            src: "test.pdb",
        });
        const metalTerminalNode = new TreeNode({
            title: "ZN",
            type: TreeNodeType.Metal,
            model: [metalAtom],
            visible: true,
            selected: SelectedType.False,
            treeExpanded: false,
            focused: false,
            viewerDirty: false,
            src: "test.pdb",
        });
        const solventTerminalNode = new TreeNode({
            title: "HOH",
            type: TreeNodeType.Solvent,
            model: [solventAtom],
            visible: true,
            selected: SelectedType.False,
            treeExpanded: false,
            focused: false,
            viewerDirty: false,
            src: "test.pdb",
        });
        const nucleicTerminalNode = new TreeNode({
            title: "NA Chain B",
            type: TreeNodeType.Nucleic,
            model: [nucleicAtom],
            visible: true,
            selected: SelectedType.False,
            treeExpanded: false,
            focused: false,
            viewerDirty: false,
            src: "test.pdb",
        });

        // The root node containing the hierarchy
        const rootNode = new TreeNode({
            title: "MyMolecule",
            visible: true,
            selected: SelectedType.False,
            treeExpanded: true,
            focused: false,
            viewerDirty: false,
            nodes: new TreeNodeList([
                proteinTerminalNode,
                metalTerminalNode,
                solventTerminalNode,
                nucleicTerminalNode,
            ]),
            src: "test.pdb",
        });

        proteinTerminalNode.parentId = rootNode.id;
        metalTerminalNode.parentId = rootNode.id;
        solventTerminalNode.parentId = rootNode.id;
        nucleicTerminalNode.parentId = rootNode.id;

        const mockMolecules = new TreeNodeList([rootNode]);
        (getMoleculesFromStore as jest.Mock).mockReturnValue(mockMolecules);
    });

    it("should include protein, metal, solvent, and nucleic acid by default", async () => {
        const params: IMoleculeInputParams = {
            considerProteins: true,
            considerCompounds: false, // Ensure we are only testing protein-related components
            proteinFormat: "pdb",
            // Defaults are includeMetalsAsProtein: true, includeSolventAsProtein: true
        };
        const moleculeInput = new MoleculeInput(params);
        const result =
            (await moleculeInput.getProtAndCompoundPairs()) as FileInfo[];

        expect(result).toHaveLength(1);
        const pdbContent = result[0].contents;
        expect(pdbContent).toMatch(/ATOM\s+.*\s+CA\s+GLY\s+/); // Protein
        expect(pdbContent).toMatch(/HETATM\s+.*\s+ZN\s+ZN\s+/); // Metal
        expect(pdbContent).toMatch(/HETATM\s+.*\s+O\s+HOH\s+/); // Solvent
        expect(pdbContent).toMatch(/HETATM\s+.*\s+P\s+A\s+/); // Nucleic Acid
    });

    it("should exclude metals when includeMetalsAsProtein is false", async () => {
        const params: IMoleculeInputParams = {
            considerProteins: true,
            considerCompounds: false,
            proteinFormat: "pdb",
            includeMetalsAsProtein: false,
            includeSolventAsProtein: true,
        };
        const moleculeInput = new MoleculeInput(params);
        const result =
            (await moleculeInput.getProtAndCompoundPairs()) as FileInfo[];
        expect(result).toHaveLength(1);
        const pdbContent = result[0].contents;
        expect(pdbContent).toMatch(/ATOM\s+.*\s+CA\s+GLY\s+/); // Protein
        expect(pdbContent).not.toMatch(/HETATM\s+.*\s+ZN\s+ZN\s+/); // Metal excluded
        expect(pdbContent).toMatch(/HETATM\s+.*\s+O\s+HOH\s+/); // Solvent included
        expect(pdbContent).toMatch(/HETATM\s+.*\s+P\s+A\s+/); // Nucleic Acid included
    });

    it("should exclude solvent when includeSolventAsProtein is false", async () => {
        const params: IMoleculeInputParams = {
            considerProteins: true,
            considerCompounds: false,
            proteinFormat: "pdb",
            includeMetalsAsProtein: true,
            includeSolventAsProtein: false,
        };
        const moleculeInput = new MoleculeInput(params);
        const result =
            (await moleculeInput.getProtAndCompoundPairs()) as FileInfo[];
        expect(result).toHaveLength(1);
        const pdbContent = result[0].contents;
        expect(pdbContent).toMatch(/ATOM\s+.*\s+CA\s+GLY\s+/); // Protein
        expect(pdbContent).toMatch(/HETATM\s+.*\s+ZN\s+ZN\s+/); // Metal included
        expect(pdbContent).not.toMatch(/HETATM\s+.*\s+O\s+HOH\s+/); // Solvent excluded
        expect(pdbContent).toMatch(/HETATM\s+.*\s+P\s+A\s+/); // Nucleic Acid included
    });

    it("should exclude nucleic acids when includeNucleicAsProtein is false", async () => {
        const params: IMoleculeInputParams = {
            considerProteins: true,
            considerCompounds: false,
            proteinFormat: "pdb",
            includeNucleicAsProtein: false,
        };
        const moleculeInput = new MoleculeInput(params);
        const result =
            (await moleculeInput.getProtAndCompoundPairs()) as FileInfo[];
        expect(result).toHaveLength(1);
        const pdbContent = result[0].contents;
        expect(pdbContent).toMatch(/ATOM\s+.*\s+CA\s+GLY\s+/); // Protein
        expect(pdbContent).toMatch(/HETATM\s+.*\s+ZN\s+ZN\s+/); // Metal included
        expect(pdbContent).toMatch(/HETATM\s+.*\s+O\s+HOH\s+/); // Solvent included
        expect(pdbContent).not.toMatch(/HETATM\s+.*\s+P\s+A\s+/); // Nucleic Acid excluded
    });

    it("should exclude both metal and solvent when both flags are false", async () => {
        const params: IMoleculeInputParams = {
            considerProteins: true,
            considerCompounds: false,
            proteinFormat: "pdb",
            includeMetalsAsProtein: false,
            includeSolventAsProtein: false,
        };
        const moleculeInput = new MoleculeInput(params);
        const result =
            (await moleculeInput.getProtAndCompoundPairs()) as FileInfo[];
        expect(result).toHaveLength(1);
        const pdbContent = result[0].contents;
        expect(pdbContent).toMatch(/ATOM\s+.*\s+CA\s+GLY\s+/); // Protein
        expect(pdbContent).not.toMatch(/HETATM\s+.*\s+ZN\s+ZN\s+/); // Metal excluded
        expect(pdbContent).not.toMatch(/HETATM\s+.*\s+O\s+HOH\s+/); // Solvent excluded
        expect(pdbContent).toMatch(/HETATM\s+.*\s+P\s+A\s+/); // Nucleic Acid included
    });
});
