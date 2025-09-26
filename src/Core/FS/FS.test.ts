import { saveData, saveTxt, saveSvg, savePngUri, saveZipWithTxtFiles, createZipBlob, uncompress } from "./FS";
import { DataFormat, IData } from "./FSInterfaces";
import { FileInfo } from "@/FileSystem/FileInfo";
import { TextDecoder } from 'util';

// Polyfill TextDecoder for JSDOM
global.TextDecoder = TextDecoder as any;

// Helper to read blob content in a JSDOM-compatible way
const readBlobAsText = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(blob);
    });
};


// Mocks
const mockSaveAs = jest.fn();
const mockExcelWorkbookInstance = {
    addWorksheet: jest.fn().mockReturnThis(),
    columns: [],
    addRows: jest.fn(),
    xlsx: {
        writeBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    },
    csv: {
        writeBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    },
};

const mockZipInstance = {
    file: jest.fn(),
    generateAsync: jest.fn().mockResolvedValue(new Blob(['zip content'], { type: 'application/zip' })),
};
const mockJSZip = jest.fn().mockImplementation(() => mockZipInstance);

(mockJSZip as any).loadAsync = jest.fn().mockResolvedValue({
    files: {
        'file1.txt': { async: () => Promise.resolve('content1') },
        '__MACOSX/file1.txt': { async: () => Promise.resolve('metadata') },
        '.DS_Store': { async: () => Promise.resolve('metadata') },
    },
});


jest.mock('@/Core/DynamicImports', () => ({
    dynamicImports: {
        fileSaver: {
            get module() {
                return Promise.resolve({
                    saveAs: mockSaveAs,
                });
            },
        },
        exceljs: {
            get module() {
                return Promise.resolve({
                    Workbook: jest.fn().mockImplementation(() => mockExcelWorkbookInstance),
                });
            },
        },
        jsZip: {
            get module() {
                return Promise.resolve(mockJSZip);
            }
        }
    },
}));

// Mock atob for JSDOM environment
global.atob = (b64) => Buffer.from(b64, 'base64').toString('binary');

describe("FS data exporting and file operations", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("saveData", () => {
        const sampleData: IData = {
            headers: ["ID", "Name", "Value"],
            rows: [
                { ID: 1, Name: "A", Value: 100 },
                { ID: 2, Name: "B", Value: 200 },
            ],
        };

        it("should save data as JSON", async () => {
            const filename = "data.json";
            await saveData(sampleData, filename, DataFormat.JSON);
            await new Promise(process.nextTick);
            expect(mockSaveAs).toHaveBeenCalledTimes(1);
            const blob = mockSaveAs.mock.calls[0][0] as Blob;
            expect(mockSaveAs.mock.calls[0][1]).toBe(filename);
            expect(blob.type).toBe("text/plain;charset=utf-8");
            expect(await readBlobAsText(blob)).toBe(JSON.stringify(sampleData.rows, null, 2));
        });

        it("should save data as XLSX", async () => {
            const filename = "data.xlsx";
            await saveData(sampleData, filename, DataFormat.XLSX);
            await new Promise(process.nextTick);
            expect(mockExcelWorkbookInstance.xlsx.writeBuffer).toHaveBeenCalledTimes(1);
            expect(mockSaveAs).toHaveBeenCalledTimes(1);
            expect(mockSaveAs.mock.calls[0][1]).toBe(filename);
            expect((mockSaveAs.mock.calls[0][0] as Blob).type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        });

        it("should save data as CSV", async () => {
            const filename = "data.csv";
            await saveData(sampleData, filename, DataFormat.CSV);
            await new Promise(process.nextTick);
            expect(mockExcelWorkbookInstance.csv.writeBuffer).toHaveBeenCalledTimes(1);
            expect(mockSaveAs).toHaveBeenCalledTimes(1);
            expect(mockSaveAs.mock.calls[0][1]).toBe(filename);
            expect((mockSaveAs.mock.calls[0][0] as Blob).type).toBe("text/csv;charset=utf-8;");
        });
    });

    describe("saveTxt", () => {
        it("should save a single text file", async () => {
            const fileInfo = new FileInfo({ name: "test.txt", contents: "hello world" });
            await saveTxt(fileInfo);
            await new Promise(process.nextTick);
            expect(mockSaveAs).toHaveBeenCalledTimes(1);
            const blob = mockSaveAs.mock.calls[0][0] as Blob;
            expect(mockSaveAs.mock.calls[0][1]).toBe("test.txt");
            expect(blob.type).toBe("text/plain;charset=utf-8");
            expect(await readBlobAsText(blob)).toBe("hello world");
        });

        it("should save a text file inside a zip if compressedName is provided", async () => {
            const fileInfo = new FileInfo({ name: "test.txt", contents: "hello world", compressedName: "archive.zip" });
            await saveTxt(fileInfo);
            await new Promise(process.nextTick);
            expect(mockJSZip).toHaveBeenCalledTimes(1);
            expect(mockZipInstance.file).toHaveBeenCalledWith("test.txt", "hello world", expect.any(Object));
            expect(mockZipInstance.generateAsync).toHaveBeenCalledWith({ type: "blob" });
            expect(mockSaveAs).toHaveBeenCalledTimes(1);
            expect(mockSaveAs.mock.calls[0][1]).toBe("archive.zip");
        });
    });

    describe("saveSvg", () => {
        it("should save a single SVG file", async () => {
            const fileInfo = new FileInfo({ name: "image.svg", contents: "<svg></svg>" });
            await saveSvg(fileInfo);
            await new Promise(process.nextTick);
            expect(mockSaveAs).toHaveBeenCalledTimes(1);
            const blob = mockSaveAs.mock.calls[0][0] as Blob;
            expect(mockSaveAs.mock.calls[0][1]).toBe("image.svg");
            expect(blob.type).toBe("image/svg+xml");
            expect(await readBlobAsText(blob)).toBe("<svg></svg>");
        });

        it("should add .svg extension if missing", async () => {
            const fileInfo = new FileInfo({ name: "image", contents: "<svg></svg>" });
            await saveSvg(fileInfo);
            await new Promise(process.nextTick);
            expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), "image.svg");
        });
    });

    describe("savePngUri", () => {
        it("should save a PNG from a data URI", async () => {
            const pngUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
            const filename = "pixel.png";
            savePngUri(filename, pngUri); // is not async
            await new Promise(process.nextTick); // let promise in savePngUri resolve
            expect(mockSaveAs).toHaveBeenCalledTimes(1);
            const blob = mockSaveAs.mock.calls[0][0] as Blob;
            expect(mockSaveAs.mock.calls[0][1]).toBe(filename);
            expect(blob.type).toBe("image/png");
        });
    });

    describe("zip functions", () => {
        it("createZipBlob should create a zip blob with correct files", async () => {
            const files = [
                new FileInfo({ name: "file1.txt", contents: "content1" }),
                new FileInfo({ name: "file2.txt", contents: "content2" }),
            ];
            await createZipBlob(files);
            await new Promise(process.nextTick);
            expect(mockJSZip).toHaveBeenCalledTimes(1);
            expect(mockZipInstance.file).toHaveBeenCalledWith("file1.txt", "content1", expect.any(Object));
            expect(mockZipInstance.file).toHaveBeenCalledWith("file2.txt", "content2", expect.any(Object));
            expect(mockZipInstance.generateAsync).toHaveBeenCalledWith({ type: "blob" });
        });

        it("saveZipWithTxtFiles should save a zip file", async () => {
            const files = [new FileInfo({ name: "file1.txt", contents: "content1" })];
            const filename = "archive.zip";
            await saveZipWithTxtFiles(filename, files);
            await new Promise(process.nextTick);
            expect(mockSaveAs).toHaveBeenCalledTimes(1);
            expect(mockSaveAs.mock.calls[0][1]).toBe(filename);
            const blob = mockSaveAs.mock.calls[0][0] as Blob;
            expect(blob.type).toBe("application/zip");
            expect(await readBlobAsText(blob)).toBe("zip content");
        });
    });

    describe("uncompress", () => {
        it("should uncompress a zip and return FileInfo objects", async () => {
            const zipContent = "dummy_zip_content";
            const fileInfos = await uncompress(zipContent);

            expect((mockJSZip as any).loadAsync).toHaveBeenCalledWith(zipContent);
            expect(fileInfos).toHaveLength(1);
            expect(fileInfos[0]).toBeInstanceOf(FileInfo);
            expect(fileInfos[0].name).toBe("file1.txt");
            expect(fileInfos[0].contents).toBe("content1");
        });

        it("should filter out MacOS specific files and dotfiles", async () => {
            const zipContent = "dummy_zip_content";
            // The mock for loadAsync is already configured to return these files.
            const fileInfos = await uncompress(zipContent);
            expect(fileInfos.map(f => f.name)).not.toContain("__MACOSX/file1.txt");
            expect(fileInfos.map(f => f.name)).not.toContain(".DS_Store");
        });
    });
});
