import { setTempErrorMsg } from "@/Plugins/Core/ErrorReporting/ErrorReporting";

/**
 * Prepares a custom error message for a failed docking.
 * 
 * @param {string} title  The title of the compound.
 */
export function prepForErrorCustomMsg(title: string) {
    setTempErrorMsg(
        `Could not dock compound: ${title} (skipped). There are many possible causes, including: (1) docking compounds with atoms that are not in the AutoDock Vina forcefield (e.g., boron), (2) docking physically impossible compounds (e.g., a single fluorine atom bound to two or more other atoms), (3) docking fragmented compounds (e.g., salts), (4) docking very large compounds, and (5) using a computer with insufficient memory.`
    );
}
