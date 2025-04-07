// import { openSavePluginIfStoreDirty } from "./DirtyStore";

// TODO: This is annoying. Decided not to use, but keep it commented now.

// interface ExitIntentOptions {
//     /**
//      * Distance in pixels from the top of the page to trigger exit intent
//      */
//     threshold?: number;
//     /** Maximum number of times to trigger the callback */
//     maxDisplays?: number;
//     /** Time in milliseconds between checks */
//     eventThrottle?: number;
//     /** Function to call when exit intent is detected */
//     onExitIntent?: () => void;
// }

// /**
//  * Creates an exit intent detector that triggers when the mouse moves toward the
//  * top of the window or leaves through the top edge.
//  *
//  * @param {ExitIntentOptions} options                Configuration options for
//  *                                                   exit intent detection.
//  * @param {number}            options.threshold      Distance in pixels from top
//  *                                                   to trigger (default: 10).
//  * @param {number}            options.maxDisplays    Maximum times to trigger
//  *                                                   (default: 10000).
//  * @param {number}            options.eventThrottle  Minimum ms between triggers
//  *                                                   (default: 100).
//  * @param {Function}          options.onExitIntent   Callback when exit intent
//  *                                                   detected.
//  * @returns {Function} Cleanup function to remove event listeners.
//  */
// function _createExitIntent({
//     threshold = 10,
//     maxDisplays = 10000,
//     eventThrottle = 100,
//     onExitIntent = () => {
//         return;
//     },
// }: ExitIntentOptions = {}): () => void {
//     let displayCount = 0;
//     let lastTime = 0;
//     // let lastTriggerTime = 0;
//     let exitTimer: number | null = null;
//     const exitDelay = 500; // Time mouse must stay above threshold

//     /**
//      * Throttles function calls.
//      *
//      * @param {Function} callback  Function to throttle.
//      * @returns {void}
//      */
//     const throttle = function (callback: () => void): void {
//         const now = Date.now();
//         if (now - lastTime >= eventThrottle) {
//             callback();
//             lastTime = now;
//         }
//     };

//     /**
//      * Clears the exit timer if it exists.
//      *
//      * @returns {void}
//      */
//     const clearExitTimer = function (): void {
//         if (exitTimer !== null) {
//             window.clearTimeout(exitTimer);
//             exitTimer = null;
//         }
//     };

//     /**
//      * Handles mouse movement events.
//      *
//      * @param {MouseEvent} event  Mouse event containing cursor position.
//      * @returns {void}
//      */
//     const handleMouseMove = function (event: MouseEvent): void {
//         throttle(() => {
//             if (displayCount >= maxDisplays) {
//                 return;
//             }

//             if (event.clientY <= threshold && event.clientY > 0) {
//                 // Mouse is above threshold - start timer
//                 clearExitTimer();
//                 exitTimer = window.setTimeout(() => {
//                     displayCount++;
//                     // lastTriggerTime = Date.now();
//                     onExitIntent();
//                     exitTimer = null;
//                 }, exitDelay);
//             } else {
//                 // Mouse is below threshold - clear timer
//                 clearExitTimer();
//             }
//         });
//     };

//     /**
//      * Handles mouse leave events.
//      *
//      * @param {MouseEvent} event  Mouse event containing exit position.
//      * @returns {void}
//      */
//     const handleMouseLeave = function (event: MouseEvent): void {
//         throttle(() => {
//             clearExitTimer(); // Clear any pending timer
//             if (
//                 event.clientY <= 0 && // Left through top of window
//                 displayCount < maxDisplays
//             ) {
//                 displayCount++;
//                 // lastTriggerTime = Date.now();
//                 onExitIntent();
//             }
//         });
//     };

//     // Add event listeners
//     document.addEventListener("mousemove", handleMouseMove);
//     document.addEventListener("mouseleave", handleMouseLeave);

//     // Return cleanup function
//     return () => {
//         clearExitTimer();
//         document.removeEventListener("mousemove", handleMouseMove);
//         document.removeEventListener("mouseleave", handleMouseLeave);
//     };
// }

// /**
//  * Sets up exit intent detection with default settings.
//  *
//  * @returns {Promise<void>} A promise that resolves when setup is complete.
//  */
// export async function setupExitIntent(): Promise<void> {
//     _createExitIntent({
//         threshold: 15,
//         maxDisplays: 10000,
//         eventThrottle: 15,
//         onExitIntent: () => {
//             openSavePluginIfStoreDirty(false);
//         },
//     });
// }
