import { PopupVariant } from "../Popups/InterfacesAndEnums";

/**
 * Defines the structure for a single toast notification.
 */
export interface IToast {
    id: string;
    title: string;
    message: string;
    variant: PopupVariant;
    timestamp: string;
}
