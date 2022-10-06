import { PluginParentRenderless } from "../PluginParentComponent/PluginParentRenderless";
import { Prop, Watch } from "vue-property-decorator";

/**
 * PopupPluginParent
 */
export abstract class PopupPluginParentRenderless extends PluginParentRenderless {
    // abstract intro: string; //  = "";
    // public open = false;


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
     * Runs when the popup closes via done button. Children must overwrite this.
     *
     * @param {any} userInput  The user input entered into the popup.
     */
    abstract onPopupDone(userInput?: any): void;

    // /**
    //  * Closes the popup.
    //  */
    // protected closePopup() {
    //     this.open = false;
    // }

    // /**
    //  * Opens the popup.
    //  */
    // protected openPopup(): void {
    //     this.open = true;
    // }

    /**
     * Runs before the popup opens. Good for initializing/resenting variables
     * (e.g., clear inputs from previous open). Will almost always need this, so
     * requiring children to define it.
     */
    // abstract beforePopupOpen(): void;




}
