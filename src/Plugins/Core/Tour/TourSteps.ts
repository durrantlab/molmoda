import {
    IUserArgSelect,
    UserArg,
    UserArgType,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { ITestCommand, TestCommand } from "@/Testing/TestInterfaces";
import { slugify } from "@/Core/Utils/StringUtils";
import { isLocalHost } from "@/Core/GlobalVars";
import { setFocus } from "./TourUtils";
import { TourManager } from "./TourManager";

/**
 * Context interface for passing tour state to step creation functions.
 */
export interface ITourContext {
    manager: TourManager;
    markCompleted: () => void;
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
        popover.description = `Please click on "${moleculeName}" in the Navigator panel to select it.`;
    }

    return {
        element: selector,
        popover: popover,
        isClickStep: true,
        onHighlighted: (element: HTMLElement) => {
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

            setTimeout(() => {
                if (context.manager.driver && context.manager.driver.refresh) {
                    if (isLocalHost) {
                        console.log(`[Tour Debug] Calling driver.refresh() for selector "${selector}"`);
                    }
                    context.manager.driver.refresh();
                }
            }, 1000);

            setFocus(element);

            const oneTimeClickListener = () => {
                element.removeEventListener("click", oneTimeClickListener);

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

            element.addEventListener("click", oneTimeClickListener);
        },
    };
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
                context.manager.driver.moveNext();
                return;
            }

            const oneTimeInputListener = () => {
                // eslint-disable-next-line eqeqeq
                if (element.value == command.data) {
                    element.removeEventListener("input", oneTimeInputListener);
                    context.manager.driver.moveNext();
                }
            };
            element.addEventListener("input", oneTimeInputListener);
        },
        onHighlighted: (element: HTMLInputElement) => {
            setFocus(element);
        },
    };
}

/**
 * Creates a driver.js step for a wait command.
 *
 * @param {ITestCommand} command The wait command.
 * @param {PluginParentClass} plugin The plugin instance.
 * @returns {any} A driver.js step object.
 */
export function createWaitStep(
    command: ITestCommand,
    plugin: PluginParentClass
): any {
    return {
        popover: {
            title: plugin.title,
            description: "Waiting for the application to update...",
        },
        isWaitStep: true,
        waitCondition: () => {
            const el = document.querySelector(command.selector!) as any;
            if (!el) return false;
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
        mainText = `Use this widget to choose which <b>${targetDescription}</b> to include. You can select <b>visible</b> (default), <b>selected</b>, or <b>all</b> molecules. The summary text below updates to indicate exactly what will be processed.`;
    }

    const label = arg.label || "Parameter";
    if (mainText === "") {
        mainText = `Set ${label}.`;
    }
    const description = arg.description
        ? `<br><br><em>${arg.description}</em>`
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