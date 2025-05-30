import { dynamicImports } from "./DynamicImports";

let Indigo: any = undefined;

/**
 * A class for performing chemical reactions using the Indigo toolkit. It allows
 * setting up a reaction, adding reactants, and then running the reaction to
 * enumerate products.
 */
export class Reactor {
    /**
     * Stores the Indigo reaction object once loaded. -1 indicates the reaction
     * has not been set up or has been cleaned up.
     *
     * @private
     */
    private _reaction = -1;

    /**
     * Stores an array of Indigo arrays, where each inner array represents a
     * group/class of monomers for the reaction.
     *
     * @private
     */
    private _monomersTableGroups: number[] = [];

    /**
     * Stores the main Indigo array that holds the _monomersTableGroups. This is
     * the structure passed to Indigo's reaction enumeration functions.
     *
     * @private
     */
    private _monomersTable = -1;

    /**
     * An array to keep track of Indigo molecule objects created for reactants,
     * so they can be properly freed after the reaction.
     *
     * @private
     */
    private _molsToCleanUp: number[] = [];

    /**
     * Sets up the reactor with a given reaction SMARTS string. This method must
     * be called before adding reactants or running the reaction. It loads the
     * Indigo library if not already loaded, and then loads the reaction SMARTS.
     *
     * @async
     * @param {string} reactionSmarts The reaction SMARTS string defining the
     *                                chemical transformation.
     * @throws {Error} If the reaction SMARTS is invalid.
     */
    async setup(reactionSmarts: string) {
        if (Indigo === undefined) {
            await this._loadIndigo();
        }

        // Create the reaction
        this._reaction = Indigo.loadReactionSmartsFromString(
            reactionSmarts
        );

        if (this._reaction === -1) {
            throw new Error("Invalid reaction SMARTS: " + reactionSmarts);
        }

        // Now create a table to store the reactants
        this._monomersTable = Indigo.createArray();

        // Add the first set of reactants to the table (there will always be at
        // least one set)
        this._addMonomerTableClass();
    }

    /**
     * Checks if the reactor has been properly set up. Throws an error if
     * `setup()` has not been called or if the reactor has been cleaned up.
     *
     * @private
     * @throws {Error} If the reactor is not set up.
     */
    private _checkSetup() {
        if (this._reaction === -1) {
            throw new Error("Reactor not set up. Call `await reactor.setup()` first.");
        }
    }

    /**
     * Adds a new monomer group (an Indigo array) to the `_monomersTable`. Each
     * group can hold multiple reactants of the same class.
     *
     * @private
     */
    private _addMonomerTableClass() {
        this._checkSetup();
        const monomerTableGroup = Indigo.createArray();
        Indigo.arrayAdd(this._monomersTable, monomerTableGroup);
        this._monomersTableGroups.push(monomerTableGroup);
    }

    /**
     * Loads the Indigo WebAssembly module dynamically. Assigns the loaded
     * module to the `Indigo` variable.
     *
     * @async
     * @private
     * @returns {Promise<void>} A promise that resolves when Indigo is loaded.
     */
    private async _loadIndigo(): Promise<void> {
        Indigo = await dynamicImports.indigo.module;
    }

    /**
     * Adds a reactant (as a SMILES string) to a specific reactant class. If the
     * reactant class index does not exist, new classes are created up to the
     * specified index.
     *
     * @param {string} reactantSmiles       The SMILES string of the reactant
     *                                      molecule.
     * @param {number} [reactantClassIdx=0] The index of the reactant class to
     *                                      which this reactant belongs.
     *                                      Corresponds to the order of
     *                                      reactants in the reaction SMARTS
     *                                      (e.g., R1, R2).
     */
    addReactant(reactantSmiles: string, reactantClassIdx = 0) {
        this._checkSetup();
        
        // Keep adding table classes until we have enough
        while (this._monomersTableGroups.length <= reactantClassIdx) {
            this._addMonomerTableClass();
        }

        const reactant = Indigo.loadMoleculeFromString(reactantSmiles);
        const monomersTableEntry = Indigo.at(
            this._monomersTable,
            reactantClassIdx
        );
        Indigo.arrayAdd(monomersTableEntry, reactant);
        this._molsToCleanUp.push(reactant);
    }

    /**
     * Runs the chemical reaction with the currently added reactants. It
     * enumerates all possible products based on the reaction SMARTS and the
     * provided reactants. After execution, it cleans up all Indigo objects
     * (reaction, reactants, tables) and resets the reactor, requiring a new
     * `setup()` call for reuse.
     *
     * @returns {{ reactants: string[], products: string[] }[]} An array of
     *     objects, where each object represents a single reaction outcome,
     *     containing an array of reactant SMILES and an array of product
     *     SMILES. The SMILES strings are cleaned of any additional Indigo
     *     metadata.
     */
    runReaction(): { reactants: string[], products: string[] }[] {
        this._checkSetup();

        // Get the products. This reacts each of the reactants in set 1 with each of the reactants in set 2 to produce many products.
        const outputReactions = Indigo.reactionProductEnumerate(
            this._reaction,
            this._monomersTable
        );

        // Show the number of products generated
        // console.log(Indigo.count(outputReactions));

        // Display all products
        const reactionSmiles: string[] = [];
        const iterator = Indigo.iterateArray(outputReactions);
        while (Indigo.hasNext(iterator)) {
            const item = Indigo.next(iterator);
            if (item >= 0) {
                const mol2 = Indigo.clone(item); // copy tautomer molecule
                const smiles = Indigo.canonicalSmiles(mol2); // output smiles
                reactionSmiles.push(smiles);
                Indigo.free(mol2);  // Clean up
            }
        }

        // Clean up
        for (const mol of this._molsToCleanUp) {
            Indigo.free(mol);
        }
        Indigo.free(this._reaction);
        this._monomersTableGroups.forEach((group) => Indigo.free(group));
        Indigo.free(this._monomersTable);

        // Require new setup if you reuse this object.
        this._reaction = -1;

        // Process product smiles
        return reactionSmiles.map((smiles: string) => {
            // CC(=O)Cl.O[C@@H]1[C@@H](O)[C@H](O)[C@@H](O)[C@H](O)[C@H]1O>>CC(=O)O[C@@H]1[C@@H](O)[C@H](O)[C@@H](O)[C@H](O)[C@H]1O |f:0.1|
            smiles = smiles.split(" ")[0];
            const [reactantsStr, productsStr] = smiles.split(">>");
            const reactants = reactantsStr.split(".");
            const products = productsStr.split(".");
            return {
                reactants,
                products,
            };
        });
    }
}
