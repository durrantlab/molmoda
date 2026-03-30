import {
    IUserArgSelect,
    UserArg,
    UserArgType,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { ITestCommand, TestCommand } from "@/Testing/TestInterfaces";
import { slugify } from "@/Core/Utils/StringUtils";
import { isLocalHost } from "@/Core/GlobalVars";
import { setFocus, isElementValueCorrect } from "./TourUtils";
import { TourManager } from "./TourManager";

/**
 * Context interface for passing tour state to step creation functions.
 */
export interface ITourContext {
    manager: TourManager;
    markCompleted: () => void;
}

/**
 * Builds an HTML ordered list of available options for a Select user argument.
 * Returns an empty string if the argument is not a Select type or has no options.
 *
 * @param {UserArg | undefined} userArg The user argument to extract options from.
 * @returns {string} An HTML string with the options list, or empty string.
 */
function buildSelectOptionsHtml(userArg: UserArg | undefined): string {
    if (!userArg || userArg.type !== UserArgType.Select) {
        return "";
    }
    const options = (userArg as IUserArgSelect).options;
    if (!options || options.length === 0) {
        return "";
    }
    const listItems = options.map((opt) => {
        const label = typeof opt === "string" ? opt : opt.description;
        return `<li>${label}</li>`;
    }).join("");
    return `<div class="mt-3 mb-0"><strong>Available options:</strong><ol class="mb-0">${listItems}</ol></div>`;
}

/**
 * Builds an HTML string for the description and warning of a user argument.
 * Returns an empty string if the argument has neither.
 *
 * @param {UserArg | undefined} userArg The user argument.
 * @param {any} [currentValue] The current value, used for warningFunc evaluation.
 * @returns {string} An HTML string with description and/or warning.
 */
function buildArgDetailsHtml(userArg: UserArg | undefined, currentValue?: any): string {
    if (!userArg) {
        return "";
    }
    const parts: string[] = [];
    if (userArg.description) {
        parts.push(
            `<div class="mt-3 mb-0"><strong>Brief description:</strong> <em>${userArg.description}</em></div>`
        );
    }
    if (userArg.warningFunc) {
        const warning = userArg.warningFunc(currentValue);
        if (warning) {
            parts.push(
                `<br><br><strong class="text-danger">Warning:</strong> ${warning}`
            );
        }
    }
    return parts.join("");
}

/**
 * Finds the user argument corresponding to a selector and refines the selector to target the specific input element.
 *
 * @param {ITestCommand} command The test command containing the base selector.
 * @param {PluginParentClass} plugin The plugin instance.
 * @returns {{ userArg: UserArg | undefined, specificSelector: string }} The found user argument and the refined selector.
 */
export function findUserArgAndRefineSelector(
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
                .userArgsMixin
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
                        .userArgsMixin
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
 */
export function buildFieldLabel(
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
 * Creates a driver.js step for a click command.
 *
 * @param {ITestCommand} command The click command.
 * @param {PluginParentClass} plugin The plugin instance.
 * @param {ITourContext} context The tour context.
 * @returns {any} A driver.js step object.
 */
export function createClickStep(
    command: ITestCommand,
    plugin: PluginParentClass,
    context: ITourContext
): any {
    const selector = command.selector || "";

    const popover: any = {
        title: plugin.title,
        description: "Please click here to continue.",
    };

    const selectMoleculeMatch = selector.match(
        /#navigator div\[data-label="([^"]+)"\]/
    );
    if (selectMoleculeMatch) {
        const moleculeName = selectMoleculeMatch[1];
        const action = command.tourMessage || "select it";
        popover.description = `Please click on this "${moleculeName}" item in the Navigator panel to ${action}.`;
    }

    // If a custom tour message is provided and no molecule match was found,
    // use it as the full description override.
    if (!selectMoleculeMatch && command.tourMessage) {
        popover.description = command.tourMessage;
    }

    // Detect if this is a menu item selector (inside dropdown menus or nav items)
    // These are typically positioned near the left edge and benefit from right-side popovers
    // Patterns to detect:
    // - .dropdown-menu, .dropdown-item, .nav-link (class-based)
    // - .navbar #menu1-xxx (top-level navbar menus)
    // - Selectors containing #menu followed by digits (menu item IDs)
    const isMenuItem = selector.includes(".dropdown-menu") ||
        selector.includes(".dropdown-item") ||
        selector.includes(".nav-link") ||
        selector.includes(".navbar") ||
        /#menu\d/.test(selector);

    if (isLocalHost) {
        console.log(`[Tour Debug] createClickStep: selector="${selector}", isMenuItem=${isMenuItem}`);
    }

    // For menu items, we want to highlight the parent <li> for better popover positioning,
    // but still attach the click listener to the actual menu item element.
    // We'll find the parent li dynamically in onHighlighted.
    const step: any = {
        element: selector,
        popover: popover,
        isClickStep: true,
        isMenuItem: isMenuItem,
        actualClickSelector: selector, // Store original selector for click handling
    };

    // For menu items, force the popover to appear on the right side
    // This prevents the popover from obscuring the menu item when it's near the left edge
    // Note: side/align must be at step level, not inside popover
    if (isMenuItem) {
        step.popover.side = "right";
        step.popover.align = "start";
    }

    step.onHighlighted = (element: HTMLElement) => {
        if (isLocalHost) {
            console.log(`[Tour Debug] createClickStep onHighlighted called for selector "${selector}", element:`, element);
        }

        if (!element) {
            console.error(
                `TourManager: Element not found for selector "${selector}". Skipping step.`
            );
            if (context.manager.driver) {
                context.manager.driver.moveNext();
            }
            return;
        }

        // For menu items, try to re-highlight using the parent <li> element
        // This provides better popover positioning for items near screen edges
        if (isMenuItem && context.manager.driver) {
            const parentLi = element.closest("li.nav-item, li.dropdown-item, li");
            if (parentLi && parentLi !== element) {
                if (isLocalHost) {
                    console.log(`[Tour Debug] Found parent <li> for menu item, re-highlighting:`, parentLi);
                }

                // Get current step and update its element to the parent
                const activeStep = context.manager.driver.getActiveStep();
                if (activeStep) {
                    // Temporarily add a unique attribute to target the parent
                    parentLi.setAttribute("data-tour-menu-highlight", "true");
                    activeStep.element = "[data-tour-menu-highlight='true']";

                    // Refresh to re-highlight with the new element
                    // The popover will be shown by handlePopoverRender after this refresh
                    context.manager.driver.refresh();

                    // Manually show the popover after refresh since onPopoverRender may not be called again
                    requestAnimationFrame(() => {
                        const popoverEl = document.querySelector(".driver-popover") as HTMLElement;
                        if (popoverEl) {
                            popoverEl.classList.remove("tour-menu-item-hidden");
                            if (isLocalHost) {
                                console.log(`[Tour Debug] Manually showing popover after refresh`);
                            }
                        }
                    });

                    // Clean up the attribute after a short delay
                    setTimeout(() => {
                        parentLi.removeAttribute("data-tour-menu-highlight");
                    }, 100);
                }
            }
        }

        setTimeout(() => {
            if (context.manager.driver && context.manager.driver.refresh) {
                if (isLocalHost) {
                    console.log(`[Tour Debug] Calling driver.refresh() for selector "${selector}"`);
                }
                context.manager.driver.refresh();
            }
        }, 1000);

        setFocus(element);

        // For menu items, we need to attach the click listener to the actual clickable element,
        // not the parent <li> that we're highlighting
        const clickTarget = isMenuItem
            ? (document.querySelector(selector) as HTMLElement) || element
            : element;

        const oneTimeClickListener = () => {
            clickTarget.removeEventListener("click", oneTimeClickListener);

            if (!context.manager.driver) {
                return;
            }

            const isLastStep = !context.manager.driver.hasNextStep();
            let nextStepHasNoElement = false;

            if (!isLastStep) {
                const activeIndex = context.manager.driver.getActiveIndex();
                const nextStep = context.manager.tourSteps[activeIndex + 1];
                nextStepHasNoElement = nextStep && !nextStep.element;
            }

            const needsDelayForNativeHandler = isLastStep || nextStepHasNoElement;

            if (needsDelayForNativeHandler) {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        if (context.manager.driver) {
                            if (isLastStep) {
                                context.markCompleted();
                                context.manager.driver.destroy();
                            } else {
                                context.manager.driver.moveNext();
                            }
                        }
                    }, 150);
                });
            } else {
                setTimeout(() => {
                    if (context.manager.driver) {
                        context.manager.driver.moveNext();
                    }
                }, 0);
            }
        };

        clickTarget.addEventListener("click", oneTimeClickListener);
    };

    return step;
}

/**
 * Creates a driver.js step for a text input or file upload command.
 *
 * @param {ITestCommand} command The input command.
 * @param {PluginParentClass} plugin The plugin instance.
 * @param {ITourContext} context The tour context.
 * @returns {any} A driver.js step object.
 */
export function createInputStep(
    command: ITestCommand,
    plugin: PluginParentClass,
    context: ITourContext
): any {
    const { userArg, specificSelector } = findUserArgAndRefineSelector(
        command,
        plugin
    );
    const fieldLabel = buildFieldLabel(
        userArg,
        command.selector!,
        plugin.pluginId
    );

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
                    context.manager.driver.moveNext();
                    return;
                }
                setTimeout(() => context.manager.driver.moveNext(), 3000);
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
    descriptionParts.push(buildSelectOptionsHtml(userArg));
    descriptionParts.push(buildArgDetailsHtml(userArg, command.data));
    popover.description = descriptionParts.join("");

    return {
        element: specificSelector,
        popover,
        expectedValue: command.data, // Pass expected value to step for runtime checking
        onHighlightStarted: (element: HTMLInputElement) => {
            if (!element) {
                console.error(
                    `TourManager: Element not found for selector "${specificSelector}". Skipping step.`
                );
                context.manager.driver.moveNext();
                return;
            }

            const checkAndAdvance = () => {
                if (isElementValueCorrect(element, command.data)) {
                    element.removeEventListener("input", checkAndAdvance);
                    element.removeEventListener("change", checkAndAdvance);
                    context.manager.driver.moveNext();
                }
            };
            element.addEventListener("input", checkAndAdvance);
            element.addEventListener("change", checkAndAdvance);
        },
        onHighlighted: (element: HTMLInputElement) => {
            setFocus(element);
        },
    };
}

/**
 * Creates a driver.js step for a wait command. During a tour, the step
 * polls the wait condition and auto-advances when satisfied.
 *
 * @param {ITestCommand} command The wait command.
 * @param {PluginParentClass} plugin The plugin instance.
 * @param {ITourContext} context The tour context.
 * @returns {any} A driver.js step object.
 */
export function createWaitStep(
    command: ITestCommand,
    plugin: PluginParentClass,
    context: ITourContext
): any {
    return {
        popover: {
            title: plugin.title,
            description: "Waiting for the application to update...",
        },
        isWaitStep: true,
        waitCondition: () => {
            const el = document.querySelector(command.selector!) as HTMLElement;
            if (!el) return false;
            const regex = new RegExp(command.data);
            // Check both textContent (for plain text matches) and innerHTML
            // (for markup-based matches like SVG icon attributes). textContent
            // strips tags, so regexes targeting HTML/SVG structure would fail
            // if only textContent were checked.
            const textContent = el.textContent || "";
            if (regex.test(textContent)) return true;
            const htmlContent = el.innerHTML || "";
            return regex.test(htmlContent);
        },
        /**
         * Polls the wait condition and auto-advances the tour when satisfied.
         * This fires when the step has an element to highlight. For steps
         * without an element, polling is started in TourManager.moveToNextStepWithRetry.
         * @param {HTMLElement} _element The highlighted element (unused for wait steps).
         */
        onHighlighted: (_element: HTMLElement) => {
            const pollInterval = setInterval(() => {
                // Stop polling if the tour was destroyed
                if (!context.manager.driver) {
                    clearInterval(pollInterval);
                    return;
                }

                const activeStep = context.manager.driver.getActiveStep();
                if (!activeStep || !activeStep.waitCondition) {
                    clearInterval(pollInterval);
                    return;
                }

                if (activeStep.waitCondition()) {
                    clearInterval(pollInterval);
                    context.manager.driver.moveNext();
                }
            }, 500);
        },
    };
}

/**
 * Creates a driver.js step for a tour note command.
 *
 * @param {ITestCommand} command The tour note command.
 * @param {PluginParentClass} plugin The plugin instance.
 * @returns {any} A driver.js step object.
 */
export function createNoteStep(
    command: ITestCommand,
    plugin: PluginParentClass
): any {
    return {
        element: command.selector,
        popover: {
            title: plugin.title,
            description: command.data as string,
        },
        isNoteStep: true,
        onHighlighted: (element: HTMLElement) => {
            setFocus(element);
        },
    };
}

/**
 * Creates a default driver.js step for a user argument that isn't modified in the test.
 *
 * @param {UserArg} arg The user argument.
 * @param {PluginParentClass} plugin The plugin instance.
 * @returns {any} A driver.js step object.
 */
export function createDefaultArgStep(arg: UserArg, plugin: PluginParentClass): any {
    let selector = `#${arg.id}-${plugin.pluginId}-item`;
    let mainText = "";

    if (arg.type === UserArgType.Vector3D) {
        selector = `#x-${arg.id}-${plugin.pluginId}-item`;
    } else if (arg.type === UserArgType.MoleculeInputParams) {
        // Define possible selector variations to ensure the element is found
        const baseId = `${arg.id}-${plugin.pluginId}-item`;
        const baseIdWithModal = `${arg.id}-modal-${plugin.pluginId}-item`;

        // 1. Expected ID (standard form)
        // 2. ID with 'modal-' prefix (if FormFull context differs)
        // 3. Fallback: Select element inside the container (if prop passing fails)
        selector = `#${baseId}-molecule-selection, #${baseIdWithModal}-molecule-selection, #${baseId} select`;

        let targetDescription = "molecules";
        if (arg.label && arg.label.trim() !== "") {
            targetDescription = arg.label.toLowerCase();
            const suffixesToRemove = [
                " to consider",
                " to align",
                " to use as queries",
            ];
            for (const suffix of suffixesToRemove) {
                if (targetDescription.endsWith(suffix)) {
                    targetDescription = targetDescription.substring(
                        0,
                        targetDescription.length - suffix.length
                    );
                    break;
                }
            }
        }
        if (!targetDescription.endsWith("s")) {
            targetDescription += "s";
        }
        mainText = `Use this widget to choose which <b>${targetDescription}</b> to include. You can select <b>visible</b> (default), <b>selected</b>, or <b>all</b> molecules. The summary text below updates to indicate exactly what will be processed. For this tour, simply press the "Next" button below to continue.`;
    }

    const label = arg.label || "Parameter";
    if (mainText === "") {
        mainText = `Set ${label}.`;
    }

    mainText += buildSelectOptionsHtml(arg);

    const description = arg.description
        ? `<div class="mt-3 mb-0"><strong>Brief description:</strong> <em>${arg.description}</em></div>`
        : "";

    return {
        element: selector,
        popover: {
            title: plugin.title,
            description: `${mainText}${description}`,
        },
        isNoteStep: true,
        onHighlighted: (element: HTMLElement) => {
            setFocus(element);
        },
    };
}