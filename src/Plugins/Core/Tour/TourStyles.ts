import { PopoverDOM } from "driver.js";
import { waitForCondition } from "../../../Core/Utils/MiscUtils";
import { isLocalHost } from "@/Core/GlobalVars";
import { FOCUS_DELAY } from "./TourConstants";
import { getElementLabel, isElementValueCorrect } from "./TourUtils";

/**
 * Injects the driver.js CSS file and custom overrides into the document head.
 */
export function injectDriverCss(): void {
    // Inject standard CSS
    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.type = "text/css";
    cssLink.href = "js/driverjs/driver.css";
    document.head.appendChild(cssLink);

    // Inject custom overrides to make the arrow blend with the Bootstrap card header/footer
    const style = document.createElement("style");
    style.innerHTML = `
   /* Enable smooth scrolling in modal bodies */
   .modal-body {
       scroll-behavior: smooth;
   }

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
 Case 2: Popover is ABOVE the element.
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
    Fix z-index to be strictly above everything, including Bootstrap modals.
    Bootstrap modals use z-index ~1050-1055, modal backdrop ~1040.
    driver.js overlay is usually around 10000+. 
    We set these to very high values to ensure they appear above modals.
   */
   div.driver-popover {
    z-index: 100000000 !important;
   }
   
   /* The overlay (dark semi-transparent background) */
   .driver-overlay {
    z-index: 99999998 !important;
   }
   
   /* The highlighted element's "stage" or cutout area */
   .driver-active-element {
    z-index: 99999999 !important;
    position: relative !important;
   }

   /* Hidden state for menu item popovers during repositioning */
   div.driver-popover.tour-menu-item-hidden {
    opacity: 0 !important;
    pointer-events: none !important;
   }
  `;
    document.head.appendChild(style);
}

/**
 * Handles wait steps by hiding the popover and polling until the condition is met.
 *
 * @param {PopoverDOM} popover The popover DOM object.
 * @param {any} state The current tour state.
 * @param {any} driver The driver.js instance.
 * @returns {boolean} True if this was a wait step (caller should return early).
 */
function handleWaitStep(
    popover: PopoverDOM,
    state: any,
    driver: any
): boolean {
    if (!state.activeStep.isWaitStep) {
        return false;
    }

    const popoverEl = popover.wrapper?.closest(
        ".driver-popover"
    ) as HTMLElement;

    if (popoverEl) {
        popoverEl.style.display = "none";
    }

    setTimeout(() => {
        waitForCondition(state.activeStep.waitCondition)
            .then(() => {
                if (
                    driver &&
                    driver.getActiveStep() === state.activeStep
                ) {
                    driver.moveNext();
                }
                return null;
            })
            .catch((err: any) => {
                throw new Error(
                    "TourManager: Error in waitForCondition:" +
                    err.message
                );
            });
    }, 0);

    return true;
}

/**
 * Handles visibility of menu item popovers during repositioning to parent elements.
 *
 * @param {HTMLElement} popoverEl The popover HTML element.
 * @param {any} activeStep The current active step.
 */
function handleMenuItemVisibility(
    popoverEl: HTMLElement,
    activeStep: any
): void {
    const elementSelector = activeStep?.element || "";
    const isRepositioned = typeof elementSelector === "string" && elementSelector.includes("data-tour-menu-highlight");

    if (isLocalHost) {
        console.log(`[Tour Debug] Menu item check: isMenuItem=${activeStep?.isMenuItem}, elementSelector="${elementSelector}", isRepositioned=${isRepositioned}`);
    }

    if (activeStep?.isMenuItem && !isRepositioned) {
        popoverEl.classList.add("tour-menu-item-hidden");
        if (isLocalHost) {
            console.log(`[Tour Debug] Hiding popover for menu item repositioning`);
        }
    } else {
        // Either not a menu item, or it's been repositioned - make sure it's visible
        popoverEl.classList.remove("tour-menu-item-hidden");
        if (activeStep?.isMenuItem && isLocalHost) {
            console.log(`[Tour Debug] Showing popover after menu item repositioning`);
        }
    }
}

/**
 * Centers the popover on screen for steps with no target element (e.g., conclusion steps).
 *
 * @param {HTMLElement} popoverEl The popover HTML element.
 * @param {PopoverDOM} popover The popover DOM object.
 * @param {any} activeStep The current active step.
 */
function handleCenterPositioning(
    popoverEl: HTMLElement,
    popover: PopoverDOM,
    activeStep: any
): void {
    const isConclusion = activeStep.tourDebugInfo === "Conclusion";
    if (!activeStep.element || isConclusion) {
        popoverEl.style.setProperty("position", "fixed", "important");
        popoverEl.style.setProperty("top", "50%", "important");
        popoverEl.style.setProperty("left", "50%", "important");
        popoverEl.style.setProperty(
            "transform",
            "translate(-50%, -50%)",
            "important"
        );
        popoverEl.style.setProperty("margin", "0", "important");
        if (popover.arrow) {
            popover.arrow.style.display = "none";
        }
    }
}

/**
 * Applies Bootstrap card styling to the popover and its subcomponents.
 *
 * @param {HTMLElement} popoverEl The popover HTML element.
 * @param {PopoverDOM} popover The popover DOM object.
 */
function applyBootstrapStyling(
    popoverEl: HTMLElement,
    popover: PopoverDOM
): void {
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
        popover.arrow.style.filter =
            "drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.3))";
    }

    if (popover.footer) {
        popover.footer.classList.add(
            "card-footer",
            "d-flex",
            "justify-content-between",
            "align-items-center",
            "py-2",
            "px-3"
        );
        popover.footer.classList.remove("driver-popover-footer");
    }
}

/**
 * Enhances the popover description for click steps by including the target element's label,
 * and rewrites descriptions for input steps where the value is already correct.
 *
 * @param {PopoverDOM} popover The popover DOM object.
 * @param {any} activeStep The current active step.
 */
function enhanceDescription(
    popover: PopoverDOM,
    activeStep: any
): void {
    if (!popover.description) {
        return;
    }

    popover.description.classList.add("card-body", "p-3");

    // Enhance generic click messages by including the text of the target element.
    if (
        activeStep?.isClickStep &&
        popover.description.innerText.trim() === "Please click here to continue."
    ) {
        const selector = activeStep.element;
        if (typeof selector === "string") {
            const element = document.querySelector(selector) as HTMLElement;
            if (element) {
                const text = getElementLabel(element);
                // Update the message if we found a reasonable short label
                if (text.length > 0 && text.length < 30) {
                    popover.description.innerHTML = `Please click "<b>${text}</b>" to continue.`;
                }
            }
        }
    }

    // Rewrite description for input/select steps where the value is already correct.
    const selector = activeStep.element;
    if (activeStep?.expectedValue !== undefined && typeof selector === "string") {
        const element = document.querySelector(selector) as HTMLElement;

        if (isElementValueCorrect(element, activeStep.expectedValue)) {
            const originalDesc = popover.description.innerHTML;

            // Rewrite the description to indicate the value is already correct
            const prefixRegex = /^(For .*, (?:enter|select) ".*"\.)/;
            const match = originalDesc.match(prefixRegex);

            if (match) {
                const originalSentence = match[1];
                // Extract the field label and value from the original sentence
                const partsMatch = originalSentence.match(/^For (.*), (?:enter|select) "(.*)"\./);
                if (partsMatch) {
                    const fieldLabel = partsMatch[1];
                    const value = partsMatch[2];
                    const newSentence = `${fieldLabel} is currently set to "${value}". For this tour, we will leave it as is.`;
                    popover.description.innerHTML = originalDesc.replace(originalSentence, newSentence);
                }
            } else {
                // Fallback if the regex doesn't match the standard description pattern
                if (!originalDesc.includes("leave it as is")) {
                    popover.description.innerHTML += ` <br>This value is already set correctly. For this tour, we will leave it as is.`;
                }
            }
        }
    }
}

/**
 * Configures the navigation buttons (Next/Done, Previous, Close) for the popover.
 *
 * @param {PopoverDOM} popover The popover DOM object.
 * @param {any} activeStep The current active step.
 * @param {any} driver The driver.js instance.
 * @param {() => void} onCompleted Callback when the tour is completed via "Done".
 */
function configureButtons(
    popover: PopoverDOM,
    activeStep: any,
    driver: any,
    onCompleted: () => void
): void {
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

        const isLastStep = !driver.hasNextStep();
        if (isLastStep) {
            popover.nextButton.innerText = "Done";
            popover.nextButton.addEventListener("click", () => {
                onCompleted();
            });
        }

        const showNext = shouldShowNextButton(activeStep);

        if (!showNext) {
            popover.nextButton.style.display = "none";
        } else {
            popover.nextButton.style.display = "inline-block";
            if (activeStep?.isNoteStep || (showNext && activeStep?.expectedValue !== undefined)) {
                setTimeout(() => {
                    popover.nextButton.focus();
                }, FOCUS_DELAY);
            }
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

    setTimeout(() => {
        if (document.activeElement === popover.closeButton) {
            (document.activeElement as HTMLElement).blur();
        }
    }, FOCUS_DELAY);
}

/**
 * Determines whether the "Next" button should be visible for the current step.
 * Click and wait steps hide it (they advance automatically), input steps hide it
 * unless the value is already correct, and note steps always show it.
 *
 * @param {any} activeStep The current active step.
 * @returns {boolean} True if the Next button should be shown.
 */
function shouldShowNextButton(activeStep: any): boolean {
    if (activeStep?.isNoteStep) {
        return true;
    }

    if (activeStep?.isClickStep || activeStep?.isWaitStep) {
        return false;
    }

    if (activeStep?.onHighlightStarted) {
        // Interactive step (input/upload). Hidden by default.
        if (activeStep.expectedValue !== undefined) {
            const selector = activeStep.element;
            if (typeof selector === "string") {
                const element = document.querySelector(selector) as HTMLElement;
                if (isElementValueCorrect(element, activeStep.expectedValue)) {
                    return true;
                }
            }
        }
        return false;
    }

    return true;
}

/**
 * Handles the rendering of the popover by applying Bootstrap classes,
 * enhancing descriptions, and configuring navigation buttons.
 *
 * @param {PopoverDOM} popover The popover DOM object from driver.js.
 * @param {any} state The current state of the tour step.
 * @param {any} driver The driver.js instance.
 * @param {() => void} onCompleted Callback when the tour is marked as completed via "Done" button.
 */
export function handlePopoverRender(
    popover: PopoverDOM,
    { state }: { state: any },
    driver: any,
    onCompleted: () => void
): void {
    if (isLocalHost) {
        console.log(`[Tour Debug] handlePopoverRender called, activeStep:`, {
            element: state.activeStep?.element,
            isWaitStep: state.activeStep?.isWaitStep,
            isClickStep: state.activeStep?.isClickStep,
            isNoteStep: state.activeStep?.isNoteStep,
            isMenuItem: state.activeStep?.isMenuItem,
            tourDebugInfo: state.activeStep?.tourDebugInfo,
        });
    }

    if (handleWaitStep(popover, state, driver)) {
        return;
    }

    const popoverEl = popover.wrapper?.closest(
        ".driver-popover"
    ) as HTMLElement;

    if (!popoverEl) return;

    handleMenuItemVisibility(popoverEl, state.activeStep);
    handleCenterPositioning(popoverEl, popover, state.activeStep);
    applyBootstrapStyling(popoverEl, popover);
    enhanceDescription(popover, state.activeStep);
    configureButtons(popover, state.activeStep, driver, onCompleted);
}