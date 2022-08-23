import { PluginParent } from "./PluginParent";

export abstract class PopupPluginParent extends PluginParent {
    abstract intro: string;
    public open = false;

    // In some cases, it is necessary to pass information to the plugin when it
    // opens. Typicaly when using the plugin outside the menu system.
    protected payload = undefined;

    /**
     * Filters user input to match desired format.
     * @param {any} userInput  The text to evaluate.
     * @returns The filtered value.
     */
    public filterUserData(userInput: any): any {
        // Can be optionally overwritten.
        return userInput;
    }

    /**
     * If the user data is a properly formatted, enable the button. Otherwise,
     * disabled.
     * @param {any} userInput  The user input to evaluate.
     * @returns A boolean value, whether to disable the button.
     */
    public isBtnEnabled(userInput: any): boolean {
        // Can be optionally overwritten.
        return true;
    }

    /**
     * Runs when the popup closes via done button.
     * @param {any} userInput  The user input entered into the popup.
     * @returns void
     */
    abstract onPopupDone(userInput: any): void;

    protected closePopup(): void {
        this.open = false;
    }

    protected openPopup(): void {
        this.open = true;
    }

    protected onPopupOpen(): void {
        // can be optionally overridden.
        return;
    }

    onPluginStart(payload?: any): void {
        // Children should not overwrite this function! Use onPopupOpen instead.
        this.payload = payload;
        this.openPopup();
        this.onPopupOpen();
    }
}
