import type { TreeNodeList } from "./TreeNodeList/TreeNodeList";

let version = 0;

// Create WeakMaps to store caches. The key will be the TreeNodeList instance.
const flattenedCache = new WeakMap<
    TreeNodeList,
    { list: TreeNodeList; version: number }
>();
const terminalsCache = new WeakMap<
    TreeNodeList,
    { list: TreeNodeList; version: number }
>();

/**
 * Increments the global tree version. Call this whenever the tree is mutated.
 * Note that because the caches are stored in WeakMaps, the entries that are
 * invalidated by this will be garbage collected automatically.
 */
export function incrementTreeVersion(): void {
    version++;
}

/**
 * Gets the current global tree version.
 * @returns {number} The current version.
 */
export function getTreeVersion(): number {
    return version;
}

/**
 * Gets the flattened list from the cache if the version is current.
 * 
 * @param {TreeNodeList} list The TreeNodeList instance to check.
 * @returns {TreeNodeList | null} The cached list or null if stale/missing.
 */
export function getFlattenedFromCache(
 list: TreeNodeList
): TreeNodeList | null {
    const cacheEntry = flattenedCache.get(list);
    if (cacheEntry && cacheEntry.version === version) {
        return cacheEntry.list;
    }
    return null;
}

/**
 * Sets the flattened list in the cache for a given TreeNodeList instance.
 * 
 * @param {TreeNodeList} list The TreeNodeList instance to cache for.
 * @param {TreeNodeList} flattened The flattened list to store.
 */
export function setFlattenedInCache(
    list: TreeNodeList,
    flattened: TreeNodeList
): void {
    flattenedCache.set(list, { list: flattened, version });
}

/**
 * Gets the terminals list from the cache if the version is current.
 * 
 * @param {TreeNodeList} list The TreeNodeList instance to check.
 * @returns {TreeNodeList | null} The cached list or null if stale/missing.
 */
export function getTerminalsFromCache(
 list: TreeNodeList
): TreeNodeList | null {
    const cacheEntry = terminalsCache.get(list);
    if (cacheEntry && cacheEntry.version === version) {
        return cacheEntry.list;
    }
    return null;
}

/**
 * Sets the terminals list in the cache for a given TreeNodeList instance.
 * 
 * @param {TreeNodeList} list The TreeNodeList instance to cache for.
 * @param {TreeNodeList} terminals The terminals list to store.
 */
export function setTerminalsInCache(
    list: TreeNodeList,
    terminals: TreeNodeList
): void {
    terminalsCache.set(list, { list: terminals, version });
}
