import { IStyle, IMolContainer } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { GLModel } from "../GLModelType";
import {
    ModelType,
    SurfaceType,
    StyleType,
    LabelType,
    ViewerType,
} from "./Types";
import * as api from "@/Api/";
import { getAllNodesFlattened } from "@/UI/Navigation/TreeView/TreeUtils";
import { getStoreVar } from "@/Store/StoreExternalAccess";

export let loadViewerLibPromise: Promise<any> | undefined = undefined;

export function setLoadViewerLibPromise(val: Promise<any>) {
    loadViewerLibPromise = val;
}

/**
 * The ViewerParent abstract class. Other viewers (e.g., 3dmoljs) inherit this
 * one.
 */
export abstract class ViewerParent {
    // Keep track of which molecules have been loaded.
    molCache: { [id: string]: ModelType } = {};

    // Keep track of the surfaces as well. Associating them with molecule ids.
    // Note that a given molecule can have multiple surfaces.
    surfaces: { [id: string]: SurfaceType[] } = {};

    /**
     * Removes a model from the viewer.
     *
     * @param  {string} id  The id of the model to remove.
     * @returns {void}
     */
    abstract _removeModel(id: string): void;

    /**
     * Removes multiple models.
     * 
     * @param {string[]} ids  The ids of the models to remove.
     */
    removeModels(ids: string[]) {
        // Find the ids that are still present in the cache. These should be
        // removed.
        const idsOfMolsToDelete: string[] = [];
        for (const molCacheId in this.molCache) {
            if (ids.indexOf(molCacheId) === -1) {
                // There's an id in the cache that isn't in the tree.
                idsOfMolsToDelete.push(molCacheId);
            }
        }

        // Remove them from the cache, viewer, etc.
        idsOfMolsToDelete.forEach((id: string) => {
            this.removeModel(id);
        });
    }


    /**
     * Removes a single model from the viewer.
     * 
     * @param {string} id  The id of the model to remove.
     */
    removeModel(id: string) {
        // Clear any surfaces
        this.clearSurfacesOfMol(id);

        this._removeModel(id);

        // Remove from cache
        this.removeFromCache(id);

        // Note that not calling render here. Need to call it elsewhere fore these
        // changes to appear in 3dmoljs viewer.
    }

    /**
     * Removes a surface from the viewer.
     *
     * @param  {SurfaceType} surface  The surface to remove.
     * @returns {void}
     */
    abstract removeSurface(surface: SurfaceType): void;

    /**
     * Hide a model.
     *
     * @param  {string} id  The model to hide.
     * @returns {void}
     */
    abstract hideMolecule(id: string): void;

    /**
     * Show a model.
     *
     * @param  {string} id  The id of the model to show.
     * @returns {void}
     */
    abstract showMolecule(id: string): void;

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
     * @param  {StyleType} style  The style to apply.
     * @param  {boolean} [add?]   Whether to add the style to the existing
     *                            styles. If false, replaces the existing style.
     * @returns {void}
     */
    abstract setMolecularStyle(
        id: string,
        selection: any,
        style: StyleType,
        add?: boolean
    ): void;

    /**
     * Adds a surface to the given model.
     *
     * @param  {string}    id     The id of the model to add the surface to.
     * @param  {StyleType} style  The style of the surface.
     * @returns {Promise<SurfaceType>}  A promise that resolves when the
     *     surface.
     */
    abstract _addSurface(id: string, style: StyleType): Promise<SurfaceType>;

    /**
     * Adds a surface.
     *
     * @param {string}    id     The id of the model to add the surface to.
     * @param {StyleType} style  The style of the surface.
     * @returns {Promise<SurfaceType>}  A promise that resolves with the surface
     *     type when it's ready.
     */
    addSurface(id: string, style: StyleType): Promise<SurfaceType> {
        return this._addSurface(id, style).then((surface: SurfaceType) => {
            // Add to surface cache
            this.surfaces[id] = this.surfaces[id] || [];
            this.surfaces[id].push(surface);
            return surface;
        });
    }

    /**
     * Adds a GLModel to the viewer. Note that the model is given in GLModel
     * format. Returns same model, but now it's been added to viewer and is in
     * that viewer's format.
     *
     * @param  {GLModel} model  The model to add.
     * @returns {ModelType}  The model that was added.
     */
    abstract addGLModel(model: GLModel): Promise<ModelType>;

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
            let addMolPromise: Promise<IMolContainer>;
            const cacheItem = this.molCache[id];
            if (cacheItem) {
                // Already in cache
                addMolPromise = Promise.resolve(molContainer);
            } else {
                // Not in cache.
                addMolPromise = this.addGLModel(molContainer.model as GLModel)
                    .then((visMol: ModelType) => {
                        this.molCache[id] = visMol;
                        console.warn("Uncomment below!");
                        // this._makeAtomsHoverableAndClickable({ model: visMol });

                        return molContainer;
                    })
                    .catch((err) => {
                        console.log(err);
                        return molContainer;
                    });
            }
            addMolPromises.push(addMolPromise);
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
     * @returns {LabelType}  The label.
     */
    abstract addLabel(
        lblTxt: string,
        x: number,
        y: number,
        z: number
    ): LabelType;

    /**
     * Removes a label from the viewer.
     *
     * @param  {LabelType} label  The label to remove.
     * @returns {void}
     */
    abstract removeLabel(label: LabelType): void;

    /**
     * Loads and sets up the viewer object.
     *
     * @param  {string} id  The HTML Dom id of the element to load the viewer
     *                      into.
     * @returns {Promise<ViewerType>}  A promise that resolves the viewer when
     *    it is loaded and set up.
     */
    abstract loadAndSetupViewerLibrary(id: string): Promise<ViewerType>;

    /**
     * Converts the 3DMoljs style stored in the molecules tree to a style format
     * compatible with this viewer.
     *
     * @param {IStyle}        style         The style to convert.
     * @param {IMolContainer} molContainer  The molecular container, which may
     *                                      contain additional/more accessible
     *                                      information about the molecule than
     *                                      is available in the model itself.
     * @returns {StyleType}  The converted style.
     */
    abstract convertStyle(
        style: IStyle,
        molContainer: IMolContainer
    ): StyleType;

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
        for (const molContainer of getAllNodesFlattened(getStoreVar("molecules"))) {
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
     * A helper function that looks up the model in cache (in the
     * viewer-appropriate format) given a molecule container.
     *
     * @param  {string} id  The molecule id.
     * @returns {ModelType | undefined}  The model, or undefined if it is not in
     *    the cache.
     */
    protected lookupMol(id: string): ModelType | undefined {
        if (id === undefined) {
            return undefined;
        }
        return this.molCache[id];
    }

    /**
     * Removes a model from the cache.
     * 
     * @param {string} id  The id of the model to remove.
     */
    removeFromCache(id: string): void {
        delete this.molCache[id];
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
     * Clear the cache of molecules and surfaces.
     */
    clearCache() {
        for (const id in this.molCache) {
            this.removeModel(id);
        }
        this.renderAll();
    }
}
