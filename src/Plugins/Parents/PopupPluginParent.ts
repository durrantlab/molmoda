import { PluginParent } from "./PluginParent/PluginParent";

/**
 * PopupPluginParent
 */
export abstract class PopupPluginParent extends PluginParent {
    abstract intro: string;
    public open = false;

    // In some cases, must pass information to the plugin when it opens.
    // Typicaly when using the plugin outside the menu system.
    protected payload: any = undefined;

    /**
     * Filters user input to match desired format.
     * 
     * @param {any} userInput  The text to assess.
     * @returns {any} The filtered value.
     */
    public filterUserData(userInput: any): any {
        // Can be optionally overwritten.
        return userInput;
    }

    /**
     * If the user data is a properly formatted, enable the button. Otherwise,
     * disabled.
     * 
     * @param {any} _userInput  The user input to assess.
     * @returns {boolean} A boolean value, whether to disable the button.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public isBtnEnabled(_userInput?: any): boolean {
        // Can be optionally overwritten.
        return true;
    }

    /**
     * Runs when the popup closes via done button.
     * 
     * @param {any} userInput  The user input entered into the popup.
     * @returns void
     */
    abstract onPopupDone(userInput?: any): void;

    /**
     * Closes the popup.
     */
    protected closePopup() {
        this.open = false;
    }

    /**
     * Opens the popup.
     */
    protected openPopup(): void {
        this.open = true;
    }

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open). Will almost always need this, so
     * requiring children to define it.
     */
    abstract beforePopupOpen(): void;

    /**
     * Runs after the popup opens. Good for setting focus in text elements.
     */
    protected onPopupOpen() {
        // can be optionally overridden.
        return;
    }

    /**
     * Runs when the user first starts the plugin. For example, if the plugin is
     * in a popup, this function would open the popup. 
     *
     * @param {any} [payload]   Included if you want to pass extra data to the
     *                          plugin. Probably only useful if not using the
     *                          menu system. Optional.
     */
    onPluginStart(payload?: any): void {
        // Children should not overwrite this function! Use onPopupOpen instead.
        this.payload = payload;
        this.beforePopupOpen();
        this.openPopup();
        setTimeout(() => {
            this.onPopupOpen();
        }, 1000)
    }
}
