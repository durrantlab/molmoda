import { dynamicImports } from "./DynamicImports";

let Indigo: any = undefined;

export class Reactor {
    private _reaction = -1;
    private _monomersTableGroups: number[] = [];
    private _monomersTable = -1;
    private _molsToCleanUp: number[] = [];

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

    private _checkSetup() {
        if (this._reaction === -1) {
            throw new Error("Reactor not set up. Call `await reactor.setup()` first.");
        }
    }

    private _addMonomerTableClass() {
        this._checkSetup();
        const monomerTableGroup = Indigo.createArray();
        Indigo.arrayAdd(this._monomersTable, monomerTableGroup);
        this._monomersTableGroups.push(monomerTableGroup);
    }

    private async _loadIndigo(): Promise<void> {
        Indigo = await dynamicImports.indigo.module;
    }

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
