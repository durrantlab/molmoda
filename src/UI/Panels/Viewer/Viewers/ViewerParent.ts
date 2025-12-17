import {
    IRegion,
    RegionType,
    ISphere,
    IBox,
    IArrow,
    ICylinder,
    IAtom,
    SelectedType,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    GenericModelType,
    GenericSurfaceType,
    GenericStyleType,
    GenericLabelType,
    GenericViewerType,
    GenericRegionType,
} from "./Types";
import * as api from "@/Api/";
import {
    getMoleculesFromStore,
    setStoreVar,
} from "@/Store/StoreExternalAccess";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { selectProgramatically } from "@/UI/Navigation/TitleBar/MolSelecting";
import { store } from "@/Store";

export let loadViewerLibPromise: Promise<any> | undefined = undefined;
import { toRaw } from "vue";
import { IFileInfo } from "@/FileSystem/Types";
import { ISelAndStyle } from "@/Core/Styling/SelAndStyleInterfaces";

/**
 * Sets the loadViewerLibPromise variable.
 *
 * @param  {Promise<any>} val  The promise to set.
 */
export function setLoadViewerLibPromise(val: Promise<any>) {
    loadViewerLibPromise = val;
}

/**
 * The ViewerParent abstract class. Other viewers (e.g., 3dmoljs) inherit this
 * one.
 */
export abstract class ViewerParent {
    // Keep track of which molecules have been loaded.
    molCache: { [id: string]: GenericModelType } = {};

    // Keep track of the surfaces as well. Associating them with molecule ids.
    // Note that a given molecule can have multiple surfaces.
    surfaces: { [id: string]: GenericSurfaceType[] } = {};

    // Keep track of the regions.
    regionCache: { [id: string]: GenericRegionType } = {};
    // Keep track of region definitions to avoid unnecessary recreation
    regionDefinitionCache: { [id: string]: IRegion } = {};
    // This function is called to add a class to the a div surrounding the
    // viewer. For example, to change the style on the cursor depending on
    // whether you're hovering over an atom.
    updateViewerDivClassCallback: undefined | ((classes: string) => void);

    /**
     * Removes a model from the viewer.
     *
     * @param  {string} id  The id of the model to remove.
     * @returns {void}
     */
    abstract _removeModel(id: string): void;

    /**
     * Removes a region from the viewer.
     *
     * @param  {string} id  The id of the region to remove.
     * @returns {void}
     */
    abstract _removeRegion(id: string): void;

    /**
     * Removes multiple objects (models or regions).
     *
     * @param {string[]} remainingMolIds  The ids of the models that remain.
     */
    removeObjects(remainingMolIds: string[]) {
        // Find the ids that are still present in the cache. These should be
        // removed.
        const idsOfMolsOrRegionsToDelete: string[] = [];
        for (const molCacheId in this.molCache) {
            if (remainingMolIds.indexOf(molCacheId) === -1) {
                // There's an id in the cache that isn't in the tree.
                idsOfMolsOrRegionsToDelete.push(molCacheId);
            }
        }
        for (const regionCacheId in this.regionCache) {
            if (remainingMolIds.indexOf(regionCacheId) === -1) {
                // There's an id in the cache that isn't in the tree.
                idsOfMolsOrRegionsToDelete.push(regionCacheId);
            }
        }

        if (idsOfMolsOrRegionsToDelete.length > 0) {
            // Remove them from the cache, viewer, etc.
            idsOfMolsOrRegionsToDelete.forEach((id: string) => {
                // It is strange, but it's important to hide before removing.
                // Never did figure out why.
                this.hideObject(id);
                this.removeObject(id);
                this.renderAll();
            });
        }
    }

    /**
     * Removes a single model or region from the viewer.
     *
     * @param {string} id  The id of the model or region to remove.
     */
    removeObject(id: string) {
        // Clear any surfaces
        this.clearSurfacesOfMol(id);

        if (this.molCache[id]) {
            this._removeModel(id);
        }

        if (this.regionCache[id]) {
            this._removeRegion(id);
        }

        // Remove from cache
        this.removeFromCache(id);

        // Note that not calling render here. Need to call it elsewhere for
        // these changes to appear in 3dmoljs viewer.
    }

    /**
     * Removes a surface from the viewer.
     *
     * @param  {GenericSurfaceType} surface  The surface to remove.
     * @returns {void}
     */
    abstract removeSurface(surface: GenericSurfaceType): void;
    /**
     * Updates the style of a surface.
     *
     * @param {string} id The id of the model.
     * @param {GenericStyleType} style The new style.
     */
    abstract updateSurfaceStyle(id: string, style: GenericStyleType): void;
    /**
     * Hide a model.
     *
     * @param  {string} id  The model to hide.
     * @returns {void}
     */
    abstract hideMolecule(id: string): void;

    /**
     * Hide a region.
     *
     * @param  {string} id  The region to hide.
     * @returns {void}
     */
    abstract hideRegion(id: string): void;

    /**
     * Hide a model or region.
     *
     * @param  {string} id  The model or region to hide.
     * @returns {void}
     */
    hideObject(id: string) {
        const model = this.molCache[id];
        if (model) {
            this.hideMolecule(id);
            this._makeAtomsNotHoverableAndClickable(model);
            this.renderAll();
            return;
        }

        if (this.regionCache[id]) {
            this.hideRegion(id);
            this.renderAll();
        }
    }

    /**
     * Show a model or region.
     *
     * @param  {string} id  The id of the model or region to show.
     */
    showObject(id: string) {
        const model = this.molCache[id];
        if (model) {
            this.showMolecule(id);
            this._makeAtomsHoverableAndClickable(model, id);
            this.renderAll();
            return;
        }

        if (this.regionCache[id]) {
            // Get the original TreeNode to find the target opacity.
            const treeNode = getMoleculesFromStore().filters.onlyId(id);
            let opacity = 1;
            if (treeNode && treeNode.region && treeNode.region.opacity) {
                opacity = treeNode.region.opacity;
                this.createRegionLabel(id, treeNode.title);
            }

            this.showRegion(id, opacity);

            this.renderAll();
        }
    }

    /**
     * Show a model.
     *
     * @param  {string} id  The id of the model to show.
     * @returns {void}
     */
    abstract showMolecule(id: string): void;

    /**
     * Show a region.
     *
     * @param  {string} id       The id of the region to show.
     * @param  {number} opacity  The opacity to show the region at.
     * @returns {void}
     */
    abstract showRegion(id: string, opacity: number): void;

    abstract createRegionLabel(id: string, text: string): void;
    abstract destroyRegionLabel(id: string): void;

    private _callbackRegistered = false;

    /**
     * Register a callback to be called when the view changes. Defined on the
     * children.
     *
     * @param  {Function} callback  The callback to register.
     * @returns {void}
     */
    abstract _registerViewChangeCallback(
        callback: (view: number[]) => void
    ): void;

    /**
     * Register a callback to be called when the view changes.
     *
     * @param  {Function} callback  The callback to register.
     * @returns {void}
     */
    public registerViewChangeCallback(callback: (view: number[]) => void) {
        if (!this._callbackRegistered) {
            // Make sure registered only once.
            this._callbackRegistered = true;
            this._registerViewChangeCallback(callback);
        }
    }

    abstract getView(): number[];

    abstract setView(view: number[]): void;

    /**
     * Clear the current molecular styles.
     *
     * @param  {string} id  The id of the model to clear the styles of.
     * @returns {void}
     */
    abstract clearMoleculeStyles(id: string): void;

    /**
     * Sets the style of a molecule. TODO: good to not use any type for
     * selection.
     *
     * @param  {string} id        The id of the model to set the style of.
     * @param  {any} selection    The selection to apply the style to.
     * @param  {GenericStyleType} style  The style to apply.
     * @param  {boolean} [add?]   Whether to add the style to the existing
     *                            styles. If false, replaces the existing style.
     * @returns {void}
     */
    abstract setMolecularStyle(
        id: string,
        selection: any,
        style: GenericStyleType,
        add?: boolean
    ): void;

    /**
     * Adds a surface to the given model.
     *
     * @param  {string}    id     The id of the model to add the surface to.
     * @param  {GenericStyleType} style  The style of the surface.
     * @returns {Promise<GenericSurfaceType>}  A promise that resolves when the
     *     surface.
     */
    abstract _addSurface(
        id: string,
        style: GenericStyleType
    ): Promise<GenericSurfaceType>;

    // abstract updateSurfaceStyle(id: string, style: GenericStyleType): void;

    /**
     * Adds a surface.
     *
     * @param {string}    id     The id of the model to add the surface to.
     * @param {GenericStyleType} style  The style of the surface.
     * @returns {Promise<GenericSurfaceType>}  A promise that resolves with the surface
     *     type when it's ready.
     */
    addSurface(
        id: string,
        style: GenericStyleType
    ): Promise<GenericSurfaceType> {
        return this._addSurface(id, style).then(
            (surface: GenericSurfaceType) => {
                // Add to surface cache
                this.surfaces[id] = this.surfaces[id] || [];
                this.surfaces[id].push(surface);
                return surface;
            }
        );
    }

    /**
     * Adds a GLModel to the viewer. Note that the model is given in GLModel
     * format. Returns same model, but now it's been added to viewer and is in
     * that viewer's format.
     *
     * @param  {IAtom[] | IFileInfo} model  The model to add.
     * @returns {GenericModelType}  The model that was added.
     */
    abstract addModel(model: IAtom[] | IFileInfo): Promise<GenericModelType>;

    /**
     * Adds a sphere to the viewer.
     *
     * @param  {ISphere} region   The sphere to add.
     * @param  {string}  [label]  The label of the sphere.
     * @returns {GenericRegionType}  The sphere that was added.
     */
    abstract addSphere(
        region: ISphere,
        label?: string
    ): Promise<GenericRegionType>;

    /**
     * Adds a box to the viewer.
     *
     * @param  {IBox}   region   The box to add.
     * @param  {string} [label]  The label of the box.
     * @returns {GenericRegionType}  The box that was added.
     */
    abstract addBox(region: IBox, label?: string): Promise<GenericRegionType>;

    /**
     * Adds a arrow to the viewer.
     *
     * @param  {IArrow} region  The arrow to add.
     * @returns {GenericRegionType}  The arrow that was added.
     */
    abstract addArrow(region: IArrow): Promise<GenericRegionType>;

    /**
     * Adds a cylinder to the viewer.
     *
     * @param  {ICylinder} region  The cylinder to add.
     * @returns {GenericRegionType}  The cylinder that was added.
     */
    abstract addCylinder(region: ICylinder): Promise<GenericRegionType>;

    /**
     * Adds a region to the viewer.
     *
     * @param  {IRegion} region   The region to add.
     * @returns {GenericRegionType}  The region that was added.
     */
    addRegion(region: IRegion): Promise<GenericRegionType> {
        const regionFull = {
            color: "red",
            opacity: 0.8,
            ...region,
        };
        let genericRegion: Promise<GenericRegionType>;
        switch (region.type) {
            case RegionType.Sphere: {
                genericRegion = this.addSphere(regionFull as ISphere);
                break;
            }
            case RegionType.Box: {
                genericRegion = this.addBox(regionFull as IBox);
                break;
            }
            case RegionType.Arrow: {
                genericRegion = this.addArrow({
                    radius: 0.5,
                    radiusRatio: 1.618034,
                    ...regionFull,
                } as IArrow);
                break;
            }
            case RegionType.Cylinder: {
                genericRegion = this.addCylinder({
                    radius: 0.5,
                    dashed: false,
                    ...regionFull,
                } as ICylinder);
                break;
            }
        }

        return genericRegion;
    }

    /**
     * Adds a list of tree nodes to the viewer.
     *
     * @param {TreeNodeList} treeNodeList   The list of molecules to add.
     * @returns {Promise<TreeNode>[]}  A list of promises that resolve when the
     *    molecules are added.
     */
    addTreeNodeList(treeNodeList: TreeNodeList): Promise<TreeNode>[] {
        // Add all the models and put them in the cache.
        const addMolPromises: Promise<TreeNode>[] = [];

        for (let idx = 0; idx < treeNodeList.length; idx++) {
            const treeNode = treeNodeList.get(idx);
            const id = treeNode.id as string;

            // If it's not in the cache, the system has probably not yet loaded the
            // molecule. Always load it.
            let addObjPromise: Promise<TreeNode>;
            // TODO: Currently doesn't account for regions.
            if (this.molCache[id] || this.regionCache[id]) {
                // Already in molecule cache
                addObjPromise = Promise.resolve(treeNode);
            } else {
                // Not in cache.
                if (treeNode.model) {
                    // treeNode.model might be a proxy, so need to use toRaw.

                    // This should run first

                    addObjPromise = this.addModel(
                        toRaw(treeNode.model) as IAtom[] | IFileInfo
                    )
                        .then((visMol: GenericModelType) => {
                            this.molCache[id] = visMol;

                            // Below now handled elsewhere (when showMolecule or
                            // hideMolecule)
                            // this._makeAtomsHoverableAndClickable(visMol);

                            return treeNode;
                        })
                        .catch((err) => {
                            throw err;
                            // return treeNode;
                        });
                } else if (treeNode.region) {
                    // Make the region as pending because otherwise sometimes a
                    // second copy of the region gets added before the promise
                    // resolves.
                    this.regionCache[id] = "pending";
                    addObjPromise = this.addRegion(
                        treeNode.region as IRegion
                    ).then((region: GenericRegionType) => {
                        this.regionCache[id] = region;
                        this.regionDefinitionCache[id] = treeNode.region as IRegion;
                        // Hide it if it should be invisible.  Handled elsewhere
                        // (up chain).
                        // if (treeNode && !treeNode.visible) {
                        //     console.log("Hiding:" + treeNode.id)
                        //     this.hideRegion(treeNode.id as string);
                        // }

                        return treeNode;
                    });
                } else {
                    throw new Error(
                        "TreeNode must have either a model or a region."
                    );
                }
            }
            addMolPromises.push(addObjPromise);
        }

        return addMolPromises;
    }

    /**
     * Makes atoms NOT responsive to mouse hovering and clicking.
     *
     * @param {GenericModelType} model  The model to make atoms NOT hoverable
     *                                  and clickable.
     */
    private _makeAtomsNotHoverableAndClickable(model: GenericModelType) {
        this.makeAtomsNotHoverable(model);
        this.makeAtomsNotClickable(model);
    }

    /**
     * Makes atoms responsive to mouse hovering and clicking.
     *
     * @param {GenericModelType} model    The model to make atoms hoverable and
     *                                    clickable.
     * @param {string}           modelID  The ID of the model.
     */
    private _makeAtomsHoverableAndClickable(
        model: GenericModelType,
        modelID: string
    ) {
        this.makeAtomsClickable(model, (x: number, y: number, z: number) => {
            // Determine if any of the currently selected items are regions.
            const selectedRegions = getMoleculesFromStore()
                .filters.keepSelected(true, true)
                .filters.keepRegions(true, true);

            if (selectedRegions.length == 0) {
                // Region is not selected, so select the molecule.
                selectProgramatically(modelID);
                setStoreVar("clearFocusedMolecule", false);
            } else {
                // region is selected
                api.plugins.runPlugin("moveregionsonclick", [x, y, z]);
            }
        });

        this.makeAtomsHoverable(
            model,
            (/* x: number, y: number, z: number */) => {
                if (this.updateViewerDivClassCallback) {
                    this.updateViewerDivClassCallback("cursor-pointer");
                }
            },
            () => {
                if (this.updateViewerDivClassCallback) {
                    this.updateViewerDivClassCallback("cursor-grab");
                }
            }
        );
    }

    /**
     * Render all the molecules and surfaces currently added to the viewer.
     *
     * @returns Promise<void>
     */
    abstract renderAll(): Promise<void>;

    /**
     * Zoom in on a set of models.
     *
     * @param  {string[]} ids  The ids of the models to zoom in on.
     * @returns {void}
     */
    abstract zoomToModels(ids: string[]): void;

    /**
     * Zoom in on the focused molecules.
     *
     * @param {string[]} visibleTerminalNodeModelsIds  The visible models. If no
     *                                                 tree nodes are labeled as
     *                                                 focused, the function
     *                                                 will just use all visible
     *                                                 terminal nodes. If this
     *                                                 is undefined, will
     *                                                 determine from the tree
     *                                                 which are visible and
     *                                                 terminal.
     */
    public zoomOnFocused(visibleTerminalNodeModelsIds?: string[]) {
        let molsToFocusIds: string[] = [];
        const allMols = getMoleculesFromStore();
        const flatNodes = allMols.flattened;
        for (let idx = 0; idx < flatNodes.length; idx++) {
            const treeNode = flatNodes.get(idx);
            if (treeNode.focused) {
                if (!treeNode.nodes) {
                    // Already terminal
                    molsToFocusIds = [treeNode.id as string];
                } else {
                    const children = treeNode.nodes;
                    molsToFocusIds = children.filters.onlyTerminal.map(
                        (n) => n.id as string
                    ) as string[];
                }
                break;
            }
        }

        if (molsToFocusIds.length === 0) {
            // If nothing specified, focus on all visible molecules at once.
            if (visibleTerminalNodeModelsIds === undefined) {
                visibleTerminalNodeModelsIds = allMols.terminals.filters
                    .keepVisible()
                    .map((n) => n.id as string);
            }
            molsToFocusIds = visibleTerminalNodeModelsIds;
        }

        // this.renderAll();
        if (store.state["updateZoom"]) {
            this.zoomToModels(molsToFocusIds);
            // api.visualization.viewer.zoom(0.8);
        }
    }

    /**
     * Zoom in on a specific point.
     *
     * @param  {number} x  The x coordinate.
     * @param  {number} y  The y coordinate.
     * @param  {number} z  The z coordinate.
     * @returns {void}
     */
    abstract centerOnPoint(x: number, y: number, z: number): void;

    /**
     * Adds a label to the viewer
     *
     * @param  {string} lblTxt  The text of the label.
     * @param  {number} x       The x coordinate.
     * @param  {number} y       The y coordinate.
     * @param  {number} z       The z coordinate.
     * @returns {GenericLabelType}  The label.
     */
    abstract addLabel(
        lblTxt: string,
        x: number,
        y: number,
        z: number
    ): GenericLabelType;

    /**
     * Removes a label from the viewer.
     *
     * @param  {GenericLabelType} label  The label to remove.
     * @returns {void}
     */
    abstract removeLabel(label: GenericLabelType): void;

    /**
     * Loads and sets up the viewer object. Defined on the children.
     *
     * @param  {string} id  The HTML Dom id of the element to load the viewer
     *                      into.
     * @returns {Promise<GenericViewerType>}  A promise that resolves the viewer when
     *    it is loaded and set up.
     */
    abstract _loadAndSetupViewerLibrary(id: string): Promise<GenericViewerType>;

    /**
     * Loads and sets up the viewer object.
     *
     * @param  {string}   id                            The HTML Dom id of the
     *                                                  element to load the
     *                                                  viewer into.
     * @param  {Function} updateViewerDivClassCallback  A callback that updates
     *                                                  the class of the
     *                                                  viewer-encompassing div.
     * @returns {Promise<GenericViewerType>}  A promise that resolves the viewer
     *    when it is loaded and set up.
     */
    loadAndSetupViewerLibrary(
        id: string,
        updateViewerDivClassCallback: (classes: string) => void
    ): Promise<GenericViewerType> {
        this.updateViewerDivClassCallback = updateViewerDivClassCallback;
        return this._loadAndSetupViewerLibrary(id);
    }

    /**
     * Converts the 3DMoljs style stored in the molecules tree to a style format
     * compatible with this viewer.
     *
     * @param {ISelAndStyle}   style     The style to convert.
     * @param {TreeNode} treeNode  The molecular container, which may contain
     *                             additional/more accessible information about
     *                             the molecule than is available in the model
     *                             itself.
     * @returns {GenericStyleType}  The converted style.
     */
    abstract convertStyle(
        style: ISelAndStyle,
        treeNode: TreeNode
    ): GenericStyleType;

    /**
     * Converts a 3DMoljs selection to the selection format compatible with this
     * viewer.
     *
     * @param {any} sel  The selection to convert.
     * @returns {any}  The converted selection.
     */
    abstract convertSelection(sel: any): any;

    /**
     * Converts a selection and style to the format compatible with this viewer.
     *
     * @param {ISelAndStyle} selAndStyle  The selection and style to convert.
     * @param {TreeNode}     treeNode     The molecular container, which may
     *                                    contain additional/more accessible
     *                                    information about the molecule than is
     *                                    available in the model itself.
     * @returns {object}  An object containing the converted selection and
     * style.
     */
    public convertSelectionAndStyle(
        selAndStyle: ISelAndStyle,
        treeNode: TreeNode
    ) {
        // Convert the selection
        const selection = this.convertSelection(selAndStyle.selection);

        // Copy the ISelAndStyle object and remove the selection
        let style = { ...selAndStyle };
        delete style.selection;
        delete style.moleculeId; // This is for our internal use only
        // Convert the style
        style = this.convertStyle(style, treeNode);

        // return converted selection and style
        return { selection, style };
    }

    /**
     * Unloads the viewer and removes it from api.
     */
    public unLoadViewer() {
        // Remove from api
        api.visualization.viewerObj = undefined;
        loadViewerLibPromise = undefined;

        // Do any viewer-specific unloading
        this.unLoad();

        // Remove 3dmoljs from dom
        const viewer = document.getElementById("mol-viewer");
        if (viewer) {
            viewer.innerText = "";
        }

        // All tree nodes are now dirty (so will be rerendered if new viewer
        // loaded).
        getMoleculesFromStore().flattened.forEach((treeNode: TreeNode) => {
            treeNode.viewerDirty = true;
        });
    }

    /**
     * Unloads the viewer (from the DOM, etc.).
     *
     * @returns any
     */
    abstract unLoad(): any;

    /**
     * Gets a PNG URI of the current view.
     *
     * @returns {Promise<string>}  A promise that resolves the URI.
     */
    abstract pngURI(): Promise<string>;

    /**
     * Gets a VRML model of the current scene.
     *
     * @returns {string}  The VRML string.
     */
    abstract exportVRML(): string;

    /**
     * Gets an object that maps the model ids to VRML.
     * 
     * @param {boolean} [simplify]  Whether to simplify the VRML mesh.
     * @returns {Promise<any>}  A list with the model ids and VRML.
     */
    abstract exportVRMLPerModel(simplify?: boolean): Promise<[string, string][]>;

    /**
     * A helper function that looks up a model or region in cache (in the
     * viewer-appropriate format) given a molecule container.
     *
     * @param  {string} id  The molecule or region id.
     * @returns {GenericModelType | undefined}  The model or region, or undefined if it
     *    is not in the cache.
     */
    protected lookup(
        id: string
    ): GenericModelType | GenericRegionType | undefined {
        if (id === undefined) {
            return undefined;
        }
        if (this.molCache[id]) {
            // remove vuejs proxy
            return toRaw(this.molCache[id]);
        }
        return toRaw(this.regionCache[id]);
    }

    /**
     * Removes a model or region from the cache.
     *
     * @param {string} id  The id of the model or region to remove.
     */
    removeFromCache(id: string): void {
        if (this.molCache[id]) {
            delete this.molCache[id];
        }
        if (this.regionCache[id]) {
            delete this.regionCache[id];
        }
        if (this.regionDefinitionCache[id]) {
            delete this.regionDefinitionCache[id];
        }
    }
    /**
     * Clear the surface associated with a molecule id.
     *
     * @param {string} id  The molecule id.
     */
    clearSurfacesOfMol(id: string) {
        if (id && this.surfaces[id]) {
            for (const surface of this.surfaces[id]) {
                this.removeSurface(surface);
                delete this.surfaces[id];
            }
        }
    }

    /**
     * Clear the cache of molecules, regions, and surfaces.
     */
    clearCache() {
        for (const id in this.molCache) {
            this.removeObject(id);
        }
        for (const id in this.regionCache) {
            this.removeObject(id);
        }
        this.renderAll();
    }

    /**
     * Makes atoms NOT react when clicked.
     *
     * @param {GenericModelType} model     The model to make NOT clickable.
     */
    abstract makeAtomsNotClickable(model: GenericModelType): void;

    /**
     * Makes atoms react when clicked.
     *
     * @param {GenericModelType} model     The model to make clickable.
     * @param {Function}         callBack  Function that runs when atom is
     *                                     clicked. The function is passed the
     *                                     x, y, and z coordinates of the atom.
     */
    abstract makeAtomsClickable(
        model: GenericModelType,
        callBack: (x: number, y: number, z: number) => any
    ): void;

    /**
     * Makes atoms react when mouse moves over then (hoverable).
     *
     * @param {GenericModelType} model               The model to make
     *                                               hoverable.
     * @param {Function}         onHoverInCallBack   Function that runs when
     *                                               hover over atom starts.
     * @param {Function}         onHoverOutCallBack  Function that runs when
     *                                               hover over atom ends.
     */
    abstract makeAtomsHoverable(
        model: GenericModelType,
        onHoverInCallBack: (x: number, y: number, z: number) => any,
        onHoverOutCallBack: () => any
    ): void;

    /**
     * Makes atoms NOT react when mouse moves over then (NOT hoverable).
     *
     * @param {GenericModelType} model  The model to make NOT hoverable.
     */
    abstract makeAtomsNotHoverable(model: GenericModelType): void;

    /**
     * Sets the viewer to be clickable on the background (empty space).
     *
     * @param {Function} callback The callback to run when the background is clicked.
     */
    abstract setBackgroundClickable(callback: () => void): void;

    /**
     * Sets (updates) the style of an existing region.
     *
     * @param {TreeNode} treeNode  The tree node containing the region to
     *                             update.
     */
    abstract updateRegionStyle(treeNode: TreeNode): void;
    /**
     * Checks if two arrays are equal.
     *
     * @param {any[]} a First array.
     * @param {any[]} b Second array.
     * @returns {boolean} True if equal.
     */
    protected areArraysEqual(a: any[], b: any[]): boolean {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; ++i) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }
    /**
     * Gets the text to show when mouse hovers over an atom.
     *
     * @param {string} chain     The chain id.
     * @param {string} resn      The residue name.
     * @param {string} resi      The residue index.
     * @param {string} atomName  The atom name.
     * @returns {string | undefined}  The text to show, or undefined if no text
     *   should be shown.
     */
    protected hoverLabelText(
        chain?: string,
        resn?: string,
        resi?: string,
        atomName?: string
    ): string | undefined {
        const lbls: string[] = [];
        if (chain) {
            lbls.push(chain);
        }
        if (resn) {
            lbls.push(resn);
        }
        if (resi) {
            lbls.push(resi);
        }
        if (atomName) {
            lbls.push(atomName);
        }
        if (lbls.length > 0) {
            return lbls.join(":");
        }
        return undefined;
    }
}
