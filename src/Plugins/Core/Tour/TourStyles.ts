import { PopoverDOM } from "driver.js";
import { waitForCondition } from "../../../Core/Utils/MiscUtils";
import { isLocalHost } from "@/Core/GlobalVars";
import { FOCUS_DELAY } from "./TourConstants";
import { getElementLabel } from "./TourUtils";

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
  `;
    document.head.appendChild(style);
}

/**
 * Handles the rendering of the popover by applying Bootstrap classes.
 *
 * @param {PopoverDOM} popover - The popover DOM object from driver.js.
 * @param {any} state - The current state of the tour step.
 * @param {any} driver - The driver.js instance.
 * @param {() => void} onCompleted - Callback when the tour is marked as completed via "Done" button.
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
            tourDebugInfo: state.activeStep?.tourDebugInfo,
        });
    }

    const popoverEl = popover.wrapper?.closest(
        ".driver-popover"
    ) as HTMLElement;

    if (state.activeStep.isWaitStep) {
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
        return;
    }

    if (!popoverEl) return;

    // If the step has no element target (like a modal wait step), force it to be centered.
    const isConclusion = state.activeStep.tourDebugInfo === "Conclusion";
    if (!state.activeStep.element || isConclusion) {
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

    if (popover.description) {
        popover.description.classList.add("card-body", "p-3");

        // Enhance generic click messages by including the text of the target element.
        if (
            state.activeStep?.isClickStep &&
            popover.description.innerText.trim() === "Please click here to continue."
        ) {
            const selector = state.activeStep.element;
            if (typeof selector === "string") {
                const element = document.querySelector(selector) as HTMLElement;
                if (element) {
                    const text = getElementLabel(element);
                    // Update the message if we found a reasonable short label
                    if (text.length > 0 && text.length < 30) {
                        popover.description.innerHTML = `Please click "${text}" to continue.`;
                    }
                }
            }
        }
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

        if (
            state.activeStep?.isClickStep ||
            state.activeStep?.isWaitStep ||
            state.activeStep?.onHighlightStarted
        ) {
            popover.nextButton.style.display = "none";
        } else {
            popover.nextButton.style.display = "inline-block";
            if (state.activeStep?.isNoteStep) {
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