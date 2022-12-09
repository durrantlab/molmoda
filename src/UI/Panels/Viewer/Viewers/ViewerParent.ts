import {
    IStyle,
    IMolContainer,
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
    getAllNodesFlattened,
    getNodeOfId,
} from "@/UI/Navigation/TreeView/TreeUtils";
import { getStoreVar } from "@/Store/StoreExternalAccess";

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
        if (this.molCache[id]) {
            this.hideMolecule(id);
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
        if (this.molCache[id]) {
            this.showMolecule(id);
            return;
        }

        if (this.shapeCache[id]) {
            // Get the original IMolContainer to find the target opacity.
            const molContainer = getNodeOfId(id, getStoreVar("molecules"));
            let opacity = 1;
            if (
                molContainer &&
                molContainer.shape &&
                molContainer.shape.opacity
            ) {
                opacity = molContainer.shape.opacity;
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
        return new Promise((resolve) => {
            const shapeFull = {
                color: "red",
                opacity: 0.8,
                ...shape,
            };
            switch (shape.type) {
                case ShapeType.Sphere: {
                    const genericShape = this.addSphere(shapeFull as ISphere);
                    resolve(genericShape);
                    return;
                }
                case ShapeType.Box: {
                    const genericShape = this.addBox(shapeFull as IBox);
                    resolve(genericShape);
                    return;
                }
                case ShapeType.Arrow: {
                    const genericShape = this.addArrow({
                        radius: 0.5,
                        radiusRatio: 1.618034,
                        ...shapeFull,
                    } as IArrow);
                    resolve(genericShape);
                    return;
                }
                case ShapeType.Cylinder: {
                    const genericShape = this.addCylinder({
                        radius: 0.5,
                        dashed: false,
                        ...shapeFull,
                    } as ICylinder);
                    resolve(genericShape);
                    return;
                }
            }
        });
    }

    /**
     * Adds a list of IMolContainers to the viewer.
     *
     * @param {IMolContainer[]} molContainers   The list of molecules to add.
     * @returns {Promise<IMolContainer>[]}  A list of promises that resolve
     *    when the molecules are added.
     */
    addMolContainers(molContainers: IMolContainer[]): Promise<IMolContainer>[] {
        // Add all the models and put them in the cache.
        const addMolPromises: Promise<IMolContainer>[] = [];
        for (const molContainer of molContainers) {
            const id = molContainer.id as string;

            // If it's not in the cache, the system has probably not yet loaded the
            // molecule. Always load it.
            let addObjPromise: Promise<IMolContainer>;
            // TODO: Currently doesn't account for shapes.
            if (this.molCache[id] || this.shapeCache[id]) {
                // Already in molecule cache
                addObjPromise = Promise.resolve(molContainer);
            } else {
                // Not in cache.
                if (molContainer.model) {
                    addObjPromise = this.addGLModel(
                        molContainer.model as GLModel
                    )
                        .then((visMol: GenericModelType) => {
                            this.molCache[id] = visMol;
                            console.warn("Uncomment below!");
                            // this._makeAtomsHoverableAndClickable({ model: visMol });

                            return molContainer;
                        })
                        .catch((err) => {
                            console.log(err);
                            return molContainer;
                        });
                } else if (molContainer.shape) {
                    addObjPromise = this.addShape(
                        molContainer.shape as IShape
                    ).then((shape: GenericShapeType) => {
                        this.shapeCache[id] = shape;
                        return molContainer;
                    });
                } else {
                    throw new Error(
                        "MolContainer must have either a model or a shape."
                    );
                }
            }
            addMolPromises.push(addObjPromise);
        }

        return addMolPromises;
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
    abstract zoomToPoint(x: number, y: number, z: number): void;

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
     * Loads and sets up the viewer object.
     *
     * @param  {string} id  The HTML Dom id of the element to load the viewer
     *                      into.
     * @returns {Promise<GenericViewerType>}  A promise that resolves the viewer when
     *    it is loaded and set up.
     */
    abstract loadAndSetupViewerLibrary(id: string): Promise<GenericViewerType>;

    /**
     * Converts the 3DMoljs style stored in the molecules tree to a style format
     * compatible with this viewer.
     *
     * @param {IStyle}        style         The style to convert.
     * @param {IMolContainer} molContainer  The molecular container, which may
     *                                      contain additional/more accessible
     *                                      information about the molecule than
     *                                      is available in the model itself.
     * @returns {GenericStyleType}  The converted style.
     */
    abstract convertStyle(
        style: IStyle,
        molContainer: IMolContainer
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

        // All IMolContainers are now dirty (so will be rerendered if new viewer
        // loaded).
        for (const molContainer of getAllNodesFlattened(
            getStoreVar("molecules")
        )) {
            molContainer.viewerDirty = true;
        }
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
    exportVRML(): string {
        console.error("exportVRML not implemented");
        return "";
    }

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
}
