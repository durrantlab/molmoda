import { getFileType } from "./FileUtils2";

describe("FileUtils2", () => {
    describe("getFileType", () => {
        it("should return the uppercase primary extension for known file types", () => {
            expect(getFileType("protein.pdb")).toBe("PDB");
            expect(getFileType("ligand.mol2")).toBe("MOL2");
            expect(getFileType("session.molmoda")).toBe("MOLMODA");
        });

        it("should handle alternative extensions", () => {
            expect(getFileType("protein.ent")).toBe("PDB");
            expect(getFileType("compound.sd")).toBe("SDF");
        });

        it("should handle case insensitivity", () => {
            expect(getFileType("protein.PDB")).toBe("PDB");
        });

        it("should handle file paths in string format", () => {
            expect(getFileType("/path/to/my/protein.pdb")).toBe("PDB");
        });

        it("should handle compound extensions like .pdb.txt", () => {
            expect(getFileType("protein.pdb.txt")).toBe("PDB");
        });

        it("should return undefined for unknown extensions", () => {
            expect(getFileType("document.docx")).toBeUndefined();
        });

        it("should return empty string for files with no extension", () => {
            expect(getFileType("myfile")).toBe("");
        });
    });
});
