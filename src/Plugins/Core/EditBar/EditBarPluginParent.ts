import { PopupPluginParent } from "@/Plugins/PopupPluginParent";
import {
    IMolContainer,
    SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    getAllNodesFlattened,
    getNodeOfId,
} from "@/UI/Navigation/TreeView/TreeUtils";
import { checkAnyMolSelected } from "../CheckUseAllowedUtils";

/**
 * EditBarPluginParent
 */
export default abstract class EditBarPluginParent extends PopupPluginParent {
    nodeToActOn: IMolContainer = {
        title: "",
        treeExpanded: false,
        selected: SelectedType.FALSE,
        visible: false,
        focused: false,
        viewerDirty: false,
    };

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkUseAllowed(): string | null {
        return checkAnyMolSelected(this);
    }

    /**
     * Determine which node to act on. Mostly likely the selected molecule.
     */
    protected setNodeToActOn() {
        if (this.payload) {
            // this.payload is the node id.
            const id = this.payload;
            this.nodeToActOn = getNodeOfId(
                id, this.$store.state.molecules
            ) as IMolContainer;
        } else {
            // Find the selected molecule instead.
            const nodes = getAllNodesFlattened(this.$store.state.molecules);
            this.nodeToActOn = nodes.find(
                (n) => n.selected === SelectedType.TRUE
            ) as IMolContainer;
        }

        if (!this.nodeToActOn) {
            // TODO: fix this
            alert(
                "You shouldn't be able to run this if no molecule is selected."
            );
        }
    }

    /**
     * If the user data is a properly formatted, enable the button. Otherwise,
     * disabled.
     * 
     * @param {string} val  The user input to assess.
     * @returns {boolean} A boolean value, whether to disable the button.
     */
    isBtnEnabled(val: string): boolean {
        return val.length > 0;
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     * 
     * @param {string} newName  The text entered into the popup.
     */
    onPopupDone(newName: string) {
        this.closePopup();
        this.submitJobs([newName]);
    }
}
