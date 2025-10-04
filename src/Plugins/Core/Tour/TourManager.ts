import { dynamicImports } from "@/Core/DynamicImports";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { ITest, ITestCommand, TestCommand } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { waitForCondition } from "../../../Core/Utils/MiscUtils";
import { PopoverDOM } from "driver.js";
import { openPluginCmds } from "@/Testing/TestCmd";
import { processMenuPath } from "@/UI/Navigation/Menu/Menu";
import { UserArg, UserArgType } from "@/UI/Forms/FormFull/FormFullInterfaces";

/**
 * Manages the creation and execution of interactive tours using driver.js,
 * powered by the plugin testing infrastructure.
 */
class TourManager {
    private driver: any = null;
    private isRunning = false;
    private lastHighlightedElement: HTMLElement | null = null;

    /**
     * Injects the driver.js CSS file into the document head.
     * @private
     */
    private _injectDriverCss(): void {
        const cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.type = "text/css";
        cssLink.href = "js/driverjs/driver.css";
        document.head.appendChild(cssLink);
    }
    /**
     * Initializes the TourManager, loading driver.js and configuring it to
     * dynamically apply Bootstrap 5 classes to the popovers.
     *
     * @return {Promise<void>} A promise that resolves when driver.js is loaded.
     */
    private async initializeDriver(): Promise<void> {
        if (this.driver) {
            return;
        }
        const driverJsModule = await dynamicImports.driverJs.module;
        // I struggled to get this to work via import in DynamicImports, so just
        // load the CSS directly here.
        const cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.type = "text/css";
        cssLink.href = "js/driverjs/driver.css";
        document.head.appendChild(cssLink);
        this.driver = driverJsModule({
            showProgress: true,
            overlayOpacity: 0.0, // Make overlay less intrusive
            popoverOffset: 0, // Reduce space between popover and element
            onHighlightStarted: (element: HTMLElement) => {
                if (element) {
                    element.style.setProperty("outline", "3px solid #0d6efd");
                    element.style.setProperty("outline-offset", "2px");
                    element.style.setProperty("border-radius", "4px");
                    this.lastHighlightedElement = element;
                }
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
                // If it's a custom wait step, handle auto-advance here.
                if (state.activeStep.isWaitStep) {
                    setTimeout(() => {
                        waitForCondition(state.activeStep.waitCondition)
                            .then(() => {
                                if (
                                    this.driver &&
                                    this.driver.getActiveStep() ===
                                        state.activeStep
                                ) {
                                    this.driver.moveNext();
                                }
                                return null;
                            })
                            .catch((err: any) => {
                                console.error(
                                    "TourManager: Error in waitForCondition:",
                                    err
                                );
                            });
                    }, 0);
                }

                // This hook runs every time a popover is shown.
                // 'popover' is the PopoverDOM object with references to the elements.

                const popoverEl = popover.wrapper?.closest(".driver-popover");
                if (!popoverEl) return;

                // Wrap in timeout because otherwise some classes get overwritten by
                // driver.js after this hook runs.
                setTimeout(() => {
                    // Apply Bootstrap card styling and adjust padding
                    popoverEl.classList.add("card", "shadow-lg", "p-0");

                    if (popover.title) {
                        popover.title.classList.add(
                            "card-header",
                            "py-2",
                            // "px-3",
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
                        // driver.js seems to overwrite the arrow's classes/styles after this
                        // hook. Using a setTimeout defers our class addition until after
                        // driver.js has finished its synchronous rendering, ensuring our
                        // class is applied last.
                        popover.arrow?.classList.add("border-primary");
                    }

                    if (popover.description) {
                        popover.description.classList.add("card-body", "p-3");
                    }

                    if (popover.footer) {
                        popover.footer.classList.add(
                            "card-footer",
                            "d-flex",
                            "justify-content-end", // Align buttons to the right
                            "align-items-center",
                            "py-2",
                            "px-3"
                        );
                        popover.footer.classList.remove(
                            "driver-popover-footer"
                        );
                    }

                    if (popover.previousButton) {
                        // Always hide the "Previous" button as requested.
                        popover.previousButton.style.display = "none";
                    }

                    if (popover.nextButton) {
                        popover.nextButton.classList.add(
                            "btn",
                            "btn-sm",
                            "btn-primary",
                            "ms-1"
                        );
                        // Show "Next" button only for steps that do not auto-advance.
                        // Auto-advancing steps are interactive ones with `onHighlightStarted`,
                        // or our custom `isWaitStep`.
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
                        popover.closeButton.innerHTML = ""; // Remove default text
                        popover.closeButton.classList.add(
                            "btn-close",
                            "btn-close-white"
                        );
                        if (popover.title) {
                            popover.title.appendChild(popover.closeButton);
                        }
                    }
                }, 0);
            },
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
        this._processCommandList(test.beforePluginOpens, plugin, steps);
        this._addPluginOpeningSteps(plugin, steps);
        this._processCommandList(test.pluginOpen, plugin, steps);
        this._processCommandList(test.closePlugin, plugin, steps);
        this._processCommandList(test.afterPluginCloses, plugin, steps);
        // Add conclusion step
        steps.push({
            popover: {
                title: "Tour Complete!",
                description: `You've completed the tour for the ${plugin.title} plugin. You can now close this message.`,
            },
        });
        return steps;
    }

    /**
     * Processes a command list function, converting its commands to tour steps.
     *
     * @param {Function | undefined} commandListFunc The function that returns a TestCmdList.
     * @param {PluginParentClass} plugin The plugin instance.
     * @param {any[]} steps The array of steps to populate.
     * @private
     */
    private _processCommandList(
        commandListFunc: (() => TestCmdList) | undefined,
        plugin: PluginParentClass,
        steps: any[]
    ) {
        if (typeof commandListFunc !== "function") return;
        const testCmdList = commandListFunc();
        if (testCmdList instanceof TestCmdList) {
            for (const command of testCmdList.cmds) {
                const step = this._commandToDriverStep(command, plugin);
                if (step) {
                    steps.push(step);
                }
            }
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
        const menuPathInfo = processMenuPath(plugin.menuPath);
        const menuTexts = menuPathInfo
            ? menuPathInfo.map((info) =>
                  info.text.replace(/(\.\.\.|_)/g, "").trim()
              )
            : [];
        let menuTextIndex = 0;
        for (const command of openCmds) {
            const step = this._commandToDriverStep(command, plugin);
            if (step) {
                if (step.popover) {
                    console.log(
                        `Tour Step: Open Plugin - Selector: ${command.selector}`
                    );
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
        }
    }

    /**
     * Converts a single ITestCommand into a driver.js step object by dispatching to helper methods.
     *
     * @param {ITestCommand} command The test command.
     * @param {PluginParentClass} plugin The plugin instance.
     * @returns {any | null} A driver.js step object or null for non-interactive commands.
     * @private
     */
    private _commandToDriverStep(
        command: ITestCommand,
        plugin: PluginParentClass
    ): any | null {
        switch (command.cmd) {
            case TestCommand.Click:
                return this._createClickStep(command, plugin);
            case TestCommand.Text:
            case TestCommand.Upload:
                return this._createInputStep(command, plugin);
            case TestCommand.WaitUntilRegex:
                return this._createWaitStep(command, plugin);
            case TestCommand.TourNote:
                return this._createNoteStep(command, plugin);
            default:
                // Commands like Wait are not interactive and can be skipped in a user tour.
                return null;
        }
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
        console.log(`Tour Step: Click - Selector: ${command.selector}`);
        return {
            element: command.selector,
            popover: {
                title: plugin.title,
                description: "Please click here to continue.",
            },
            onHighlightStarted: (element: HTMLElement) => {
                if (!element) {
                    console.error(
                        `TourManager: Element not found for selector "${command.selector}". Skipping step.`
                    );
                    this.driver.moveNext();
                    return;
                }
                setTimeout(() => {
                    element.focus();
                }, 0);
                const oneTimeClickListener = () => {
                    element.removeEventListener("click", oneTimeClickListener);
                    this.driver.moveNext();
                };
                element.addEventListener("click", oneTimeClickListener);
            },
        };
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
        let fieldLabel = "this field";
        let specificSelector = command.selector!;
        if (command.selector) {
            const selectorParts = command.selector.split(" ");
            const lastSelectorPart = selectorParts[selectorParts.length - 1];
            const modalSelectorPart = selectorParts.slice(0, -1).join(" ");
            const selectorStr = lastSelectorPart.replace(/^#/, "");
            const suffix = `-${plugin.pluginId}-item`;
            if (selectorStr.endsWith(suffix)) {
                const argId = selectorStr.slice(0, -suffix.length);
                // First, try a direct match
                const userArg = plugin
                    .getUserArgsFlat()
                    .find((arg) => arg.id === argId);
                if (userArg) {
                    // Determine tag name for more specific selector
                    let tagName = "";
                    switch (userArg.type) {
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
                    // Direct match found
                    if (userArg.label && userArg.label.trim() !== "") {
                        fieldLabel = `the "${userArg.label.trim()}" field`;
                    } else if ((userArg as any).placeHolder) {
                        const placeholder = (userArg as any).placeHolder;
                        let nameFromPlaceholder = placeholder
                            .split("(")[0]
                            .trim();
                        nameFromPlaceholder = nameFromPlaceholder
                            .replace(/\.\.\.$/, "")
                            .trim();
                        if (nameFromPlaceholder) {
                            fieldLabel = `the "${nameFromPlaceholder}" field`;
                        }
                    }
                } else {
                    // No direct match, check for vector components (e.g., x-dimensions)
                    const axisMatch = argId.match(/^([xyz])-/);
                    if (axisMatch) {
                        specificSelector = `${modalSelectorPart} input${lastSelectorPart}`;
                        const axis = axisMatch[1]; // 'x', 'y', or 'z'
                        const baseId = argId.substring(2); // e.g., 'dimensions'
                        const vectorUserArg = plugin
                            .getUserArgsFlat()
                            .find((arg) => arg.id === baseId);
                        if (
                            vectorUserArg &&
                            vectorUserArg.type === UserArgType.Vector3D
                        ) {
                            const groupLabel =
                                vectorUserArg.label &&
                                vectorUserArg.label.trim() !== ""
                                    ? `of the "${vectorUserArg.label.trim()}" field`
                                    : "of the field";
                            fieldLabel = `the ${axis.toUpperCase()} value ${groupLabel}`;
                        }
                    }
                }
            }
        }
        console.log(`Tour Step: Input - Selector: ${specificSelector}`);
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
        popover.description = `Please enter "${command.data}" as ${fieldLabel}.`;
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
                setTimeout(() => {
                    element.focus();
                    if (typeof element.select === "function") {
                        element.select();
                    }
                }, 0);
                const oneTimeInputListener = () => {
                    if (element.value === command.data) {
                        element.removeEventListener(
                            "input",
                            oneTimeInputListener
                        );
                        this.driver.moveNext();
                    }
                };
                element.addEventListener("input", oneTimeInputListener);
            },
        };
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
        console.log(`Tour Step: Wait - Selector: ${command.selector}`);
        return {
            popover: {
                title: plugin.title,
                description: "Waiting for the application to update...",
            },
            isWaitStep: true,
            waitCondition: () => {
                const el = document.querySelector(command.selector!);
                return (
                    !!el && new RegExp(command.data).test(el.textContent || "")
                );
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
        console.log(`Tour Step: Note - Selector: ${command.selector}`);
        return {
            element: command.selector,
            popover: {
                title: plugin.title,
                description: command.data as string,
            },
            onHighlightStarted: (element: HTMLElement) => {
                setTimeout(() => {
                    if (element && typeof element.focus === "function") {
                        element.focus();
                    }
                }, 0);
            },
        };
    }
}

export const tourManager = new TourManager();
