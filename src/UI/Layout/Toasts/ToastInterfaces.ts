import { IToastOptions, PopupVariant } from "../Popups/InterfacesAndEnums";
/**
 * Defines the structure for a single toast notification.
 */
export interface IToast extends IToastOptions {
    id: string;
    title: string;
    message: string;
    variant: PopupVariant;
    timestamp: string;
    callBack?: () => void; // Optional callback function to execute when the toast is clicked
}
