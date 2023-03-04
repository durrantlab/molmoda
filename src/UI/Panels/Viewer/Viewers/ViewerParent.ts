import {
    IStyle,
    IShape,
    ShapeType,
    ISphere,
    IBox,
    IArrow,
    ICylinder,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import { GLModel } from "../GLModelType";
import {
    GenericModelType,
    GenericSurfaceType,
    GenericStyleType,
    GenericLabelType,
    GenericViewerType,
    GenericShapeType,
} from "./Types";
import * as api from "@/Api/";
import {
    getMoleculesFromStore,
    setStoreVar,
} from "@/Store/StoreExternalAccess";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";

export let loadViewerLibPromise: Promise<any> | undefined = undefined;

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

    // Keep track of the shapes.
    shapeCache: { [id: string]: GenericShapeType } = {};

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
     * Removes a shape from the viewer.
     *
     * @param  {string} id  The id of the shape to remove.
     * @returns {void}
     */
    abstract _removeShape(id: string): void;

    /**
     * Removes multiple objects (models or shapes).
     *
     * @param {string[]} remainingMolIds  The ids of the models that remain.
     */
    removeObjects(remainingMolIds: string[]) {
        // Find the ids that are still present in the cache. These should be
        // removed.
        const idsOfMolsOrShapesToDelete: string[] = [];
        for (const molCacheId in this.molCache) {
            if (remainingMolIds.indexOf(molCacheId) === -1) {
                // There's an id in the cache that isn't in the tree.
                idsOfMolsOrShapesToDelete.push(molCacheId);
            }
        }
        for (const shapeCacheId in this.shapeCache) {
            if (remainingMolIds.indexOf(shapeCacheId) === -1) {
                // There's an id in the cache that isn't in the tree.
                idsOfMolsOrShapesToDelete.push(shapeCacheId);
            }
        }

        // Remove them from the cache, viewer, etc.
        idsOfMolsOrShapesToDelete.forEach((id: string) => {
            this.removeObject(id);
        });
    }

    /**
     * Removes a single model or shape from the viewer.
     *
     * @param {string} id  The id of the model or shape to remove.
     */
    removeObject(id: string) {
        // Clear any surfaces
        this.clearSurfacesOfMol(id);

        if (this.molCache[id]) {
            this._removeModel(id);
        }

        if (this.shapeCache[id]) {
            this._removeShape(id);
        }

        // Remove from cache
        this.removeFromCache(id);

        // Note that not calling render here. Need to call it elsewhere fore these
        // changes to appear in 3dmoljs viewer.
    }

    /**
     * Removes a surface from the viewer.
     *
     * @param  {GenericSurfaceType} surface  The surface to remove.
     * @returns {void}
     */
    abstract removeSurface(surface: GenericSurfaceType): void;

    /**
     * Hide a model.
     *
     * @param  {string} id  The model to hide.
     * @returns {void}
     */
    abstract hideMolecule(id: string): void;

    /**
     * Hide a shape.
     *
     * @param  {string} id  The shape to hide.
     * @returns {void}
     */
    abstract hideShape(id: string): void;

    /**
     * Hide a model or shape.
     *
     * @param  {string} id  The model or shape to hide.
     * @returns {void}
     */
    hideObject(id: string) {
        const model = this.molCache[id];
        if (model) {
            this.hideMolecule(id);
            this._makeAtomsNotHoverableAndClickable(model);
            return;
        }

        if (this.shapeCache[id]) {
            this.hideShape(id);
        }
    }

    /**
     * Show a model or shape.
     *
     * @param  {string} id  The id of the model or shape to show.
     */
    showObject(id: string) {
        const model = this.molCache[id];
        if (model) {
            this.showMolecule(id);
            this._makeAtomsHoverableAndClickable(model);
            return;
        }

        if (this.shapeCache[id]) {
            // Get the original TreeNode to find the target opacity.
            const treeNode = getMoleculesFromStore().filters.onlyId(id);
            let opacity = 1;
            if (treeNode && treeNode.shape && treeNode.shape.opacity) {
                opacity = treeNode.shape.opacity;
            }

            this.showShape(id, opacity);
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
     * Show a shape.
     *
     * @param  {string} id       The id of the shape to show.
     * @param  {number} opacity  The opacity to show the shape at.
     * @returns {void}
     */
    abstract showShape(id: string, opacity: number): void;

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
     * @param  {GLModel} model  The model to add.
     * @returns {GenericModelType}  The model that was added.
     */
    abstract addGLModel(model: GLModel): Promise<GenericModelType>;

    /**
     * Adds a sphere to the viewer.
     *
     * @param  {ISphere} shape  The sphere to add.
     * @returns {GenericShapeType}  The sphere that was added.
     */
    abstract addSphere(shape: ISphere): Promise<GenericShapeType>;

    /**
     * Adds a box to the viewer.
     *
     * @param  {IBox} shape  The box to add.
     * @returns {GenericShapeType}  The box that was added.
     */
    abstract addBox(shape: IBox): Promise<GenericShapeType>;

    /**
     * Adds a arrow to the viewer.
     *
     * @param  {IArrow} shape  The arrow to add.
     * @returns {GenericShapeType}  The arrow that was added.
     */
    abstract addArrow(shape: IArrow): Promise<GenericShapeType>;

    /**
     * Adds a cylinder to the viewer.
     *
     * @param  {ICylinder} shape  The cylinder to add.
     * @returns {GenericShapeType}  The cylinder that was added.
     */
    abstract addCylinder(shape: ICylinder): Promise<GenericShapeType>;

    /**
     * Adds a shape to the viewer.
     *
     * @param  {IShape} shape  The shape to add.
     * @returns {GenericShapeType}  The shape that was added.
     */
    addShape(shape: IShape): Promise<GenericShapeType> {
        const shapeFull = {
            color: "red",
            opacity: 0.8,
            ...shape,
        };
        let genericShape: Promise<GenericShapeType>;
        switch (shape.type) {
            case ShapeType.Sphere: {
                genericShape = this.addSphere(shapeFull as ISphere);
                break;
            }
            case ShapeType.Box: {
                genericShape = this.addBox(shapeFull as IBox);
                break;
            }
            case ShapeType.Arrow: {
                genericShape = this.addArrow({
                    radius: 0.5,
                    radiusRatio: 1.618034,
                    ...shapeFull,
                } as IArrow);
                break;
            }
            case ShapeType.Cylinder: {
                genericShape = this.addCylinder({
                    radius: 0.5,
                    dashed: false,
                    ...shapeFull,
                } as ICylinder);
                break;
            }
        }

        return genericShape;
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
            // TODO: Currently doesn't account for shapes.
            if (this.molCache[id] || this.shapeCache[id]) {
                // Already in molecule cache
                addObjPromise = Promise.resolve(treeNode);
            } else {
                // Not in cache.
                if (treeNode.model) {
                    addObjPromise = this.addGLModel(treeNode.model as GLModel)
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
                } else if (treeNode.shape) {
                    // Make the shape as pending because otherwise sometimes a
                    // second copy of the shape gets added before the promise
                    // resolves.
                    this.shapeCache[id] = "pending";
                    console.log(id + ":OPACITY4: "); // Sets opacity
                    addObjPromise = this.addShape(
                        treeNode.shape as IShape
                    ).then((shape: GenericShapeType) => {
                        this.shapeCache[id] = shape;

                        // Hide it if it should be invisible.  Handled elsewhere
                        // (up chain).
                        // if (treeNode && !treeNode.visible) {
                        //     console.log("Hiding:" + treeNode.id)
                        //     this.hideShape(treeNode.id as string);
                        // }

                        return treeNode;
                    });
                } else {
                    throw new Error(
                        "TreeNode must have either a model or a shape."
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
     * @param {GenericModelType} model  The model to make atoms hoverable and
     *                                  clickable.
     */
    private _makeAtomsHoverableAndClickable(model: GenericModelType) {
        this.makeAtomsClickable(model, (x: number, y: number, z: number) => {
            api.plugins.runPlugin("moveshapesonclick", [x, y, z]);
            setStoreVar("clearFocusedMolecule", false);
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
     * @returns void
     */
    abstract renderAll(): void;

    /**
     * Zoom in on a set of models.
     *
     * @param  {string[]} ids  The ids of the models to zoom in on.
     * @returns {void}
     */
    abstract zoomToModels(ids: string[]): void;

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
     * @param {IStyle}        style         The style to convert.
     * @param {TreeNode} treeNode  The molecular container, which may
     *                                      contain additional/more accessible
     *                                      information about the molecule than
     *                                      is available in the model itself.
     * @returns {GenericStyleType}  The converted style.
     */
    abstract convertStyle(style: IStyle, treeNode: TreeNode): GenericStyleType;

    /**
     * Converts a 3DMoljs selection to the selection format compatible with this
     * viewer.
     *
     * @param {any} sel  The selection to convert.
     * @returns {any}  The converted selection.
     */
    abstract convertSelection(sel: any): any;

    /**
     * Unloads the viewer and removes it from api.
     */
    public unLoadViewer() {
        // Remove from api
        api.visualization.viewer = undefined;
        loadViewerLibPromise = undefined;

        // Do any viewer-specific unloading
        this.unLoad();

        // Remove 3dmoljs from dom
        const viewer = document.getElementById("mol-viewer");
        if (viewer) {
            viewer.innerHTML = "";
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
     * A helper function that looks up a model or shape in cache (in the
     * viewer-appropriate format) given a molecule container.
     *
     * @param  {string} id  The molecule or shape id.
     * @returns {GenericModelType | undefined}  The model or shape, or undefined if it
     *    is not in the cache.
     */
    protected lookup(
        id: string
    ): GenericModelType | GenericShapeType | undefined {
        if (id === undefined) {
            return undefined;
        }
        if (this.molCache[id]) {
            return this.molCache[id];
        }
        return this.shapeCache[id];
    }

    /**
     * Removes a model or shape from the cache.
     *
     * @param {string} id  The id of the model or shape to remove.
     */
    removeFromCache(id: string): void {
        if (this.molCache[id]) {
            delete this.molCache[id];
        }
        if (this.shapeCache[id]) {
            delete this.shapeCache[id];
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
     * Clear the cache of molecules, shapes, and surfaces.
     */
    clearCache() {
        for (const id in this.molCache) {
            this.removeObject(id);
        }
        for (const id in this.shapeCache) {
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
     * Sets (updates) the style of an existing shape.
     *
     * @param {string} id  The id of the shape.
     * @param {IShape | ISphere | IBox} shapeStyle  The style to set.
     */
    updateShapeStyle(id: string, shapeStyle: IShape | ISphere | IBox) {
        // Rather than update the shape, we remove it and re-add it. This is
        // because the 3DMoljs viewer does not have a way to update the position
        // as best I can tell.
        console.log(id + ":OPACITY3: "); // Sets opacity

        this.addShape(shapeStyle)
            .then((shape: GenericShapeType) => {
                this._removeShape(id);
                this.shapeCache[id] = shape;
                return;
            })
            .catch((err: Error) => {
                throw err;
            });
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
