import { fileNameFilter, getFileNameParts } from "./FilenameManipulation";

describe("FilenameManipulation", () => {
    describe("fileNameFilter", () => {
        it("should remove invalid characters", () => {
            expect(fileNameFilter("file!@#$%^&*().txt")).toBe("file.txt");
        });

        it("should keep valid characters including letters, numbers, dots, hyphens, and underscores", () => {
            const validName = "my_file-v1.2.txt";
            expect(fileNameFilter(validName)).toBe(validName);
        });
    });

    describe("getFileNameParts", () => {
        it("should correctly parse a simple filename", () => {
            const parts = getFileNameParts("document.pdf");
            expect(parts.basename).toBe("document");
            expect(parts.ext).toBe("pdf");
        });

        it("should handle filenames with no extension", () => {
            const parts = getFileNameParts("myfile");
            expect(parts.basename).toBe("myfile");
            expect(parts.ext).toBe("");
        });

        it("should handle filenames with multiple dots like tar.gz", () => {
            const parts = getFileNameParts("archive.tar.gz");
            expect(parts.basename).toBe("archive");
            expect(parts.ext).toBe("tar.gz");
        });

        it("should handle dotfiles like .bashrc", () => {
            const parts = getFileNameParts(".bashrc");
            expect(parts.basename).toBe(".bashrc");
            expect(parts.ext).toBe("");
        });

        it("should handle filenames with a single character extension", () => {
            const parts = getFileNameParts("data.d");
            expect(parts.basename).toBe("data");
            expect(parts.ext).toBe("d");
        });
    });
});
