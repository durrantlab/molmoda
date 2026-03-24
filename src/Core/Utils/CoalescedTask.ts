import { visualizationApi } from "@/Api/Visualization";
import { updateStylesInViewer } from "@/Core/Styling/StyleManager";

/**
 * Coalesces overlapping async task executions. When `request()` is called
 * while the task is already running, the task will re-run exactly once after
 * the current execution completes. Multiple `request()` calls during a single
 * execution collapse into one trailing re-run, ensuring no work is lost
 * without unbounded concurrency.
 *
 * Use this for async work (e.g., re-rendering a scene, syncing state) where
 * overlapping executions would be wasteful or incorrect.
 */
export class AsyncTaskCoalescer {
    private _running = false;
    private _pendingRerun = false;
    private _task: () => Promise<void>;

    /**
     * @param {() => Promise<void>} task  The async function to coalesce.
     * @param {boolean} [immediate=false] If true, the task is executed once
     *                                    immediately upon construction, before
     *                                    any explicit `request()` call.
     */
    constructor(task: () => Promise<void>, immediate = false) {
        this._task = task;
        if (immediate) {
            this._run();
        }
    }

    /**
   * Request the task to run. If the task is idle, it starts immediately.
   * If already running, a single re-run is queued for after completion.
     */
    public request(): void {
        if (this._running) {
            this._pendingRerun = true;
            return;
        }
        this._run();
    }

    private async _run(): Promise<void> {
        this._running = true;
        this._pendingRerun = false;
        try {
            await this._task();
        } finally {
            this._running = false;
            if (this._pendingRerun) {
                this._pendingRerun = false;
                this._run();
            }
        }
    }
}

/**
 * Creates a leading-edge throttle: fires immediately on first call,
 * then suppresses for delayMs. A trailing call is scheduled at the
 * end of the suppression window.
 *
 * @param {() => void} fn        The function to throttle.
 * @param {number}     delayMs   The suppression window in milliseconds.
 * @returns {{ invoke: () => void; cancel: () => void }}  Control object.
 */
export function createLeadingEdgeThrottle(
    fn: () => void,
    delayMs: number,
): { invoke: () => void; cancel: () => void } {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastInvoked = 0;

    return {
        invoke(): void {
            const now = Date.now();
            const elapsed = now - lastInvoked;

            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }

            if (elapsed >= delayMs) {
                // Enough time has passed; fire immediately.
                lastInvoked = now;
                fn();
            }

            // Always (re)start the cooldown timer. If we just fired,
            // this prevents another immediate call. If we suppressed,
            // this keeps the window open until calls stop.
            timer = setTimeout(() => {
                timer = null;
                lastInvoked = Date.now();
            }, delayMs);
        },
        cancel(): void {
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
        },
    };
}

/**
 * Coalesces calls into a single requestAnimationFrame callback.
 *
 * @param {() => void} fn  The function to call on the next animation frame.
 * @returns {{ invoke: () => void; cancel: () => void }}  Control object.
 */
export function createAnimationFrameCoalescer(
    fn: () => void,
): { invoke: () => void; cancel: () => void } {
    let frameId: number | null = null;

    return {
        invoke(): void {
            if (frameId !== null) {
                cancelAnimationFrame(frameId);
            }
            frameId = requestAnimationFrame(() => {
                frameId = null;
                fn();
            });
        },
        cancel(): void {
            if (frameId !== null) {
                cancelAnimationFrame(frameId);
                frameId = null;
            }
        },
    };
}

/**
 * Debounces a function so it only fires after a quiet period with no
 * calls. Unlike leading-edge throttle, this only fires on the trailing
 * edge.
 *
 * @param {() => void} fn       The function to debounce.
 * @param {number}     delayMs  The quiet period in milliseconds.
 * @returns {{ invoke: () => void; cancel: () => void }}  Control object.
 */
export function createTrailingEdgeDebounce(
    fn: () => void,
    delayMs: number,
): { invoke: () => void; cancel: () => void } {
    let timer: ReturnType<typeof setTimeout> | null = null;

    return {
        invoke(): void {
            if (timer !== null) {
                clearTimeout(timer);
            }
            timer = setTimeout(() => {
                timer = null;
                fn();
            }, delayMs);
        },
        cancel(): void {
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
        },
    };
}

/**
 * Whether visualization updates are currently deferred. Checked by
 * ViewerParent.renderAll() and ViewerPanel._updateStyleChanges() to
 * skip expensive canvas repaints while molecules are being batch-loaded.
 */
let _visualizationDeferred = false;

/**
 * Returns true if visualization is currently deferred via
 * deferVisualization().
 *
 * @returns {boolean}  Whether rendering is suppressed.
 */
export function isVisualizationDeferred(): boolean {
    return _visualizationDeferred;
}

/**
* Run a callback with viewer rendering suppressed. While the callback
* executes, all renderAll() calls and style-update render passes are
* skipped. After the callback completes (or throws), the flag is
* cleared and a single forced render is triggered so that all
* accumulated changes appear at once.
*
* @param {() => Promise<void>} fn  The async work to perform while
*     visualization is deferred (e.g., loading multiple molecules).
* @returns {Promise<void>}
*/
export async function deferVisualization(fn: () => Promise<void>): Promise<void> {
    _visualizationDeferred = true;
    try {
        await fn();
    } finally {
        _visualizationDeferred = false;
        // Lazy import to avoid circular dependency at module load time.
        // const { visualizationApi } = await i_mport("@/Api/Visualization");
        // const { updateStylesInViewer } = await i_mport("@/Core/Styling/StyleManager");
        updateStylesInViewer();
        const viewer = await visualizationApi.viewer;
        await viewer.renderImmediate();
        viewer.zoomOnFocused();
    }
}