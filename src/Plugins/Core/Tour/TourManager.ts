import { dynamicImports } from "@/Core/DynamicImports";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { ITest, ITestCommand, TestCommand } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { waitForCondition } from "../../../Core/Utils/MiscUtils";
import { PopoverDOM } from "driver.js";
import { openPluginCmds } from "@/Testing/TestCmd";
import { processMenuPath } from "@/UI/Navigation/Menu/Menu";
import { UserArg, UserArgType } from "@/UI/Forms/FormFull/FormFullInterfaces";

const FOCUS_DELAY = 150; // ms

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
     *
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
                        console.error(
                            "TourManager: Error in waitForCondition:",
                            err
                        );
                    });
            }, 0);
        }

        const popoverEl = popover.wrapper?.closest(".driver-popover");
        if (!popoverEl) return;

        setTimeout(() => {
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
                popover.arrow?.classList.add("border-primary");
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
        }, 0);
    }

    /**
     * Configures and returns the hooks for the driver.js instance.
     * @returns {object} An object containing all the lifecycle hooks for driver.js.
     * @private
     */
    private _configureDriverHooks(): object {
        return {
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
                this._handlePopoverRender(popover, { state });
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
        this._injectDriverCss();
        this.driver = driverJsModule({
            showProgress: true,
            overlayOpacity: 0.1, // Make overlay less intrusive
            popoverOffset: 5, // Reduce space between popover and element
            ...this._configureDriverHooks(),
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

        // Special handling for the closePlugin step to make the message more informative.
        if (typeof test.closePlugin === "function") {
            const closeCmdList = test.closePlugin();
            if (closeCmdList instanceof TestCmdList) {
                for (const command of closeCmdList.cmds) {
                    const step = this._commandToDriverStep(command, plugin);
                    if (step) {
                        if (
                            step.popover &&
                            command.cmd === TestCommand.Click &&
                            command.selector?.includes(".action-btn")
                        ) {
                            // It's a click on an action button. Let's make the message more specific.
                            step.popover.description = `Click here to run the ${plugin.title} plugin.`;
                        }
                        steps.push(step);
                    }
                }
            }
        }

        this._processCommandList(test.afterPluginCloses, plugin, steps);

        // Add conclusion step
        steps.push({
            popover: {
                title: "Tour Complete!",
                description: `You have completed the tour for the ${plugin.title} plugin.`,
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
                const oneTimeClickListener = () => {
                    element.removeEventListener("click", oneTimeClickListener);
                    this.driver.moveNext();
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

        const descriptionParts = [
            `For ${fieldLabel}, use "${command.data}".`,
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
            onHighlighted: (element: HTMLElement) => {
                this._setFocus(element);
            },
        };
    }
}

export const tourManager = new TourManager();
