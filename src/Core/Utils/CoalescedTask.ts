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

/**
 * Manages batch loading of molecules with render deferral. The first molecule
 * in a batch renders immediately for perceived responsiveness; subsequent
 * molecules are accumulated and rendered in a single 3Dmol.js pass once the
 * batch completes or a quiet period elapses.
 *
 * Usage:
 *   const gate = new BatchRenderGate(renderFn);
 *   gate.notifyMoleculeAdded();  // first call: renders immediately
 *   gate.notifyMoleculeAdded();  // subsequent: deferred
 *   gate.notifyMoleculeAdded();  // subsequent: deferred
 *   // after quietPeriodMs with no new calls, renderFn fires once for all deferred molecules.
 *
 * The gate auto-resets after the deferred render fires, so the next molecule
 * added after a quiet period will again render immediately.
 */
export class BatchRenderGate {
    private _renderFn: () => void | Promise<void>;
    private _quietPeriodMs: number;
    private _hasFiredImmediate = false;
    private _deferredCount = 0;
    private _quietTimer: ReturnType<typeof setTimeout> | null = null;
    private _batchActive = false;

    /**
     * @param {() => void | Promise<void>} renderFn  The function that triggers
     *                                               a full render cycle. May
     *                                               be sync or async.
     * @param {number} [quietPeriodMs=300]  How long to wait (ms) after the
     *                                      last molecule add before firing
     *                                      the deferred render. Tune this
     *                                      to balance responsiveness vs.
     *                                      batching efficiency.
     */
    constructor(renderFn: () => void | Promise<void>, quietPeriodMs = 300) {
        this._renderFn = renderFn;
        this._quietPeriodMs = quietPeriodMs;
    }

    /**
     * Call this each time a molecule is added to the store. The first call
     * triggers an immediate render; subsequent calls within the quiet period
     * are deferred into a single render.
     */
    public notifyMoleculeAdded(): void {
        if (!this._hasFiredImmediate) {
            // First molecule in the batch: render immediately for
            // perceived responsiveness.
            this._hasFiredImmediate = true;
            this._batchActive = true;
            this._renderFn();
        } else {
            this._deferredCount++;
        }

        // Reset the quiet timer. Each new molecule extends the window,
        // so we only fire the deferred render once loading settles.
        this._resetQuietTimer();
    }

    /**
     * Whether the gate is currently deferring renders (i.e., we're in the
     * middle of a batch load after the first molecule has rendered).
     *
     * @returns {boolean}  True if renders should be suppressed by the caller.
     */
    public get isDeferring(): boolean {
        return this._batchActive && this._hasFiredImmediate;
    }

    public get deferredCount(): number {
        return this._deferredCount;
    }

    /**
     * Forces the deferred render to fire immediately and resets the gate.
     * Useful when you know the batch is complete and don't want to wait
     * for the quiet period.
     */
    public flush(): void {
        this._clearQuietTimer();
        this._fireDeferredRender();
    }

    /**
     * Resets the gate without firing a deferred render. Useful for cleanup
     * or cancellation.
     */
    public cancel(): void {
        this._clearQuietTimer();
        this._reset();
    }

    private _resetQuietTimer(): void {
        this._clearQuietTimer();
        this._quietTimer = setTimeout(() => {
            this._fireDeferredRender();
        }, this._quietPeriodMs);
    }

    private _clearQuietTimer(): void {
        if (this._quietTimer !== null) {
            clearTimeout(this._quietTimer);
            this._quietTimer = null;
        }
    }

    private _fireDeferredRender(): void {
        if (this._deferredCount > 0) {
            this._renderFn();
        }
        this._reset();
    }

    private _reset(): void {
        this._hasFiredImmediate = false;
        this._deferredCount = 0;
        this._batchActive = false;
        this._clearQuietTimer();
    }
}

/**
 * Debounces a function so it only fires after a quiet period with no calls.
 * Unlike leading-edge throttle, this only fires on the trailing edge.
 *
 * @param {() => void} fn         The function to debounce.
 * @param {number}     delayMs    The quiet period in milliseconds.
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