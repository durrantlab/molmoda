import { dynamicImports } from "@/Core/DynamicImports";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { ITest, ITestCommand, TestCommand } from "@/Testing/TestInterfaces";
import { TestCmdList } from "@/Testing/TestCmdList";
import { waitForCondition } from "../Utils/MiscUtils";
import { PopoverDOM } from "driver.js";
import { openPluginCmds } from "@/Testing/TestCmd";

/**
 * Manages the creation and execution of interactive tours using driver.js,
 * powered by the plugin testing infrastructure.
 */
class TourManager {
    private driver: any = null;
    private isRunning = false;

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
            onDestroyed: () => {
                this.isRunning = false;
                this.driver = null; // Reset for next tour
            },
            onPopoverRender: (
                popover: PopoverDOM,
                { state }: { state: any }
            ) => {
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
                            "ps-3", "pe-2",
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
                        // Auto-advancing steps are identified by having an `onHighlightStarted` handler.
                        if (state.activeStep?.onHighlightStarted) {
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
        const processCommandList = (
            commandListFunc: (() => TestCmdList) | undefined
        ) => {
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
        };

        processCommandList(test.beforePluginOpens);

        // Add commands to open the plugin from the menu
        const openCmds = openPluginCmds(plugin);
        for (const command of openCmds) {
            const step = this._commandToDriverStep(command, plugin);
            if (step) {
                if (step.popover) {
                    step.popover.description = `Please click here to continue the tour.`;
                }
                steps.push(step);
            }
        }

        processCommandList(test.pluginOpen);
        processCommandList(test.closePlugin);
        processCommandList(test.afterPluginCloses);

        return steps;
    }

    /**
     * Converts a single ITestCommand into a driver.js step object.
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
        const popover = {
            title: plugin.title,
            description: "",
        };
        switch (command.cmd) {
            case TestCommand.Click:
                popover.description = "Please click here to continue.";
                return {
                    element: command.selector,
                    popover,
                    onHighlightStarted: (element: HTMLElement) => {
                        if (!element) {
                            console.error(
                                `TourManager: Element not found for selector "${command.selector}". Skipping step.`
                            );
                            this.driver.moveNext();
                            return;
                        }
                        const oneTimeClickListener = () => {
                            element.removeEventListener(
                                "click",
                                oneTimeClickListener
                            );
                            this.driver.moveNext();
                        };
                        element.addEventListener("click", oneTimeClickListener);
                    },
                };
            case TestCommand.Text:
            case TestCommand.Upload:
                popover.description = `Please enter "${command.data}" into this field.`;
                if (command.cmd === TestCommand.Upload) {
                    popover.description = `Please upload the required file. For this tour, we cannot automate file selection, so we will proceed automatically after a brief pause.`;
                    // We can't interact with file dialogs, so we just show the message and move on.
                    return {
                        element: command.selector,
                        popover,
                        onHighlighted: (element: HTMLElement) => {
                            if (!element) {
                                console.error(
                                    `TourManager: Element not found for selector "${command.selector}". Skipping step.`
                                );
                                this.driver.moveNext();
                                return;
                            }
                            setTimeout(() => this.driver.moveNext(), 3000);
                        },
                    };
                }
                return {
                    element: command.selector,
                    popover,
                    onHighlightStarted: (element: HTMLInputElement) => {
                        if (!element) {
                            console.error(
                                `TourManager: Element not found for selector "${command.selector}". Skipping step.`
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
                };
            case TestCommand.WaitUntilRegex:
                // This is a non-interactive step
                return {
                    popover: {
                        ...popover,
                        description: "Waiting for the application to update...",
                    },
                    onHighlightStarted: () => {
                        waitForCondition(() => {
                            const el = document.querySelector(
                                command.selector!
                            );
                            return (
                                !!el &&
                                new RegExp(command.data).test(
                                    el.textContent || ""
                                )
                            );
                        })
                            .then(() => {
                                this.driver.moveNext();
                                return null;
                            })
                            .catch((err) => {
                                throw err;
                                console.error(
                                    "TourManager: Error in waitForCondition:",
                                    err
                                );
                            });
                    },
                };
            case TestCommand.TourNote:
                popover.description = command.data as string;
                return {
                    element: command.selector,
                    popover,
                };
            default:
                // Other commands like Wait are not interactive and can be skipped in a user tour.
                return null;
        }
    }
}

export const tourManager = new TourManager();
