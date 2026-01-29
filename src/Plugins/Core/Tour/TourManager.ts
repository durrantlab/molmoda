import { dynamicImports } from "@/Core/DynamicImports";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { ITest, ITestCommand, TestCommand } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { openPluginCmds } from "@/Testing/TestCmd";
import { IMenuPathInfo, processMenuPath } from "@/UI/Navigation/Menu/Menu";
import { UserArgType, } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { messagesApi } from "@/Api/Messages";
import { isLocalHost } from "@/Core/GlobalVars";
import { PopupVariant } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import { injectDriverCss, handlePopoverRender } from "./TourStyles";
import { isElementInViewport, smoothScrollIntoView, waitForElementStability, waitForElement, isElementValueCorrect } from "./TourUtils";
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
     *
     * @returns {boolean} True if a tour is active, false otherwise.
     */
    public get isTourRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Configures and returns the hooks for the driver.js instance.
     *
     * @returns {object} An object containing all the lifecycle hooks for driver.js.
     * @private
     */
    private _configureDriverHooks(): object {
        return {
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
            onDeselected: () => {
                this.lastHighlightedElement = null;
            },
            onDestroyed: () => {
                this.lastHighlightedElement = null;
                this.isRunning = false;

                // Show completion message only if the tour finished successfully
                if (this.isTourCompleted) {
                    this.showCompletionMessage();
                }
                this.isTourCompleted = false;

                this.driver = null;
            },
            onPopoverRender: (popover: any, { state }: { state: any }) => {
                handlePopoverRender(popover, { state }, this.driver, () => {
                    this.isTourCompleted = true;
                });
            },
        };
    }

    /**
     * Initializes the TourManager, loading driver.js and configuring it.
     *
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
        this.driver.moveNext = () => {
            this.moveToNextStepWithRetry(originalMoveNext);
        };
    }

    /**
     * Asynchronously moves to the next tour step, waiting for the element to appear if necessary.
     *
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

        if (typeof nextStep.element === "string") {
            try {
                const element = await waitForElement(nextStep.element);
                if (isLocalHost) {
                    console.log(`[Tour Debug] moveToNextStepWithRetry: element found for "${nextStep.element}"`);
                }

                // Always wait for the element's position to stabilize.
                // This handles cases where:
                // 1. The element needs to be scrolled into view
                // 2. The element is inside a modal that's still animating
                // 3. Any CSS transitions are still running
                await waitForElementStability(element);

                if (!isElementInViewport(element)) {
                    await smoothScrollIntoView(element);
                }
                window.dispatchEvent(new Event("resize"));

                originalMoveNext();
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
     * Starts a tour for a given plugin.
     *
     * @param {PluginParentClass} plugin The plugin instance.
     * @param {number} [testIndex=0] The index of the test to use for the tour.
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
     *
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
                            step.popover.description = `Click here to run the "${plugin.title}" plugin.`;
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
                step.popover.description = `Click here to run the "${plugin.title}" plugin.`;
                steps.push(step);
            }
        }

        this._processCommandList(test.afterPluginCloses, plugin, steps, "afterPluginCloses");

        return steps;
    }

    /**
     * Adds steps for the plugin modal, ensuring all user arguments are visited.
     *
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
        const allArgs = plugin.getUserArgsFlat();
        let cmds: ITestCommand[] = [];

        if (typeof commandListFunc === "function") {
            const testCmdList = commandListFunc();
            if (testCmdList instanceof TestCmdList) {
                cmds = [...testCmdList.cmds];
            }
        }

        const processedCmdIndices = new Set<number>();

        for (const arg of allArgs) {
            // Skip alerts and disabled args
            if (arg.type === UserArgType.Alert || arg.enabled === false) {
                continue;
            }

            // Find commands targeting this arg
            const matchingCmdIndices: number[] = [];
            cmds.forEach((cmd, index) => {
                if (processedCmdIndices.has(index)) return;
                const { userArg } = findUserArgAndRefineSelector(cmd, plugin);
                if (userArg && userArg.id === arg.id) {
                    matchingCmdIndices.push(index);
                }
            });

            if (matchingCmdIndices.length > 0) {
                // Add steps for existing commands
                for (const idx of matchingCmdIndices) {
                    const step = this._commandToDriverStep(cmds[idx], plugin, `pluginOpen cmd #${idx} (arg: ${arg.id})`);
                    if (step) steps.push(step);
                    processedCmdIndices.add(idx);
                }
            } else {
                const step = createDefaultArgStep(arg, plugin);
                if (step) {
                    step.tourDebugInfo = `Default step for arg: ${arg.id}`;
                    steps.push(step);
                }
            }
        }

        // Append remaining commands
        cmds.forEach((cmd, index) => {
            if (!processedCmdIndices.has(index)) {
                const step = this._commandToDriverStep(cmd, plugin, `pluginOpen cmd #${index} (unused by args)`);
                if (step) steps.push(step);
            }
        });
    }

    /**
     * Processes a command list function, converting its commands to tour steps.
     *
     * @param {Function | undefined} commandListFunc The function that returns a TestCmdList.
     * @param {PluginParentClass} plugin The plugin instance.
     * @param {any[]} steps The array of steps to populate.
  * @param {string} [listName="Command List"] The name of the list for debugging.
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
     * Adds the steps required to open a plugin from the menu.
     *
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
                            step.popover.description = `Click the "${menuTexts[menuTextIndex]}" menu item.`;
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
     *
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
                step = createWaitStep(command, plugin);
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
     * 
     * @private
     */
    private showCompletionMessage() {
        messagesApi.popupMessage(
            "Tour Complete!",
            `You have completed the tour for the "${this.currentPluginTitle}" plugin.`,
            PopupVariant.Success
        );
    }
}

export const tourManager = new TourManager();