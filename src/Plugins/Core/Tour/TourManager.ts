import { dynamicImports } from "@/Core/DynamicImports";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { ITest, ITestCommand, TestCommand } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { waitForCondition } from "../../../Core/Utils/MiscUtils";
import { PopoverDOM } from "driver.js";
import { openPluginCmds } from "@/Testing/TestCmd";
import { IMenuPathInfo, processMenuPath } from "@/UI/Navigation/Menu/Menu";
import {
    UserArg,
    UserArgType,
    IUserArgSelect,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { messagesApi } from "@/Api/Messages";
import { slugify } from "@/Core/Utils/StringUtils";
import { isLocalHost } from "@/Core/GlobalVars";

const FOCUS_DELAY = 150; // ms

/**
 * Manages the creation and execution of interactive tours using driver.js,
 * powered by the plugin testing infrastructure.
 */
class TourManager {
    private driver: any = null;
    private isRunning = false;
    private lastHighlightedElement: HTMLElement | null = null;
    private isMoving = false; // To prevent concurrent moves
    private tourSteps: any[] = []; // Store steps for the current tour

    /**
     * Checks if a tour is currently running.
     *
     * @returns {boolean} True if a tour is active, false otherwise.
     */
    public get isTourRunning(): boolean {
        return this.isRunning;
    }

    /**
  * Injects the driver.js CSS file and custom overrides into the document head.
     *
     * @private
     */
    private _injectDriverCss(): void {
        // Inject standard CSS
        const cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.type = "text/css";
        cssLink.href = "js/driverjs/driver.css";
        document.head.appendChild(cssLink);

        // Inject custom overrides to make the arrow blend with the Bootstrap card header/footer
        const style = document.createElement("style");
        style.innerHTML = `
   /* 
    Case 1: Popover is BELOW the element. 
    Arrow is at the TOP of the popover. It points UP. 
    It connects to the Header (Blue).
   */
   div.driver-popover.driverjs-theme .driver-popover-tip.top {
    border-bottom-color: #0d6efd !important; /* Bootstrap Primary Blue */
    border-top-color: transparent !important;
   }

   /* 
    Case 2: Popover is ABOVE the element (e.g. for action buttons).
    Arrow is at the BOTTOM of the popover. It points DOWN.
    It connects to the Footer (Light Gray).
   */
   div.driver-popover.driverjs-theme .driver-popover-tip.bottom {
    border-top-color: #f8f9fa !important; /* Approx Bootstrap card-footer bg */
    border-bottom-color: transparent !important;
   }
   
   /* 
    Case 3: Popover is to the RIGHT of the element.
    Arrow is at the LEFT of the popover. It points LEFT.
    It connects to the Body (White).
   */
   div.driver-popover.driverjs-theme .driver-popover-tip.left {
    border-right-color: #ffffff !important;
    border-left-color: transparent !important;
    border-top-color: transparent !important;
    border-bottom-color: transparent !important;
   }

   /* 
    Case 4: Popover is to the LEFT of the element.
    Arrow is at the RIGHT of the popover. It points RIGHT.
    It connects to the Body (White).
   */
   div.driver-popover.driverjs-theme .driver-popover-tip.right {
    border-left-color: #ffffff !important;
    border-right-color: transparent !important;
    border-top-color: transparent !important;
    border-bottom-color: transparent !important;
   }
   
   /* 
    Fix z-index to be strictly above everything.
    driver.js overlay is usually around 100000+. 
    We set this to 100 million to be safe.
   */
   div.driver-popover {
    z-index: 100000000 !important;
   }
  `;
        document.head.appendChild(style);
    }

    /**
     * Handles the rendering of the popover by applying Bootstrap classes.
     *
     * @param {PopoverDOM} popover - The popover DOM object from driver.js.
     * @param {any} state - The current state of the tour step.
     * @private
     */
    private _handlePopoverRender(
        popover: PopoverDOM,
        { state }: { state: any }
    ): void {
        // If it's a custom wait step, handle auto-advance here.
        if (state.activeStep.isWaitStep) {
            setTimeout(() => {
                waitForCondition(state.activeStep.waitCondition)
                    .then(() => {
                        if (
                            this.driver &&
                            this.driver.getActiveStep() === state.activeStep
                        ) {
                            this.driver.moveNext();
                        }
                        return null;
                    })
                    .catch((err: any) => {
                        // throw err
                        console.error(
                            "TourManager: Error in waitForCondition:",
                            err
                        );
                    });
            }, 0);
        }

        const popoverEl = popover.wrapper?.closest(
            ".driver-popover"
        ) as HTMLElement;
        if (!popoverEl) return;

        // Set opacity to 0
        // popoverEl.style.opacity = "0";

        // Apply transform scale to make 0
        popoverEl.style.transform = "scale(0)";

        // Hackish. Investigate further...
        setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
            setTimeout(() => {
                window.dispatchEvent(new Event("resize"));
                popoverEl.classList.add("card", "shadow-lg", "p-0");

                if (popover.title) {
                    popover.title.classList.add(
                        "card-header",
                        "py-2",
                        "ps-3",
                        "pe-2",
                        "h5",
                        "m-0",
                        "d-flex",
                        "justify-content-between",
                        "align-items-center",
                        "bg-primary",
                        "text-white"
                    );
                }

                if (popover.arrow) {
                    // NOTE: Do NOT add 'border-primary' here. It ruins the CSS triangle hack used by driver.js.
                    // Color matching is handled by _injectDriverCss overrides.
                    popover.arrow.style.filter =
                        "drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.3))";
                }

                if (popover.description) {
                    popover.description.classList.add("card-body", "p-3");
                }

                if (popover.footer) {
                    popover.footer.classList.add(
                        "card-footer",
                        "d-flex",
                        "justify-content-end",
                        "align-items-center",
                        "py-2",
                        "px-3"
                    );
                    popover.footer.classList.remove("driver-popover-footer");
                }

                if (popover.previousButton) {
                    popover.previousButton.style.display = "none";
                }

                if (popover.nextButton) {
                    popover.nextButton.classList.add(
                        "btn",
                        "btn-sm",
                        "btn-primary",
                        "ms-1"
                    );

                    if (
                        state.activeStep?.onHighlightStarted ||
                        state.activeStep?.isWaitStep
                    ) {
                        popover.nextButton.style.display = "none";
                    } else {
                        popover.nextButton.style.display = "inline-block";
                    }
                }

                if (popover.closeButton) {
                    popover.closeButton.innerHTML = "";
                    popover.closeButton.classList.add(
                        "btn-close",
                        "btn-close-white"
                    );
                    if (popover.title) {
                        popover.title.appendChild(popover.closeButton);
                    }
                }
    // Restore opacity
                // popoverEl.style.opacity = "1";
                // Restore scale
                popoverEl.style.transform = "scale(1)";
            }, 25);
        }, 500);
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
                    // Use 'nearest' to avoid unnecessary scrolling if element is already in view
                    element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });

                    element.style.setProperty("outline", "3px solid #0d6efd");
                    element.style.setProperty("outline-offset", "4px"); // Increased offset for cleaner look
                    element.style.setProperty("border-radius", "4px");
                    this.lastHighlightedElement = element;
                }
            },
            onNextClick: () => {
                const activeStep = this.driver.getActiveStep();
                if (activeStep && activeStep.isNoteStep) {
                    this.driver.moveNext();
                    return;
                }
                // If there is no next step, this is the last one.
                if (!this.driver.hasNextStep()) {
                    this.driver.destroy();
                }

                // For all other steps, `moveNext()` is handled manually by
                // listeners or promises, so we do nothing here to prevent
                // driver.js from automatically advancing.
            },
            onDeselected: (element: HTMLElement) => {
                if (element) {
                    element.style.removeProperty("outline");
                    element.style.removeProperty("outline-offset");
                    element.style.removeProperty("border-radius");
                }
                this.lastHighlightedElement = null;
            },
            onDestroyed: () => {
                if (this.lastHighlightedElement) {
                    this.lastHighlightedElement.style.removeProperty("outline");
                    this.lastHighlightedElement.style.removeProperty(
                        "outline-offset"
                    );
                    this.lastHighlightedElement.style.removeProperty(
                        "border-radius"
                    );
                    this.lastHighlightedElement = null;
                }
                this.isRunning = false;
                this.driver = null; // Reset for next tour
            },
            onPopoverRender: (
                popover: PopoverDOM,
                { state }: { state: any }
            ) => {
                this._handlePopoverRender(popover, { state });
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
        this._injectDriverCss();
        this.driver = driverJsModule({
            showProgress: true,
            overlayOpacity: 0.1, // Make overlay less intrusive
            popoverOffset: 15, // Increased to provide more space between element and popover (prevents obscuring)
            stagePadding: 5,   // Adds padding around the highlighted element
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
        if (this.isMoving) return;
        if (!this.driver.hasNextStep()) {
            this.driver.destroy();
            return;
        }

        this.isMoving = true;

        const steps = this.tourSteps; // Use stored steps
        const activeIndex = this.driver.getActiveIndex();
        const nextStep = steps[activeIndex + 1];

        if (typeof nextStep.element === "string") {
            try {
                await this.waitForElement(nextStep.element);
                originalMoveNext(); // Element exists, proceed.
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
            originalMoveNext(); // No element to wait for.
            this.isMoving = false;
        }
    }

    /**
     * Waits for a DOM element to appear, retrying every 250ms for up to 2 seconds.
     *
     * @param {string} selector The CSS selector for the element.
     * @param {number} [timeout=2000] The total time to wait in milliseconds.
     * @param {number} [interval=250] The time between retries in milliseconds.
     * @returns {Promise<HTMLElement>} A promise that resolves with the element or rejects with an error.
     * @private
     */
    private waitForElement(
        selector: string,
        timeout = 2000,
        interval = 250
    ): Promise<HTMLElement> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const check = () => {
                // If the selector targets multiple items (like with comma), verify at least one exists
                const element = document.querySelector(selector) as HTMLElement;
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    reject(
                        new Error(
                            `TourManager: Element not found for selector "${selector}" after ${timeout}ms.`
                        )
                    );
                } else {
                    setTimeout(check, interval);
                }
            };
            check();
        });
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
        this.tourSteps = driverSteps; // Store the steps for later use

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

        // Add conclusion step
        steps.push({
            popover: {
                title: "Tour Complete!",
                description: `You have completed the tour for the "${plugin.title}" plugin.`,
            },
            tourDebugInfo: "Conclusion",
        });

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
                const { userArg } = this._findUserArgAndRefineSelector(cmd, plugin);
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
                // Add default step
                const step = this._createDefaultArgStep(arg, plugin);
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
     * Creates a default driver.js step for a user argument that isn't modified in the test.
     *
     * @param {UserArg} arg The user argument.
     * @param {PluginParentClass} plugin The plugin instance.
     * @returns {any} A driver.js step object.
     * @private
     */
    private _createDefaultArgStep(arg: UserArg, plugin: PluginParentClass): any {
        let selector = `#${arg.id}-${plugin.pluginId}-item`;
        if (arg.type === UserArgType.Vector3D) {
            selector = `#x-${arg.id}-${plugin.pluginId}-item`;
        }

        const label = arg.label || "Parameter";
        const description = arg.description
            ? `<br><br><em>${arg.description}</em>`
            : "";

        return {
            element: selector,
            popover: {
                title: plugin.title,
                description: `Set ${label}.${description}`,
            },
            isNoteStep: true,
            onHighlighted: (element: HTMLElement) => {
                this._setFocus(element);
            },
        };
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
            tempPathForLogic.splice(1, 1); // This removes the non-clickable second-level group
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

        switch (command.cmd) {
            case TestCommand.Click:
                step = this._createClickStep(cmdForStep, plugin);
                // Suggest 'top' positioning for action buttons to prevent obscuring.
                // This places the popover ABOVE the button.
                break;
            case TestCommand.Text:
            case TestCommand.Upload:
                step = this._createInputStep(cmdForStep, plugin);
                break;
            case TestCommand.WaitUntilRegex:
                step = this._createWaitStep(command, plugin); // Use original command/selector for wait checks
                break;
            case TestCommand.TourNote:
                step = this._createNoteStep(cmdForStep, plugin);
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
     * Creates a driver.js step for a click command.
     *
     * @param {ITestCommand} command The click command.
     * @param {PluginParentClass} plugin The plugin instance.
     * @returns {any} A driver.js step object.
     * @private
     */
    private _createClickStep(
        command: ITestCommand,
        plugin: PluginParentClass
    ): any {
        // console.log(`Tour Step: Click - Selector: ${command.selector}`);
        const popover = {
            title: plugin.title,
            description: "Please click here to continue.",
        };

        const selector = command.selector || "";
        const selectMoleculeMatch = selector.match(
            /#navigator div\[data-label="([^"]+)"\]/
        );
        if (selectMoleculeMatch) {
            const moleculeName = selectMoleculeMatch[1];
            popover.description = `Please click on "${moleculeName}" in the Navigator panel to select it.`;
        }

        return {
            element: command.selector,
            popover: popover,
            onHighlightStarted: (element: HTMLElement) => {
                if (!element) {
                    console.error(
                        `TourManager: Element not found for selector "${command.selector}". Skipping step.`
                    );
                    if (this.driver) {
                        this.driver.moveNext();
                    }
                    return;
                }
                const oneTimeClickListener = () => {
                    element.removeEventListener("click", oneTimeClickListener);
                    if (this.driver) {
                        this.driver.moveNext();
                    }
                };
                element.addEventListener("click", oneTimeClickListener);
            },
            onHighlighted: (element: HTMLElement) => {
                this._setFocus(element);
            },
        };
    }

    /**
     * Finds the user argument corresponding to a selector and refines the selector to target the specific input element.
     *
     * @param {ITestCommand} command The test command containing the base selector.
     * @param {PluginParentClass} plugin The plugin instance.
     * @returns {{ userArg: UserArg | undefined, specificSelector: string }} The found user argument and the refined selector.
     * @private
     */
    private _findUserArgAndRefineSelector(
        command: ITestCommand,
        plugin: PluginParentClass
    ): { userArg: UserArg | undefined; specificSelector: string } {
        let specificSelector = command.selector!;
        let foundUserArg: UserArg | undefined;

        if (command.selector) {
            const selectorParts = command.selector.split(" ");
            const lastSelectorPart = selectorParts[selectorParts.length - 1];
            const modalSelectorPart = selectorParts.slice(0, -1).join(" ");
            const selectorStr = lastSelectorPart.replace(/^#/, "");
            const suffix = `-${plugin.pluginId}-item`;

            if (selectorStr.endsWith(suffix)) {
                const argId = selectorStr.slice(0, -suffix.length);
                foundUserArg = plugin
                    .getUserArgsFlat()
                    .find((arg) => arg.id === argId);

                if (foundUserArg) {
                    let tagName = "";
                    switch (foundUserArg.type) {
                        case UserArgType.Text:
                        case UserArgType.Number:
                        case UserArgType.Color:
                        case UserArgType.Range:
                        case UserArgType.ListSelect:
                            tagName = "input";
                            break;
                        case UserArgType.TextArea:
                            tagName = "textarea";
                            break;
                        case UserArgType.Select:
                        case UserArgType.SelectMolecule:
                        case UserArgType.SelectRegion:
                            tagName = "select";
                            break;
                    }
                    if (tagName) {
                        specificSelector = `${modalSelectorPart} ${tagName}${lastSelectorPart}`;
                    }
                } else {
                    // No direct match, check for vector components (e.g., x-dimensions)
                    const axisMatch = argId.match(/^([xyz])-/);
                    if (axisMatch) {
                        specificSelector = `${modalSelectorPart} input${lastSelectorPart}`;
                        const baseId = argId.substring(2);
                        foundUserArg = plugin
                            .getUserArgsFlat()
                            .find((arg) => arg.id === baseId);
                    }
                }
            }
        }
        return { userArg: foundUserArg, specificSelector };
    }

    /**
     * Builds a human-readable label for a form field.
     *
     * @param {UserArg | undefined} userArg The user argument object for the field.
     * @param {string} commandSelector The original selector from the command.
     * @param {string} pluginId The ID of the current plugin.
     * @returns {string} The constructed field label.
     * @private
     */
    private _buildFieldLabel(
        userArg: UserArg | undefined,
        commandSelector: string,
        pluginId: string
    ): string {
        if (userArg) {
            // Prioritize Vector3D check for specific axis labeling
            if (userArg.type === UserArgType.Vector3D) {
                const argId = commandSelector
                    .replace(/^#/, "")
                    .replace(`-${pluginId}-item`, "");
                const axisMatch = argId.match(/^([xyz])-/);
                if (axisMatch) {
                    const axis = axisMatch[1].toUpperCase();
                    const groupLabel =
                        userArg.label && userArg.label.trim() !== ""
                            ? ` of ${userArg.label.trim()}`
                            : "";
                    return `the ${axis} value${groupLabel}`;
                }
            }

            if (userArg.label && userArg.label.trim() !== "") {
                return `${userArg.label.trim()}`;
            }

            if ((userArg as any).placeHolder) {
                const placeholder = (userArg as any).placeHolder;
                const nameFromPlaceholder = placeholder
                    .split("(")[0]
                    .trim()
                    .replace(/\.\.\.$/, "")
                    .trim();
                if (nameFromPlaceholder) {
                    return `${nameFromPlaceholder}`;
                }
            }
        }
        return "this input";
    }

    /**
     * Creates a driver.js step for a text input or file upload command.
     *
     * @param {ITestCommand} command The input command.
     * @param {PluginParentClass} plugin The plugin instance.
     * @returns {any} A driver.js step object.
     * @private
     */
    private _createInputStep(
        command: ITestCommand,
        plugin: PluginParentClass
    ): any {
        const { userArg, specificSelector } =
            this._findUserArgAndRefineSelector(command, plugin);
        const fieldLabel = this._buildFieldLabel(
            userArg,
            command.selector!,
            plugin.pluginId
        );

        // console.log(`Tour Step: Input - Selector: ${specificSelector}`);
        const popover = {
            title: plugin.title,
            description: "",
        };

        if (command.cmd === TestCommand.Upload) {
            popover.description = `Please upload the required file for ${fieldLabel}. For this tour, we cannot automate file selection, so we will proceed automatically after a brief pause.`;
            return {
                element: specificSelector,
                popover,
                onHighlighted: (element: HTMLElement) => {
                    if (!element) {
                        console.error(
                            `TourManager: Element not found for selector "${specificSelector}". Skipping step.`
                        );
                        this.driver.moveNext();
                        return;
                    }
                    setTimeout(() => this.driver.moveNext(), 3000);
                },
            };
        }

        let valueForDisplay = command.data;
        let actionVerb = "enter";
        if (userArg?.type === UserArgType.Select) {
            actionVerb = "select";
            const options = (userArg as IUserArgSelect).options;
            const foundOption = options.find((opt) => {
                const optionVal = typeof opt === "string" ? slugify(opt) : opt.val;
                // eslint-disable-next-line eqeqeq
                return optionVal == command.data;
            });

            if (foundOption) {
                valueForDisplay =
                    typeof foundOption === "string"
                        ? foundOption
                        : foundOption.description;
            }
        }

        const descriptionParts = [
            `For ${fieldLabel}, ${actionVerb} "${valueForDisplay}".`,
        ];
        if (userArg) {
            if (userArg.description) {
                descriptionParts.push(
                    `<br><br><em>${userArg.description}</em>`
                );
            }
            if (userArg.warningFunc) {
                const warning = userArg.warningFunc(command.data);
                if (warning) {
                    descriptionParts.push(
                        `<br><br><strong class="text-danger">Warning:</strong> ${warning}`
                    );
                }
            }
        }
        popover.description = descriptionParts.join("");

        return {
            element: specificSelector,
            popover,
            onHighlightStarted: (element: HTMLInputElement) => {
                if (!element) {
                    console.error(
                        `TourManager: Element not found for selector "${specificSelector}". Skipping step.`
                    );
                    this.driver.moveNext();
                    return;
                }
                const oneTimeInputListener = () => {
                    // Use == for loose equality to handle cases where one is a number and the other is a string.
                    // eslint-disable-next-line eqeqeq
                    if (element.value == command.data) {
                        element.removeEventListener(
                            "input",
                            oneTimeInputListener
                        );
                        this.driver.moveNext();
                    }
                };
                element.addEventListener("input", oneTimeInputListener);
            },
            onHighlighted: (element: HTMLInputElement) => {
                this._setFocus(element);
            },
        };
    }

    private _setFocus(element: HTMLInputElement | HTMLElement | null): void {
        if (!element) {
            console.error(
                `TourManager: Element not found for selector "${element}". Skipping step.`
            );
            return;
        }
        setTimeout(() => {
            if (typeof element.focus === "function") {
                element.focus();
            }
            if (typeof (element as any).select === "function") {
                (element as any).select();
            }
        }, FOCUS_DELAY); // Delay to ensure focus is not stolen by the popover
    }

    /**
     * Creates a driver.js step for a wait command.
     *
     * @param {ITestCommand} command The wait command.
     * @param {PluginParentClass} plugin The plugin instance.
     * @returns {any} A driver.js step object.
     * @private
     */
    private _createWaitStep(
        command: ITestCommand,
        plugin: PluginParentClass
    ): any {
        // console.log(`Tour Step: Wait - Selector: ${command.selector}`);
        return {
            popover: {
                title: plugin.title,
                description: "Waiting for the application to update...",
            },
            isWaitStep: true,
            waitCondition: () => {
                const el = document.querySelector(command.selector!) as any;
                if (!el) return false;
                // Match Python runner logic: check value first, then innerHTML
                // This allows regex checks against HTML tags (e.g. "<svg") which textContent strips out.
                const textToCheck = (el.value !== undefined && el.value !== "") ? el.value : el.innerHTML;
                return new RegExp(command.data).test(textToCheck || "");
            },
        };
    }

    /**
     * Creates a driver.js step for a tour note command.
     *
     * @param {ITestCommand} command The tour note command.
     * @param {PluginParentClass} plugin The plugin instance.
     * @returns {any} A driver.js step object.
     * @private
     */
    private _createNoteStep(
        command: ITestCommand,
        plugin: PluginParentClass
    ): any {
        // console.log(`Tour Step: Note - Selector: ${command.selector}`);
        return {
            element: command.selector,
            popover: {
                title: plugin.title,
                description: command.data as string,
            },
            isNoteStep: true,
            onHighlighted: (element: HTMLElement) => {
                this._setFocus(element);
            },
        };
    }
}

export const tourManager = new TourManager();
