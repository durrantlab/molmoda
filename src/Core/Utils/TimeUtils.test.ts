import { timeDiffDescription, formatTimestamp, secsToTime } from "./TimeUtils"; // Adjust path as needed

describe("timeDiffDescription", () => {
    test("should correctly format time difference in seconds", () => {
        // 5 seconds difference
        expect(timeDiffDescription(1000, 6000)).toBe(" (5.0 secs)");

        // 1 second difference (singular form)
        expect(timeDiffDescription(1000, 2000)).toBe(" (1.0 sec)");

        // Fractional seconds
        expect(timeDiffDescription(1000, 4500)).toBe(" (3.5 secs)");

        // Rounding to nearest tenth
        expect(timeDiffDescription(1000, 3512)).toBe(" (2.5 secs)");
    });

    test("should handle negative time differences", () => {
        // 5 seconds negative difference
        expect(timeDiffDescription(6000, 1000)).toBe(" (-5.0 secs)");

        // 1 second negative difference
        expect(timeDiffDescription(2000, 1000)).toBe(" (-1.0 secs)");

        // Fractional negative seconds
        expect(timeDiffDescription(4500, 1000)).toBe(" (-3.5 secs)");
    });

    test("should handle zero time difference", () => {
        expect(timeDiffDescription(1000, 1000)).toBe(" (0.0 secs)");
    });

    test("should round to nearest tenth of a second", () => {
        // 1.05 seconds should round to 1.1
        expect(timeDiffDescription(1000, 2050)).toBe(" (1.1 secs)");

        // 1.04 seconds should round to 1.0
        expect(timeDiffDescription(1000, 2040)).toBe(" (1.0 sec)");
    });
});

describe("formatTimestamp", () => {
    beforeEach(() => {
        // Mock Date to ensure consistent test results regardless of timezone
        jest.useFakeTimers();
        jest.setSystemTime(new Date(2023, 0, 1)); // January 1, 2023
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("should return empty string for timestamp 0", () => {
        expect(formatTimestamp(0)).toBe("");
    });

    test("should format timestamp with month, day, hours, and minutes", () => {
        // Create a fixed date: January 15, 2023, 14:30
        const timestamp = new Date(2023, 0, 15, 14, 30).getTime();

        // Test depends on locale, but we expect something like "Jan 15, 14:30"
        const result = formatTimestamp(timestamp);
        expect(result).toMatch(/Jan 15, 14:30/);
    });

    test("should pad minutes with leading zeros when needed", () => {
        // Create a fixed date: March 5, 2023, 9:05
        const timestamp = new Date(2023, 2, 5, 9, 5).getTime();
        const result = formatTimestamp(timestamp);
        expect(result).toMatch(/Mar 5, 9:05/);

        // Create a fixed date: March 5, 2023, 9:00
        const timestamp2 = new Date(2023, 2, 5, 9, 0).getTime();
        const result2 = formatTimestamp(timestamp2);
        expect(result2).toMatch(/Mar 5, 9:00/);
    });

    test("should handle different months correctly", () => {
        const months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];

        months.forEach((month, index) => {
            const timestamp = new Date(2023, index, 1, 12, 0).getTime();
            const result = formatTimestamp(timestamp);
            expect(result).toContain(month);
        });
    });

    test("should use 24-hour time format", () => {
        // 3:45 PM should be 15:45
        const timestampPM = new Date(2023, 0, 1, 15, 45).getTime();
        const resultPM = formatTimestamp(timestampPM);
        expect(resultPM).toMatch(/Jan 1, 15:45/);

        // 12:30 AM should be 0:30
        const timestampAM = new Date(2023, 0, 1, 0, 30).getTime();
        const resultAM = formatTimestamp(timestampAM);
        expect(resultAM).toMatch(/Jan 1, 0:30/);
    });
});

describe("secsToTime", () => {
    test("should format seconds correctly", () => {
        expect(secsToTime(1)).toBe("1 sec");
        expect(secsToTime(30)).toBe("30.0 secs");
        expect(secsToTime(0.5)).toBe("0.5 secs");
    });

    test("should format minutes correctly", () => {
        expect(secsToTime(60)).toBe("1 min, 0.0 secs");
        expect(secsToTime(120)).toBe("2 mins, 0.0 secs");
        expect(secsToTime(90)).toBe("1 min, 30.0 secs");
    });

    test("should format hours correctly", () => {
        expect(secsToTime(3600)).toBe("1 hr, 60 mins, 0.0 secs");
        expect(secsToTime(7200)).toBe("2 hrs, 120 mins, 0.0 secs");
        expect(secsToTime(3660)).toBe("1 hr, 61 mins, 0.0 secs");
        expect(secsToTime(3690)).toBe("1 hr, 61 mins, 30.0 secs");
    });

    test("should format days correctly", () => {
        expect(secsToTime(86400)).toBe("1 day, 24 hrs, 1440 mins, 0.0 secs");
        expect(secsToTime(172800)).toBe("2 days, 48 hrs, 2880 mins, 0.0 secs");
        expect(secsToTime(90000)).toBe("1 day, 25 hrs, 1500 mins, 0.0 secs");
        expect(secsToTime(90060)).toBe("1 day, 25 hrs, 1501 mins, 0.0 secs");
        expect(secsToTime(90061)).toBe("1 day, 25 hrs, 1501 mins, 1 sec");
    });

    test("should use singular form when appropriate", () => {
        expect(secsToTime(1)).toBe("1 sec");
        expect(secsToTime(60)).toBe("1 min, 0.0 secs");
        expect(secsToTime(3600)).toBe("1 hr, 60 mins, 0.0 secs");
        expect(secsToTime(86400)).toBe("1 day, 24 hrs, 1440 mins, 0.0 secs");
        expect(secsToTime(86401)).toBe("1 day, 24 hrs, 1440 mins, 1 sec");
        expect(secsToTime(86460)).toBe("1 day, 24 hrs, 1441 mins, 0.0 secs");
        expect(secsToTime(90000)).toBe("1 day, 25 hrs, 1500 mins, 0.0 secs");
    });

    test("should handle complex time combinations", () => {
        // 1 day, 2 hours, 3 minutes, 4 seconds
        const seconds = 86400 + 7200 + 180 + 4;
        expect(secsToTime(seconds)).toBe("1 day, 26 hrs, 1563 mins, 4.0 secs");

        // 2 days, 5 hours, 30 minutes, 15 seconds
        const seconds2 = 172800 + 18000 + 1800 + 15;
        expect(secsToTime(seconds2)).toBe(
            "2 days, 53 hrs, 3210 mins, 15.0 secs"
        );
    });

    test("should handle zero seconds", () => {
        expect(secsToTime(0)).toBe("0.0 secs");
    });

    test("should handle decimal seconds correctly", () => {
        expect(secsToTime(0.5)).toBe("0.5 secs");
        expect(secsToTime(1.5)).toBe("1.5 secs");
        expect(secsToTime(61.25)).toBe("1 min, 1.3 secs");
    });
});
