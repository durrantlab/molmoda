import { MolsToUse } from "@/UI/Forms/MoleculeInputParams/MoleculeInputParamsTypes";
import {
    IMolContainer,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    getCompoundsToUse,
    getProteinChainsToUse,
    getProteinsToUse,
} from "@/UI/Navigation/TreeView/TreeUtils";

let viewerObj: any;

export const visualizationApi = {
    /**
     * Gets the 3dmoljs viewer.
     *
     * @returns {any}  The 3dmoljs viewer.
     */
    get viewer(): any {
        return viewerObj;
    },

    /**
     * Sets the 3dmoljs viewer.
     *
     * @param  {any} v  The 3dmoljs viewer.
     */
    set viewer(v: any) {
        viewerObj = v;
    },

    /**
     * Gets the visible proteins. (Each protein may have multiple chains.)
     *
     * @param  {MolsToUse}        molsToUse  The kinds of molecule properties to
     *                                       filter by.
     * @param  {IMolContainer[]}  molecules  The list of molecules to consider.
     *                                       If not given, will get all
     *                                       molecules from VueX store.
     * @returns {IMolContainer[]}  The visible proteins.
     */
    getProteinsToUse(
        molsToUse: MolsToUse,
        molecules: IMolContainer[]
    ): IMolContainer[] {
        return getProteinsToUse(molsToUse, molecules);
    },

    /**
     * Gets the visible protein chains.
     *
     * @param  {MolsToUse}        molsToUse  The kinds of molecule properties to
     *                                       filter by.
     * @param  {IMolContainer[]}  molecules  The list of molecules to consider.
     *                                       If not given, will get all
     *                                       molecules from VueX store.
     * @returns {IMolContainer[]}  The visible protein chains.
     */
    getProteinChainsToUse(
        molsToUse: MolsToUse,
        molecules: IMolContainer[]
    ): IMolContainer[] {
        return getProteinChainsToUse(molsToUse, molecules);
    },

    /**
     * Gets the visible compounds.
     *
     * @param  {MolsToUse}       molsToUse  The kinds of molecule properties to
     *                                      filter by.
     * @param  {IMolContainer[]} molecules  The list of molecules to consider.
     *                                      If not given, will get all molecules
     *                                      from VueX store.
     * @returns {IMolContainer[]}  The visible compounds.
     */
    getCompoundsToUse(
        molsToUse: MolsToUse,
        molecules: IMolContainer[]
    ): IMolContainer[] {
        return getCompoundsToUse(molsToUse, molecules);
    },
};
