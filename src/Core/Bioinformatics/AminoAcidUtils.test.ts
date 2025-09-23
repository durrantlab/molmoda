import {
    threeLetterToPdbOneLetter,
    getAminoAcidProperty,
    convertFastaToSeqences,
} from "./AminoAcidUtils";

describe("AminoAcidUtils", () => {
    describe("threeLetterToPdbOneLetter", () => {
        it("should convert standard three-letter codes to one-letter codes", () => {
            expect(threeLetterToPdbOneLetter("ALA")).toBe("A");
            expect(threeLetterToPdbOneLetter("ARG")).toBe("R");
            expect(threeLetterToPdbOneLetter("CYS")).toBe("C");
        });

        it("should be case-insensitive", () => {
            expect(threeLetterToPdbOneLetter("ala")).toBe("A");
            expect(threeLetterToPdbOneLetter("ArG")).toBe("R");
        });

        it("should handle common PDB variations", () => {
            expect(threeLetterToPdbOneLetter("MSE")).toBe("M"); // Selenomethionine
            expect(threeLetterToPdbOneLetter("SEP")).toBe("S"); // Phosphoserine
        });

        it('should return "X" for unknown or unmapped codes', () => {
            expect(threeLetterToPdbOneLetter("XYZ")).toBe("X");
            expect(threeLetterToPdbOneLetter("UNK")).toBe("X");
        });
    });

    describe("getAminoAcidProperty", () => {
        it("should return correct properties for a valid one-letter code", () => {
            const alanine = getAminoAcidProperty("A");
            expect(alanine).toBeDefined();
            expect(alanine?.name).toBe("Alanine");
            expect(alanine?.category).toBe("hydrophobic");
        });

        it("should be case-insensitive", () => {
            const alanine = getAminoAcidProperty("a");
            expect(alanine).toBeDefined();
            expect(alanine?.name).toBe("Alanine");
        });

        it("should return undefined for an invalid code", () => {
            expect(getAminoAcidProperty("U")).toBeUndefined();
        });
    });

    describe("convertFastaToSeqences", () => {
        it("should parse a single standard FASTA sequence", () => {
            const fasta =
                ">sp|P01308|INS_HUMAN Insulin\nMALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN";
            const result = convertFastaToSeqences(fasta);
            expect(result).toHaveLength(1);
            expect(result[0][0]).toBe("sp|P01308|INS_HUMAN Insulin");
            expect(result[0][1]).toBe(
                "MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN"
            );
        });

        it("should parse multiple FASTA sequences", () => {
            const fasta = ">seq1\nACGT\n>seq2\nTGCA\n>seq3\nAAAA";
            const result = convertFastaToSeqences(fasta);
            expect(result).toHaveLength(3);
            expect(result[1][0]).toBe("seq2");
            expect(result[1][1]).toBe("TGCA");
        });

        it('should handle sequences separated by blank lines if no ">" is present', () => {
            const text = "ACGT\n\nTGCA\nAAAA";
            const result = convertFastaToSeqences(text);
            expect(result).toHaveLength(3);
            expect(result[0][0]).toBe("");
            expect(result[0][1]).toBe("ACGT");
            expect(result[2][1]).toBe("AAAA");
        });

        it("should remove stop codon asterisks (*)", () => {
            const fasta = ">seq_with_stop\nACGT*";
            const result = convertFastaToSeqences(fasta);
            expect(result[0][1]).toBe("ACGT");
        });
    });
});
