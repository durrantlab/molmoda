import {
    slugify,
    capitalize,
    lowerize,
    capitalizeEachWord,
    removeTerminalPunctuation,
    isSentence,
    naturalSort,
    createNaturalSortFunc,
} from "./StringUtils"; // Adjust path as needed

describe("slugify", () => {
    test("should convert spaces to hyphens", () => {
        expect(slugify("hello world")).toBe("hello-world");
        expect(slugify("multiple   spaces  here")).toBe("multiple-spaces-here");
    });

    test("should convert to lowercase by default", () => {
        expect(slugify("HELLO WORLD")).toBe("hello-world");
        expect(slugify("MiXeD CaSe")).toBe("mixed-case");
    });

    test("should preserve case when lowerCase is false", () => {
        expect(slugify("HELLO WORLD", false)).toBe("HELLO-WORLD");
        expect(slugify("MiXeD CaSe", false)).toBe("MiXeD-CaSe");
    });

    test("should replace colons and periods with hyphens", () => {
        expect(slugify("hello:world")).toBe("hello-world");
        expect(slugify("hello.world")).toBe("hello-world");
        expect(slugify("v1.0.1")).toBe("v1-0-1");
    });

    test("should remove other special characters", () => {
        expect(slugify("hello@world!")).toBe("helloworld");
        expect(slugify("special #$% characters")).toBe("special-characters");
    });

    test("should handle empty strings", () => {
        expect(slugify("")).toBe("");
    });
});

describe("capitalize", () => {
    test("should capitalize the first letter of a string", () => {
        expect(capitalize("hello")).toBe("Hello");
        expect(capitalize("world")).toBe("World");
    });

    test("should leave the rest of the string unchanged", () => {
        expect(capitalize("hELLO")).toBe("HELLO");
        expect(capitalize("already Capitalized")).toBe("Already Capitalized");
    });

    test("should handle empty strings", () => {
        expect(capitalize("")).toBe("");
    });

    test("should handle single character strings", () => {
        expect(capitalize("a")).toBe("A");
        expect(capitalize("Z")).toBe("Z");
    });

    test("should handle strings with non-letter first characters", () => {
        expect(capitalize("123abc")).toBe("123abc");
        expect(capitalize(" space first")).toBe(" space first");
    });
});

describe("lowerize", () => {
    test("should lowercase the first letter of a string", () => {
        expect(lowerize("Hello")).toBe("hello");
        expect(lowerize("World")).toBe("world");
    });

    test("should leave the rest of the string unchanged", () => {
        expect(lowerize("HELLO")).toBe("hELLO");
        expect(lowerize("Already Capitalized")).toBe("already Capitalized");
    });

    test("should handle empty strings", () => {
        expect(lowerize("")).toBe("");
    });

    test("should handle single character strings", () => {
        expect(lowerize("A")).toBe("a");
        expect(lowerize("z")).toBe("z");
    });

    test("should handle strings with non-letter first characters", () => {
        expect(lowerize("123ABC")).toBe("123ABC");
        expect(lowerize(" Space first")).toBe(" Space first");
    });
});

describe("capitalizeEachWord", () => {
    test("should capitalize each word in a string", () => {
        expect(capitalizeEachWord("hello world")).toBe("Hello World");
        expect(capitalizeEachWord("this is a test")).toBe("This Is A Test");
    });

    test("should handle strings with already capitalized words", () => {
        expect(capitalizeEachWord("Hello World")).toBe("Hello World");
        expect(capitalizeEachWord("Some Words Are Capitalized")).toBe(
            "Some Words Are Capitalized"
        );
    });

    test("should handle strings with mixed case words", () => {
        expect(capitalizeEachWord("hElLo WoRlD")).toBe("HElLo WoRlD");
    });

    test("should handle empty strings", () => {
        expect(capitalizeEachWord("")).toBe("");
    });

    test("should handle single word strings", () => {
        expect(capitalizeEachWord("test")).toBe("Test");
    });
});

describe("removeTerminalPunctuation", () => {
    test("should remove punctuation from the end of a string", () => {
        expect(removeTerminalPunctuation("hello.")).toBe("hello");
        expect(removeTerminalPunctuation("world!")).toBe("world");
        expect(removeTerminalPunctuation("test?")).toBe("test");
        expect(removeTerminalPunctuation("example,")).toBe("example");
    });

    test("should remove multiple punctuation marks from the end", () => {
        expect(removeTerminalPunctuation("hello...")).toBe("hello");
        expect(removeTerminalPunctuation("world!?")).toBe("world");
    });

    test("should not remove letters or numbers from the end", () => {
        expect(removeTerminalPunctuation("hello1")).toBe("hello1");
        expect(removeTerminalPunctuation("world2")).toBe("world2");
    });

    test("should handle empty strings", () => {
        expect(removeTerminalPunctuation("")).toBe("");
    });

    test("should not remove punctuation from the middle of a string", () => {
        expect(removeTerminalPunctuation("hello.world")).toBe("hello.world");
        expect(removeTerminalPunctuation("example,test")).toBe("example,test");
    });

    test("should handle strings with only punctuation", () => {
        expect(removeTerminalPunctuation("...")).toBe("");
        expect(removeTerminalPunctuation("!?")).toBe("");
    });
});

describe("isSentence", () => {
    test("should return true for proper sentences", () => {
        expect(isSentence("This is a sentence.")).toBe(true);
        expect(isSentence("Another sentence!")).toBe(true);
        expect(isSentence("Is this a question?")).toBe(true);
        expect(isSentence("This ends with a colon:")).toBe(true);
        expect(isSentence('This has a quote at the end."')).toBe(true);
        expect(isSentence("This has a parenthesis at the end.)")).toBe(true);
    });

    test("should return false for strings not starting with a capital letter", () => {
        expect(isSentence("this is not a sentence.")).toBe(false);
        expect(isSentence("lowercase beginning!")).toBe(false);
    });

    test("should return false for strings not ending with proper punctuation", () => {
        expect(isSentence("This does not end with punctuation")).toBe(false);
        expect(isSentence("This ends with a comma,")).toBe(false);
    });

    test("should handle HTML content by stripping tags", () => {
        expect(isSentence("<p>This is a sentence.</p>")).toBe(true);
        expect(isSentence("<strong>Hello</strong> world.")).toBe(true);
    });

    test("should handle whitespace by trimming", () => {
        expect(isSentence("  This has spaces.  ")).toBe(true);
        expect(isSentence("\tTabbed sentence!\n")).toBe(true);
    });

    test("should return true for undefined", () => {
        expect(isSentence(undefined as unknown as string)).toBe(true);
    });

    test("should return true for empty strings", () => {
        expect(isSentence("")).toBe(true);
    });
});

describe("naturalSort", () => {
    test("should sort strings with mixed alphanumeric content naturally", () => {
        const unsorted = ["file10", "file1", "file2"];
        const sorted = [...unsorted].sort(naturalSort);
        expect(sorted).toEqual(["file1", "file2", "file10"]);
    });

    test("should sort numbers numerically, not lexicographically", () => {
        const unsorted = ["10", "1", "2", "100"];
        const sorted = [...unsorted].sort(naturalSort);
        expect(sorted).toEqual(["1", "2", "10", "100"]);
    });

    test("should handle objects with a key accessor", () => {
        const items = [
            { name: "Item 10" },
            { name: "Item 1" },
            { name: "Item 2" },
        ];
        const sorted = [...items].sort((a, b) =>
            naturalSort(a, b, (item) => item.name)
        );
        expect(sorted).toEqual([
            { name: "Item 1" },
            { name: "Item 2" },
            { name: "Item 10" },
        ]);
    });

    test("should handle different types in chunks", () => {
        const unsorted = ["file", "10file", "file10"];
        const sorted = [...unsorted].sort(naturalSort);
        // Numbers should come before strings in the same position
        expect(sorted).toEqual(["10file", "file", "file10"]);
    });

    test("should compare strings lexicographically when no numbers are present", () => {
        const unsorted = ["banana", "apple", "cherry"];
        const sorted = [...unsorted].sort(naturalSort);
        expect(sorted).toEqual(["apple", "banana", "cherry"]);
    });

    test("should handle empty strings", () => {
        const unsorted = ["banana", "", "apple"];
        const sorted = [...unsorted].sort(naturalSort);
        expect(sorted).toEqual(["", "apple", "banana"]);
    });

    test("should prefer shorter strings when prefix is the same", () => {
        const unsorted = ["test123", "test"];
        const sorted = [...unsorted].sort(naturalSort);
        expect(sorted).toEqual(["test", "test123"]);
    });
});

describe("createNaturalSortFunc", () => {
    test("should create a sort function that can be used with Array.sort", () => {
        const sortFunc = createNaturalSortFunc();
        const unsorted = ["file10", "file1", "file2"];
        const sorted = [...unsorted].sort(sortFunc);
        expect(sorted).toEqual(["file1", "file2", "file10"]);
    });

    test("should create a sort function that uses the provided key accessor", () => {
        const items = [
            { name: "Item 10" },
            { name: "Item 1" },
            { name: "Item 2" },
        ];
        const sortFunc = createNaturalSortFunc<{ name: string }>(
            (item) => item.name
        );
        const sorted = [...items].sort(sortFunc);
        expect(sorted).toEqual([
            { name: "Item 1" },
            { name: "Item 2" },
            { name: "Item 10" },
        ]);
    });

    test("should handle complex nested objects", () => {
        const items = [
            { data: { version: "v1.10.1" } },
            { data: { version: "v1.2.1" } },
            { data: { version: "v1.1.1" } },
        ];
        const sortFunc = createNaturalSortFunc<{ data: { version: string } }>(
            (item) => item.data.version
        );
        const sorted = [...items].sort(sortFunc);
        expect(sorted).toEqual([
            { data: { version: "v1.1.1" } },
            { data: { version: "v1.2.1" } },
            { data: { version: "v1.10.1" } },
        ]);
    });
});
