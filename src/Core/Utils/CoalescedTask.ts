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
 * Creates a leading-edge throttle: the function fires immediately on the
 * first call, then suppresses further invocations until `delayMs` has
 * elapsed since the last call. This prevents high-frequency events (resize,
 * input, scroll) from triggering work more often than the specified interval.
 *
 * Note: trailing calls are suppressed, not deferred. If you need a
 * trailing-edge invocation, wrap this with an additional trailing timer.
 *
 * @param {() => void}  fn       The synchronous function to throttle.
 * @param {number}      delayMs  Minimum interval between invocations (ms).
 * @returns {{ invoke: () => void; cancel: () => void }}
 *     `invoke` — call this in place of `fn` directly.
 *     `cancel` — cancels any pending cooldown timer.
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
 * Coalesces multiple synchronous calls into a single callback on the next
 * animation frame. If `invoke()` is called several times before the browser
 * paints, only the last-scheduled frame fires. This is the right primitive
 * for visual updates (e.g., WebGL re-renders) where you want exactly one
 * repaint per frame regardless of how many state changes occurred.
 *
 * @param {() => void} fn  The synchronous function to run once per frame.
 * @returns {{ invoke: () => void; cancel: () => void }}
 *     `invoke` — schedule `fn` for the next animation frame.
 *     `cancel` — cancel a pending frame request.
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