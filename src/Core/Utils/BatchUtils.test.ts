import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { batchify } from "./BatchUtils";

// Mock the getSetting function
jest.mock("@/Plugins/Core/Settings/LoadSaveSettings", () => ({
  getSetting: jest.fn(),
}));

describe("batchify", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create batches with the specified number of batches", async () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const numBatches = 3;
    
    const result = await batchify(list, numBatches);
    
    // Should create 3 batches: [1,2,3,4], [5,6,7,8], [9,10]
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual([1, 2, 3, 4]);
    expect(result[1]).toEqual([5, 6, 7, 8]);
    expect(result[2]).toEqual([9, 10]);
  });

  it("should use maxProcs setting when numBatches is not specified", async () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8];
    
    // Mock the getSetting function to return 4
    (getSetting as jest.Mock).mockResolvedValue(4);
    
    const result = await batchify(list);
    
    // Should have called getSetting
    expect(getSetting).toHaveBeenCalledWith("maxProcs");
    
    // Should create 4 batches: [1,2], [3,4], [5,6], [7,8]
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual([1, 2]);
    expect(result[1]).toEqual([3, 4]);
    expect(result[2]).toEqual([5, 6]);
    expect(result[3]).toEqual([7, 8]);
  });

  it("should use maxProcs setting when numBatches is null", async () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8];
    
    // Mock the getSetting function to return 2
    (getSetting as jest.Mock).mockResolvedValue(2);
    
    const result = await batchify(list, null);
    
    // Should have called getSetting
    expect(getSetting).toHaveBeenCalledWith("maxProcs");
    
    // Should create 2 batches: [1,2,3,4], [5,6,7,8]
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([1, 2, 3, 4]);
    expect(result[1]).toEqual([5, 6, 7, 8]);
  });

  it("should handle empty lists", async () => {
    const list: number[] = [];
    const numBatches = 3;
    
    const result = await batchify(list, numBatches);
    
    // Should return an empty array
    expect(result).toHaveLength(0);
  });

  it("should handle lists smaller than the number of batches", async () => {
    const list = [1, 2, 3];
    const numBatches = 5;
    
    const result = await batchify(list, numBatches);
    
    // Should create 3 batches with 1 item each
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual([1]);
    expect(result[1]).toEqual([2]);
    expect(result[2]).toEqual([3]);
  });

  it("should maintain correct types with generic lists", async () => {
    const list = ["a", "b", "c", "d", "e", "f"];
    const numBatches = 2;
    
    const result = await batchify(list, numBatches);
    
    // Should create 2 batches: ["a","b","c"], ["d","e","f"]
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(["a", "b", "c"]);
    expect(result[1]).toEqual(["d", "e", "f"]);
  });

  it("should handle complex object lists", async () => {
    const list = [
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" },
      { id: 3, name: "Item 3" },
      { id: 4, name: "Item 4" }
    ];
    const numBatches = 2;
    
    const result = await batchify(list, numBatches);
    
    // Should create 2 batches
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" }
    ]);
    expect(result[1]).toEqual([
      { id: 3, name: "Item 3" },
      { id: 4, name: "Item 4" }
    ]);
  });
});