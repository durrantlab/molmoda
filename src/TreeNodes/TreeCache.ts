import type { TreeNodeList } from "./TreeNodeList/TreeNodeList";

let version = 0;
const DO_CACHE = true;

// Track whether we're inside a batch operation to avoid redundant
// cache invalidations. Each molecule push normally increments the
// version, but during a batch load we defer until the batch completes.
let _batchDepth = 0;
let _batchDirty = false;

/**
 * Begins a batch scope. Cache invalidation via `incrementTreeVersion` is
 * deferred until the outermost `endBatchTreeUpdate` call. Supports nesting.
 */
export function beginBatchTreeUpdate(): void {
    _batchDepth++;
}

/**
 * Ends a batch scope. If this closes the outermost batch and any
 * invalidations were deferred, a single `incrementTreeVersion` fires now.
 */
export function endBatchTreeUpdate(): void {
    if (_batchDepth > 0) {
        _batchDepth--;
    }
    if (_batchDepth === 0 && _batchDirty) {
        _batchDirty = false;
        version++;
    }
}

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
 * If inside a batch scope, the increment is deferred to avoid redundant
 * cache invalidation during bulk molecule loads.
 */
export function incrementTreeVersion(): void {
    if (_batchDepth > 0) {
        _batchDirty = true;
        return;
    }
    version++;
}

/**
 * Gets the current global tree version.
 * 
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
    if (!DO_CACHE) {
        return null; // Caching is disabled
    }

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
    if (!DO_CACHE) {
        return null; // Caching is disabled
    }

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
