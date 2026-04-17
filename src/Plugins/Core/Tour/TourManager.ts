import { dynamicImports } from "@/Core/DynamicImports";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { ITest, ITestCommand, TestCommand } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { openPluginCmds } from "@/Testing/TestCmd";
import { IMenuPathInfo, processMenuPath } from "@/UI/Navigation/Menu/Menu";
import { UserArgType, IUserArgGroup, UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { messagesApi } from "@/Api/Messages";
import { isLocalHost } from "@/Core/GlobalVars";
import { PopupVariant } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import { injectDriverCss, handlePopoverRender } from "./TourStyles";
import { isElementInViewport, smoothScrollIntoView, waitForElementStability, waitForElement, isElementValueCorrect, findScrollableParent, isElementVisibleInScrollParent, smoothScrollInScrollParent } from "./TourUtils";
import { ITourContext, findUserArgAndRefineSelector, createClickStep, createInputStep, createWaitStep, createNoteStep, createDefaultArgStep } from "./TourSteps";

/**
 * Manages the creation and execution of interactive tours using driver.js,
 * powered by the plugin testing infrastructure.
 */
export class TourManager {
    public driver: any = null;
    private isRunning = false;
    private lastHighlightedElement: HTMLElement | null = null;
    private isMoving = false; // To prevent concurrent moves
    public tourSteps: any[] = []; // Store steps for the current tour
    private currentPluginTitle = "";
    private isTourCompleted = false;

    /**
     * Checks if a tour is currently running.
     * @returns {boolean} True if a tour is active, false otherwise.
     */
    public get isTourRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Configures and returns the hooks for the driver.js instance.
     * @returns {object} An object containing all the lifecycle hooks for driver.js.
     * @private
     */
    private _configureDriverHooks(): object {
        return {
            /**
             * Called when a step is highlighted.
             * @param {HTMLElement} element The highlighted element.
             * @param {any} step The current step data.
             */
            onHighlightStarted: (element: HTMLElement, step: any) => {
                if (isLocalHost) {
                    const stepIdx = this.driver?.getActiveIndex() ?? "unknown";
                    // Added debug context info for easier identification
                    const debugInfo = step.tourDebugInfo ? ` (${step.tourDebugInfo})` : "";
                    console.log(`[Tour Debug] Step ${stepIdx}${debugInfo}`, step);
                }
                if (element) {
                    // Don't scroll here - it's handled in moveToNextStepWithRetry
                    this.lastHighlightedElement = element;
                }
            },
            /**
             * Called when the "Next" button is clicked.
             */
            onNextClick: () => {
                const activeStep = this.driver.getActiveStep();

                if (activeStep) {
                    // Allow moving next if it's a note step
                    if (activeStep.isNoteStep) {
                        this.driver.moveNext();
                        return;
                    }

                    // Allow moving next if it's an input step and the value is already correct
                    if (activeStep.expectedValue !== undefined) {
                        const selector = activeStep.element;
                        if (typeof selector === "string") {
                            const element = document.querySelector(selector) as HTMLElement;
                            if (isElementValueCorrect(element, activeStep.expectedValue)) {
                                this.driver.moveNext();
                                return;
                            }
                        }
                    }
                }

                if (!this.driver.hasNextStep()) {
                    this.isTourCompleted = true;
                    this.driver.destroy();
                }

                // For all other steps, `moveNext()` is handled manually by
                // listeners or promises, so we do nothing here to prevent
                // driver.js from automatically advancing.
            },
            /**
             * Called when a step is deselected.
             */
            onDeselected: () => {
                this.lastHighlightedElement = null;
            },
            /**
             * Called when the tour is destroyed.
             */
            onDestroyed: () => {
                console.log(`[Tour Debug] onDestroyed called. isTourCompleted=${this.isTourCompleted}, isRunning=${this.isRunning}, driver=${!!this.driver}`);
                console.trace("[Tour Debug] onDestroyed stack trace");
                this.lastHighlightedElement = null;
                this.isRunning = false;

                // Show completion message only if the tour finished successfully
                if (this.isTourCompleted) {
                    this.showCompletionMessage();
                }
                this.isTourCompleted = false;

                this.driver = null;
            },
            /**
             * Called when a popover is rendered.
             * @param {any} popover The popover element.
             * @param {object} param1 An object containing the state.
             * @param {any} param1.state The state object.
             */
            onPopoverRender: (popover: any, { state }: { state: any }) => {
                handlePopoverRender(popover, { state }, this.driver, () => {
                    this.isTourCompleted = true;
                });
            },
        };
    }

    /**
     * Initializes the TourManager, loading driver.js and configuring it.
     * @return {Promise<void>} A promise that resolves when driver.js is loaded.
     */
    private async initializeDriver(): Promise<void> {
        if (this.driver) {
            return;
        }
        const driverJsModule = await dynamicImports.driverJs.module;
        injectDriverCss();
        this.driver = driverJsModule({
            showProgress: true,
            overlayOpacity: 0.1,
            popoverOffset: 25,
            stagePadding: 5,
            allowClose: false,
            allowKeyboardControl: false,
            ...this._configureDriverHooks(),
        });

        // Monkey-patch moveNext to add retry logic
        const originalMoveNext = this.driver.moveNext.bind(this.driver);

        /**
         * Moves to the next tour step with retry logic.
         */
        this.driver.moveNext = () => {
            this.moveToNextStepWithRetry(originalMoveNext);
        };
    }

    /**
     * Asynchronously moves to the next tour step, waiting for the element to appear if necessary.
     * @param {() => void} originalMoveNext The original moveNext function from the driver instance.
     * @private
     */
    private async moveToNextStepWithRetry(originalMoveNext: () => void) {
        if (this.isMoving) {
            if (isLocalHost) {
                console.log("[Tour Debug] moveToNextStepWithRetry: skipped because isMoving=true");
            }
            return;
        }

        // Guard against driver being null
        if (!this.driver) {
            if (isLocalHost) {
                console.log("[Tour Debug] moveToNextStepWithRetry: skipped because driver is null");
            }
            return;
        }

        if (!this.driver.hasNextStep()) {
            if (isLocalHost) {
                console.log("[Tour Debug] moveToNextStepWithRetry: no next step, destroying");
            }
            this.isTourCompleted = true;
            this.driver.destroy();
            return;
        }

        this.isMoving = true;

        const steps = this.tourSteps;
        const activeIndex = this.driver.getActiveIndex();
        const nextStep = steps[activeIndex + 1];

        if (isLocalHost) {
            console.log(`[Tour Debug] moveToNextStepWithRetry: activeIndex=${activeIndex}, nextStep element="${nextStep?.element}", debugInfo="${nextStep?.tourDebugInfo}"`);
        }

        // For upload steps that just completed, wait briefly for the
        // plugin to finish processing the uploaded file before moving
        // to the next step. This prevents race conditions where the
        // tour advances before onFilesLoaded has fired.
        const currentStep = steps[activeIndex];
        if (currentStep?.isUploadStep) {
            await this._waitForUploadProcessing(currentStep);
        }

        if (typeof nextStep.element === "string") {
            try {
                // No timeout for tours: the user controls the pace, so we
                // wait indefinitely for the element to appear.
                const element = await waitForElement(nextStep.element, Infinity);
                if (isLocalHost) {
                    console.log(`[Tour Debug] moveToNextStepWithRetry: element found for "${nextStep.element}"`);
                }

                // Always wait for the element's position to stabilize.
                // This handles cases where:
                // 1. The element needs to be scrolled into view
                // 2. The element is inside a modal that's still animating
                // 3. Any CSS transitions are still running
                await waitForElementStability(element);

                // Scroll within any nested scrollable container (e.g., a modal
                // body) so the element is visible inside its parent.
                const scrollParent = findScrollableParent(element);
                if (scrollParent && !isElementVisibleInScrollParent(element, scrollParent)) {
                    await smoothScrollInScrollParent(element, scrollParent);
                    // Re-check stability after the inner scroll completes.
                    await waitForElementStability(element);
                }

                if (!isElementInViewport(element)) {
                    await smoothScrollIntoView(element);
                }

                window.dispatchEvent(new Event("resize"));

                originalMoveNext();

                // After driver.js highlights and renders the popover, it may
                // recompute layout and snap the scroll container back to its
                // original position. Schedule a deferred re-scroll to ensure
                // the element remains visible after all driver.js rendering
                // (including the delayed driver.refresh() in onHighlighted).
                this._ensureElementVisibleAfterRender(nextStep.element);

            } catch (error) {
                console.error(error);
                messagesApi.popupError(
                    `Tour element not found: ${nextStep.element}. The tour will now end.`
                );
                this.driver.destroy();
            } finally {
                this.isMoving = false;
            }
        } else {
            if (isLocalHost) {
                console.log(`[Tour Debug] moveToNextStepWithRetry: nextStep has no string element, calling originalMoveNext directly`);
            }
            originalMoveNext();
            this.isMoving = false;
        }
    }

    /**
     * After an upload step completes, wait for any async file processing
     * to finish. This gives plugins like OpenMoleculesPlugin time to run
     * onFilesLoaded and update their internal state before the tour
     * moves on to interact with the next UI element.
     *
     * @param {any} _uploadStep  The upload tour step that just completed.
     * @returns {Promise<void>}  Resolves once processing appears settled.
     */
    private async _waitForUploadProcessing(_uploadStep: any): Promise<void> {
        // Allow microtasks and short async chains to settle (e.g.,
        // FileReader callbacks, Vue reactivity updates).
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
    }

    /**
     * Ensures the highlighted element remains visible after driver.js finishes
     * rendering. Checks multiple times over ~1.5 seconds to catch scroll resets
     * caused by popover positioning and the delayed driver.refresh() call.
     * @param {string} selector The CSS selector of the target element.
     * @private
     */
    private _ensureElementVisibleAfterRender(selector: string): void {
        // Check at intervals that cover the initial render and the 1-second
        // delayed driver.refresh() in createClickStep's onHighlighted.
        const checkTimes = [100, 500, 1200];
        for (const delay of checkTimes) {
            setTimeout(async () => {
                // Bail out if the tour has moved on or been destroyed.
                if (!this.driver) return;
                const el = document.querySelector(selector) as HTMLElement;
                if (!el) return;
                const scrollParent = findScrollableParent(el);
                if (scrollParent && !isElementVisibleInScrollParent(el, scrollParent)) {
                    if (isLocalHost) {
                        console.log(`[Tour Debug] _ensureElementVisibleAfterRender: re-scrolling at ${delay}ms for "${selector}"`);
                    }
                    await smoothScrollInScrollParent(el, scrollParent);

                    // Wait for the element position to fully stabilize after
                    // scrolling before refreshing driver.js. Without this,
                    // driver.js reads the element's position mid-animation and
                    // the highlight ends up vertically offset.
                    await waitForElementStability(el);

                    if (this.driver && this.driver.refresh) {
                        this.driver.refresh();
                    }
                }
            }, delay);
        }
    }


    /**
     * Starts a tour for a given plugin.
     * @param {PluginParentClass} plugin The plugin instance.
     * @param {number} [testIndex] The index of the test to use for the tour.
     * @return {Promise<void>} A promise that resolves when the tour starts.
     */
    public async startTour(
        plugin: PluginParentClass,
        testIndex = 0
    ): Promise<void> {
        if (this.isRunning) {
            console.warn("A tour is already running.");
            return;
        }
        this.isRunning = true;
        this.isTourCompleted = false;
        this.currentPluginTitle = plugin.title;
        await this.initializeDriver();
        let tests: ITest | ITest[] = await plugin.getTests();
        if (!Array.isArray(tests)) {
            tests = [tests];
        }
        const testToRun = tests[testIndex];

        if (!testToRun) {
            console.error(
                `Test index ${testIndex} not found for plugin ${plugin.pluginId}`
            );
            this.isRunning = false;
            return;
        }

        const driverSteps = await this._convertTestToDriverSteps(
            testToRun,
            plugin
        );
        this.tourSteps = driverSteps;

        if (driverSteps.length > 0) {
            this.driver.setSteps(driverSteps);
            this.driver.drive();
        } else {
            this.isRunning = false;
        }
    }

    /**
     * Converts an ITest object into an array of driver.js steps.
     * @param {ITest} test The test definition.
     * @param {PluginParentClass} plugin The plugin instance.
     * @returns {Promise<any[]>} A promise resolving to an array of driver.js steps.
     * @private
     */
    private async _convertTestToDriverSteps(
        test: ITest,
        plugin: PluginParentClass
    ): Promise<any[]> {
        const steps: any[] = [];
        this._processCommandList(test.beforePluginOpens, plugin, steps, "beforePluginOpens");
        this._addPluginOpeningSteps(plugin, steps);
        this._addPluginModalSteps(test.pluginOpen, plugin, steps);

        // Special handling for the closePlugin step to make the message more informative.
        if (typeof test.closePlugin === "function") {
            const closeCmdList = test.closePlugin();
            if (closeCmdList instanceof TestCmdList) {
                closeCmdList.cmds.forEach((command, idx) => {
                    const step = this._commandToDriverStep(command, plugin, `closePlugin cmd #${idx}`);
                    if (step) {
                        if (
                            step.popover &&
                            command.cmd === TestCommand.Click &&
                            command.selector?.includes(".action-btn")
                        ) {
                            // It's a click on an action button. Let's make the message more specific.
                            step.popover.description = `Click here to run the <b>${plugin.title}</b> plugin.`;
                        }
                        steps.push(step);
                    }
                });
            }
        } else if (!plugin.noPopup) {
            // If closePlugin is not defined and the plugin has a popup, add the default action button click.
            const defaultCloseCommand: ITestCommand = {
                cmd: TestCommand.Click,
                selector: `#modal-${plugin.pluginId} .action-btn`,
            };
            const step = this._commandToDriverStep(defaultCloseCommand, plugin, "Default closePlugin action");
            if (step) {
                step.popover.description = `Click here to run the <b>${plugin.title}</b> plugin.`;
                steps.push(step);
            }
        }

        this._processCommandList(test.afterPluginCloses, plugin, steps, "afterPluginCloses");

        return steps;
    }

    /**
     * Adds steps for the plugin modal. Args are presented in UI order (the
     * order they appear in the modal). Non-arg commands from the test (e.g.,
     * waitUntilRegex, clicks on selectors that don't map to an arg) are
     * anchored to their test-order position relative to the surrounding arg
     * commands: they are emitted immediately after the arg command they
     * follow in the original test. Non-arg commands that appear before any
     * arg command are emitted first.
     *
     * This preserves UI order for parameter steps while keeping
     * inter-command dependencies intact (e.g., a waitUntilRegex that depends
     * on a prior setUserArg having taken effect).
     * @param {Function | undefined} commandListFunc The function that returns a TestCmdList.
     * @param {PluginParentClass} plugin The plugin instance.
     * @param {any[]} steps The array of steps to populate.
     * @private
     */
    private _addPluginModalSteps(
        commandListFunc: (() => TestCmdList) | undefined,
        plugin: PluginParentClass,
        steps: any[]
    ) {
        const allArgs = plugin.userArgsMixin.getUserArgsFlat();
        let cmds: ITestCommand[] = [];

        if (typeof commandListFunc === "function") {
            const testCmdList = commandListFunc();
            if (testCmdList instanceof TestCmdList) {
                cmds = [...testCmdList.cmds];
            }
        }
        // Partition commands into arg-targeted and non-arg, preserving
        // original test order within each group. Each non-arg command is
        // tagged with the index of the arg command that immediately precedes
        // it in the test (or -1 if none), so we can re-emit it in the right
        // place after arg commands have been reordered by UI position.
        const cmdsByArgId = new Map<string, ITestCommand[]>();
        // Maps an arg command's position in `cmds` to the arg id it targets.
        // Used to know, for each non-arg command, which arg command it came
        // "after" in the original test.
        const argCmdPositions: Array<{ argId: string; cmdIndex: number }> = [];
        const nonArgCmds: Array<{
            cmd: ITestCommand;
            // Index into argCmdPositions of the arg command this non-arg
            // command immediately follows in the test. -1 means it came
            // before any arg command.
            afterArgCmdPosIndex: number;
            // Position within the run of non-arg commands that share the
            // same afterArgCmdPosIndex, to preserve their relative order.
            orderWithinRun: number;
        }> = [];
        let currentArgCmdPosIndex = -1;
        let runCounter = 0;
        cmds.forEach((cmd, idx) => {
            const { userArg } = findUserArgAndRefineSelector(cmd, plugin);
            if (userArg) {
                if (!cmdsByArgId.has(userArg.id)) {
                    cmdsByArgId.set(userArg.id, []);
                }
                cmdsByArgId.get(userArg.id)!.push(cmd);
                argCmdPositions.push({ argId: userArg.id, cmdIndex: idx });
                currentArgCmdPosIndex = argCmdPositions.length - 1;
                runCounter = 0;
            } else {
                nonArgCmds.push({
                    cmd,
                    afterArgCmdPosIndex: currentArgCmdPosIndex,
                    orderWithinRun: runCounter++,
                });
            }
        });
        // Emit any non-arg commands that appeared before the first arg
        // command in the test (afterArgCmdPosIndex === -1).
        const leadingNonArgCmds = nonArgCmds
            .filter((n) => n.afterArgCmdPosIndex === -1)
            .sort((a, b) => a.orderWithinRun - b.orderWithinRun);
        leadingNonArgCmds.forEach((n, idx) => {
            const step = this._commandToDriverStep(
                n.cmd,
                plugin,
                `pluginOpen leading non-arg cmd #${idx}`
            );
            if (step) {
                steps.push(step);
            }
        });
        // Walk args in UI order. For each touched arg, emit its explicit
        // command(s), then any non-arg commands that were anchored to this
        // arg's *last* command in the original test. For untouched args,
        // emit a default step.
        for (const arg of allArgs) {
            // Skip alerts and disabled args
            if (arg.type === UserArgType.Alert || arg.enabled === false) {
                continue;
            }

            // Skip args inside collapsed groups, since they won't be visible
            // in the DOM and would cause the tour to hang.
            if (this._isArgInHiddenGroup(arg, plugin)) {
                continue;
            }

            // If there are explicit commands for this arg, use those.
            if (cmdsByArgId.has(arg.id)) {
                const argCmds = cmdsByArgId.get(arg.id)!;
                argCmds.forEach((cmd, idx) => {
                    const step = this._commandToDriverStep(
                        cmd,
                        plugin,
                        `pluginOpen cmd for arg: ${arg.id} #${idx}`
                    );
                    if (step) {
                        steps.push(step);
                    }
                });
                // Find the arg-command position index corresponding to this
                // arg's last command in the original test, and emit any
                // non-arg commands anchored to it.
                let lastPosIndexForArg = -1;
                argCmdPositions.forEach((pos, posIdx) => {
                    if (pos.argId === arg.id) {
                        lastPosIndexForArg = posIdx;
                    }
                });
                if (lastPosIndexForArg !== -1) {
                    const anchored = nonArgCmds
                        .filter(
                            (n) =>
                                n.afterArgCmdPosIndex === lastPosIndexForArg
                        )
                        .sort(
                            (a, b) => a.orderWithinRun - b.orderWithinRun
                        );
                    anchored.forEach((n, idx) => {
                        const step = this._commandToDriverStep(
                            n.cmd,
                            plugin,
                            `pluginOpen non-arg cmd after arg: ${arg.id} #${idx}`
                        );
                        if (step) {
                            steps.push(step);
                        }
                    });
                }
            } else {
                // No explicit command for this arg; create a default step.
                const step = createDefaultArgStep(arg, plugin);
                if (step) {
                    step.tourDebugInfo = `Default step for arg: ${arg.id}`;
                    steps.push(step);
                }
            }
        }
        // Safety net: if any non-arg commands were anchored to an arg
        // position whose arg isn't in allArgs (shouldn't happen, but guard
        // against it), emit them at the end so they aren't silently dropped.
        const emittedPosIndexes = new Set<number>();
        for (const arg of allArgs) {
            argCmdPositions.forEach((pos, posIdx) => {
                if (pos.argId === arg.id) {
                    emittedPosIndexes.add(posIdx);
                }
            });
        }
        const orphaned = nonArgCmds.filter(
            (n) =>
                n.afterArgCmdPosIndex !== -1 &&
                !emittedPosIndexes.has(n.afterArgCmdPosIndex)
        );
        orphaned.forEach((n, idx) => {
            const step = this._commandToDriverStep(
                n.cmd,
                plugin,
                `pluginOpen orphaned non-arg cmd #${idx}`
            );
            if (step) {
                steps.push(step);
            }
        });
    }

    /**
     * Processes a command list function, converting its commands to tour steps.
     * @param {Function | undefined} commandListFunc The function that returns a TestCmdList.
     * @param {PluginParentClass} plugin The plugin instance.
     * @param {any[]} steps The array of steps to populate.
     * @param {string} [listName] The name of the list for debugging.
     * @private
     */
    private _processCommandList(
        commandListFunc: (() => TestCmdList) | undefined,
        plugin: PluginParentClass,
        steps: any[],
        listName = "Command List"
    ) {
        if (typeof commandListFunc !== "function") return;
        const testCmdList = commandListFunc();
        if (testCmdList instanceof TestCmdList) {
            testCmdList.cmds.forEach((command, index) => {
                const step = this._commandToDriverStep(command, plugin, `${listName} cmd #${index}`);
                if (step) {
                    steps.push(step);
                }
            });
        }
    }

    /**
     * Checks whether a user argument is nested inside a group that starts
     * collapsed or is disabled.
     * @param {UserArg} arg The argument to check.
     * @param {PluginParentClass} plugin The plugin instance.
     * @returns {boolean} True if the arg should be skipped in the tour.
     * @private
     */
    private _isArgInHiddenGroup(arg: UserArg, plugin: PluginParentClass): boolean {
        const allArgs = plugin.userArgs;
        for (const topArg of allArgs) {
            if (topArg.type === UserArgType.Group) {
                const group = topArg as IUserArgGroup;
                const children = Array.isArray(group.val) ? group.val : [];
                const isChild = children.some((child: UserArg) => child.id === arg.id);
                if (isChild && (!group.startOpened || group.enabled === false)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Adds the steps required to open a plugin from the menu.
     * @param {PluginParentClass} plugin The plugin instance.
     * @param {any[]} steps The array of steps to populate.
     * @private
     */
    private _addPluginOpeningSteps(plugin: PluginParentClass, steps: any[]) {
        const openCmds = openPluginCmds(plugin);

        // Get original menu path info
        const originalMenuPathInfo = processMenuPath(plugin.menuPath);
        if (!originalMenuPathInfo) {
            return;
        }

        // Replicate the logic from openPluginCmds to get the path that corresponds to actual clicks
        const tempPathForLogic = [...originalMenuPathInfo];
        const lastItem = tempPathForLogic.pop();
        if (tempPathForLogic.length > 1) {
            tempPathForLogic.splice(1, 1);
        }
        const clickedPathInfo = [...tempPathForLogic, lastItem].filter(
            Boolean
        ) as IMenuPathInfo[];

        const menuTexts = clickedPathInfo.map((info) =>
            info.text.replace(/(\.\.\.|_)/g, "").trim()
        );

        let menuTextIndex = 0;

        openCmds.forEach((command, index) => {
            const step = this._commandToDriverStep(command, plugin, `Menu Navigation cmd #${index}`);
            if (step) {
                if (step.popover) {
                    // console.log(
                    //  `Tour Step: Open Plugin - Selector: ${command.selector}`
                    // );
                    // Only create descriptions for click commands
                    if (command.cmd === TestCommand.Click) {
                        if (command.selector === "#hamburger-button") {
                            step.popover.description = `Please click here to open the menu.`;
                            // Do not increment menuTextIndex for the hamburger button
                        } else if (
                            menuTexts.length > 0 &&
                            menuTextIndex < menuTexts.length
                        ) {
                            step.popover.description = `Click the <b>${menuTexts[menuTextIndex]}</b> menu item.`;
                            menuTextIndex++;
                        } else {
                            // Fallback for any other clicks (e.g., if openPluginCmds is buggy)
                            step.popover.description = `Please click here to continue the tour.`;
                        }
                    } else {
                        // For any non-click commands (though none are expected here from openPluginCmds)
                        step.popover.description = `Please click here to continue the tour.`;
                    }
                }
                steps.push(step);
            }
        });
    }

    /**
     * Converts a single ITestCommand into a driver.js step object by dispatching to helper methods.
     * @param {ITestCommand} command The test command.
     * @param {PluginParentClass} plugin The plugin instance.
     * @param {string} [debugInfo] Optional info for debugging the tour step.
     * @returns {any | null} A driver.js step object or null for non-interactive commands.
     * @private
     */
    private _commandToDriverStep(
        command: ITestCommand,
        plugin: PluginParentClass,
        debugInfo?: string
    ): any | null {
        let step: any = null;

        // Improve highlighting for SVG wrappers
        let selector = command.selector;
        if (selector && selector.endsWith(".svg-wrapper")) {
            // Attempt to target the inner SVG first, falling back to the wrapper
            selector += " > svg, " + selector;
        }
        const cmdForStep = { ...command, selector };

        const context: ITourContext = {
            manager: this,
            /**
             * Marks the tour as completed.
             */
            markCompleted: () => {
                this.isTourCompleted = true;
            }
        };

        switch (command.cmd) {
            case TestCommand.Click:
                step = createClickStep(cmdForStep, plugin, context);
                break;
            case TestCommand.Text:
            case TestCommand.Upload:
                step = createInputStep(cmdForStep, plugin, context);
                break;
            case TestCommand.WaitUntilRegex:
                step = createWaitStep(command, plugin, context);
                break;
            case TestCommand.TourNote:
                step = createNoteStep(cmdForStep, plugin);
                break;
            default:
                // Commands like Wait are not interactive and can be skipped in a user tour.
                return null;
        }

        if (step && debugInfo) {
            step.tourDebugInfo = debugInfo;
        }
        return step;
    }

    /**
     * Shows the completion message in a standard modal.
     * @private
     */
    private showCompletionMessage() {
        messagesApi.popupMessage(
            "Tour Complete!",
            `You have completed the tour for the <b>${this.currentPluginTitle}</b> plugin.`,
            PopupVariant.Success
        );
    }
}

export const tourManager = new TourManager();