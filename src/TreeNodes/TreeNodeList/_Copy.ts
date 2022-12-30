import { newTreeNodeList } from "../TreeNodeMakers";
import type { TreeNodeList } from "./TreeNodeList";

/**
 * TreeNodeListCopies class
 */
export class TreeNodeListCopies {
    private parentTreeNodeList: TreeNodeList;
    
    /**
     * Creates an instance of TreeNodeListCopies.
     * 
     * @param  {TreeNodeList} parentTreeNodeList  The parent TreeNodeList.
     */
    constructor(parentTreeNodeList: TreeNodeList) {
        this.parentTreeNodeList = parentTreeNodeList;
    }

    /**
     * Returns a shallow copy of the parent TreeNodeList.
     * 
     * @returns {TreeNodeList}  The shallow copy.
     */
    public get shallow(): TreeNodeList {
        return newTreeNodeList(this.parentTreeNodeList.nodes);
    }

    /**
     * Returns a deep copy of the parent TreeNodeList. Not currently
     * implemented. Warn the user to use treeNodeListDeepClone instead.
     */
    public get deep() {
        throw "Can't call this deepClone function. Use treeNodeListDeepClone in Deserializers.ts instead.";
    }
}