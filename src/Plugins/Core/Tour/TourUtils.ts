import { isLocalHost } from "@/Core/GlobalVars";
import { FOCUS_DELAY } from "./TourConstants";

/**
 * Checks if an element is fully visible in the viewport.
 *
 * @param {HTMLElement} el The element to check.
 * @returns {boolean} True if the element is fully visible in the viewport.
 */
export function isElementInViewport(el: HTMLElement): boolean {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <=
        (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Smoothly scrolls an element into view and waits for the scroll to complete.
 * Uses position stability check to ensure animations/scrolls are finished.
 *
 * @param {HTMLElement} element The element to scroll into view.
 * @returns {Promise<void>} A promise that resolves when scrolling is complete.
 */
export function smoothScrollIntoView(element: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
        element.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
        });

        let lastRect = element.getBoundingClientRect();
        let stableFrames = 0;

        const checkStability = () => {
            const currentRect = element.getBoundingClientRect();
            // Check if the element has stopped moving
            if (
                Math.abs(currentRect.top - lastRect.top) < 1 &&
                Math.abs(currentRect.left - lastRect.left) < 1
            ) {
                stableFrames++;
            } else {
                stableFrames = 0;
            }
            lastRect = currentRect;

            // Wait for ~15 frames (approx 250ms at 60fps) of stability
            if (stableFrames > 15) {
                resolve();
            } else {
                requestAnimationFrame(checkStability);
            }
        };

        requestAnimationFrame(checkStability);

        // Fallback timeout in case requestAnimationFrame stalls or takes too long
        setTimeout(resolve, 2000);
    });
}

/**
 * Waits for an element's position to stabilize (stop moving).
 * This is useful for waiting for modal animations, CSS transitions, etc.
 *
 * @param {HTMLElement} element The element to monitor.
 * @param {number} [stableFramesRequired=10] Number of stable frames required (at 60fps, 10 frames ≈ 167ms).
 * @param {number} [timeout=1000] Maximum time to wait in milliseconds.
 * @returns {Promise<void>} A promise that resolves when the element is stable.
 */
export function waitForElementStability(
    element: HTMLElement,
    stableFramesRequired = 10,
    timeout = 1000
): Promise<void> {
    return new Promise((resolve) => {
        let lastRect = element.getBoundingClientRect();
        let stableFrames = 0;
        const startTime = Date.now();

        const checkStability = () => {
            // Timeout fallback
            if (Date.now() - startTime > timeout) {
                if (isLocalHost) {
                    console.log(`[Tour Debug] waitForElementStability: timeout reached, proceeding`);
                }
                resolve();
                return;
            }

            const currentRect = element.getBoundingClientRect();
            // Check if the element has stopped moving
            if (
                Math.abs(currentRect.top - lastRect.top) < 1 &&
                Math.abs(currentRect.left - lastRect.left) < 1 &&
                Math.abs(currentRect.width - lastRect.width) < 1 &&
                Math.abs(currentRect.height - lastRect.height) < 1
            ) {
                stableFrames++;
            } else {
                stableFrames = 0;
            }
            lastRect = currentRect;

            if (stableFrames >= stableFramesRequired) {
                if (isLocalHost) {
                    console.log(`[Tour Debug] waitForElementStability: element stable after ${stableFrames} frames`);
                }
                resolve();
            } else {
                requestAnimationFrame(checkStability);
            }
        };

        requestAnimationFrame(checkStability);
    });
}

/**
 * Waits for a DOM element to appear and be visible, retrying every 250ms for up to 2 seconds.
 *
 * @param {string} selector The CSS selector for the element.
 * @param {number} [timeout=2000] The total time to wait in milliseconds.
 * @param {number} [interval=250] The time between retries in milliseconds.
 * @returns {Promise<HTMLElement>} A promise that resolves with the element or rejects with an error.
 */
export function waitForElement(
    selector: string,
    timeout = 2000,
    interval = 250
): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const check = () => {
            // If the selector targets multiple items (like with comma), verify at least one exists
            const element = document.querySelector(selector) as HTMLElement;
            // Ensure element exists AND is visible/rendered
            const isVisible =
                element &&
                (element.offsetWidth > 0 ||
                    element.offsetHeight > 0 ||
                    element.getClientRects().length > 0);

            if (isVisible) {
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                reject(
                    new Error(
                        `TourManager: Element not found or not visible for selector "${selector}" after ${timeout}ms.`
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
 * Sets focus to the specified element after a brief delay.
 *
 * @param {HTMLInputElement | HTMLElement | null} element The element to focus.
 */
export function setFocus(element: HTMLInputElement | HTMLElement | null): void {
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
 * Extracts a human-readable label from an HTML element.
 *
 * @param {HTMLElement} element The element to extract the label from.
 * @returns {string} The extracted label, or an empty string if none found.
 */
export function getElementLabel(element: HTMLElement): string {
    let text =
        element.innerText ||
        element.textContent ||
        (element as HTMLInputElement).value ||
        element.getAttribute("aria-label") ||
        element.getAttribute("title") ||
        element.getAttribute("data-bs-original-title") ||
        "";

    text = text.replace(/\s+/g, " ").trim();
    return text;
}

/**
 * Checks if the element's value matches the expected value.
 * Handles both standard value property and selected option text for select elements.
 * 
 * @param {HTMLElement} element The element to check.
 * @param {any} expectedValue The expected value.
 * @returns {boolean} True if the value matches.
 */
export function isElementValueCorrect(element: HTMLElement, expectedValue: any): boolean {
    if (!element) return false;
    
    // Check 'value' property (inputs, selects)
    // Use loose equality to match how inputs often store numbers as strings
    const val = (element as HTMLInputElement).value;
    // eslint-disable-next-line eqeqeq
    if (val == expectedValue) return true;

    // For Select elements, also check the text of the selected option
    if (element.tagName.toLowerCase() === 'select') {
        const select = element as HTMLSelectElement;
        if (select.selectedIndex >= 0) {
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption) {
                const text = selectedOption.text.trim();
                 // eslint-disable-next-line eqeqeq
                if (text == expectedValue) return true;
            }
        }
    }
    
    return false;
}