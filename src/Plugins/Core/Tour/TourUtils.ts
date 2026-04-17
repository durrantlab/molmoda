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
 * Finds the nearest scrollable ancestor of an element (e.g., a modal body).
 * An ancestor is considered scrollable if its scroll height exceeds its client
 * height and its overflow style permits scrolling.
 *
 * @param {HTMLElement} element The element to find the scrollable parent for.
 * @returns {HTMLElement | null} The scrollable parent, or null if none found.
 */
export function findScrollableParent(element: HTMLElement): HTMLElement | null {
    let parent = element.parentElement;
    while (parent) {
        const style = getComputedStyle(parent);
        const overflowY = style.overflowY;
        const isScrollable =
            (overflowY === "auto" || overflowY === "scroll") &&
            parent.scrollHeight > parent.clientHeight;
        if (isScrollable) {
            return parent;
        }
        parent = parent.parentElement;
    }
    return null;
}

/**
 * Checks if an element is visible within its nearest scrollable ancestor.
 *
 * @param {HTMLElement} el The element to check.
 * @param {HTMLElement} scrollParent The scrollable ancestor container.
 * @returns {boolean} True if the element is visible within the scroll container.
 */
export function isElementVisibleInScrollParent(
    el: HTMLElement,
    scrollParent: HTMLElement
): boolean {
    const elRect = el.getBoundingClientRect();
    const parentRect = scrollParent.getBoundingClientRect();
    return (
        elRect.top >= parentRect.top &&
        elRect.bottom <= parentRect.bottom
    );
}

/**
 * Smoothly scrolls an element into view within its nearest scrollable
 * ancestor (e.g., a modal body) and waits for the scroll to complete.
 *
 * @param {HTMLElement} element The element to scroll into view.
 * @param {HTMLElement} scrollParent The scrollable ancestor container.
 * @returns {Promise<void>} A promise that resolves when scrolling is complete.
 */
export function smoothScrollInScrollParent(
    element: HTMLElement,
    scrollParent: HTMLElement
): Promise<void> {
    return new Promise((resolve) => {
        const elRect = element.getBoundingClientRect();
        const parentRect = scrollParent.getBoundingClientRect();
        // Calculate the offset needed to center the element within the
        // scroll container, then apply it as a smooth scroll.
        const elCenter = elRect.top + elRect.height / 2;
        const parentCenter = parentRect.top + parentRect.height / 2;
        const offset = elCenter - parentCenter;
        scrollParent.scrollBy({ top: offset, behavior: "smooth" });

        // Wait for the scroll position to stabilize.
        let lastScrollTop = scrollParent.scrollTop;
        let stableFrames = 0;
        const checkStability = () => {
            if (Math.abs(scrollParent.scrollTop - lastScrollTop) < 1) {
                stableFrames++;
            } else {
                stableFrames = 0;
            }
            lastScrollTop = scrollParent.scrollTop;
            if (stableFrames > 15) {
                resolve();
            } else {
                requestAnimationFrame(checkStability);
            }
        };
        requestAnimationFrame(checkStability);
        // Fallback timeout
        setTimeout(resolve, 2000);
    });
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
            // Debug: log each poll attempt so we can see when an element
            // is missing vs. present-but-hidden, and detect repeated calls.
            if (isLocalHost) {
                console.log(
                    `[waitForElement] selector="${selector}", found=${!!element}, visible=${!!isVisible}`
                );
            }
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