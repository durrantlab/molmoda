import { PopupPluginParent } from "@/Plugins/PopupPluginParent";
import {
    IMolContainer,
    SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    getAllNodesFlattened,
    getNodeOfId,
} from "@/UI/Navigation/TreeView/TreeUtils";

export default abstract class EditBarPluginParent extends PopupPluginParent {
    nodeToActOn: IMolContainer | undefined | null = undefined;

    protected setNodeToActOn(): void {
        if (this.payload) {
            // this.payload is the node id.
            this.nodeToActOn = getNodeOfId(
                this.payload,
                this.$store.state.molecules
            );
        } else {
            // Find the selected molecule instead.
            const nodes = getAllNodesFlattened(this.$store.state.molecules);
            this.nodeToActOn = nodes.find(
                (n) => n.selected === SelectedType.TRUE
            );
        }

        if (!this.nodeToActOn) {
            // TODO: fix this
            alert(
                "You shouldn't be able to run this if no molecule is selected."
            );
        }
    }

    isBtnEnabled(val: string): boolean {
        return val.length > 0;
    }

    /**
     * Runs when the popup closes.
     * @param {string} newName  The text entered into the popup.
     * @returns void
     */
    onPopupDone(newName: string): void {
        this.closePopup();
        this.submitJobs([newName]);
    }
}
