import { IMolContainer, IStyle } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { Vue } from "vue-class-component";
import { Watch } from "vue-property-decorator";
import * as api from "@/Api/";
import { unbondedAtomsStyle } from "@/FileSystem/LoadSaveMolModels/Types/DefaultStyles";
import {
    getAllNodesFlattened,
    getTerminalNodes,
} from "@/UI/Navigation/TreeView/TreeUtils";
import { GLModel } from "./GLModelType";

// Make alias for some types to emphasize that the actual type should be
// whatever the viewer-specific object is.
export type ModelType = any;
export type SurfaceType = any;
export type ViewerType = any;
export type LabelType = any;
export type StyleType = any;

export abstract class ViewerPanelParent extends Vue {
    /**
     * Removes a model from the viewer.
     *
     * @param  {ModelType} mol  The model to remove.
     * @returns {void}
     */
    abstract removeModel(mol: ModelType): void;

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
     * @param  {ModelType} model  The model to hide.
     * @returns {void}
     */
    abstract hideMolecule(model: ModelType): void;

    /**
     * Show a model.
     *
     * @param  {ModelType} model  The model to show.
     * @returns {void}
     */
    abstract showMolecule(model: ModelType): void;

    /**
     * Clear the current molecular styles.
     *
     * @param  {ModelType} model  The model to clear the styles of.
     * @returns {void}
     */
    abstract clearMoleculeStyles(model: ModelType): void;

    /**
     * Sets the style of a molecule. TODO: good to not use any type for
     * selection.
     *
     * @param  {ModelType} model  The model to set the style of.
     * @param  {any} selection    The selection to apply the style to.
     * @param  {StyleType} style  The style to apply.
     * @param  {boolean} [add?]   Whether to add the style to the existing
     *                            styles. If false, replaces the existing style.
     * @returns {void}
     */
    abstract setMolecularStyle(
        model: ModelType,
        selection: any,
        style: StyleType,
        add?: boolean
    ): void;

    /**
     * Adds a surface to the given model.
     *
     * @param  {ModelType} model  The model to add the surface to.
     * @param  {StyleType} style  The style of the surface.
     * @returns {Promise<SurfaceType>}  A promise that resolves when the
     *     surface.
     */
    abstract addSurface(model: ModelType, style: StyleType): Promise<SurfaceType>;

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
     * Render all the molecules and surfaces currently added to the viewer.
     *
     * @returns void
     */
    abstract renderAll(): void;

    /**
     * Zoom in on a set of models.
     *
     * @param  {ModelType[]} models         The models to zoom in on.
     * @returns {void}
     */
    abstract zoomToModels(models: ModelType[]): void;

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
     * @returns {Promise<ViewerType>}  A promise that resolves the viewer when
     *    it is loaded and set up.
     */
    abstract loadAndSetupViewerLibrary(): Promise<ViewerType>;

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
    abstract convertStyle(style: IStyle, molContainer: IMolContainer): StyleType;

    /**
     * Converts a 3DMoljs selection to the selection format compatible with this
     * viewer.
     *
     * @param {any} sel  The selection to convert.
     * @returns {any}  The converted selection.
     */
    abstract convertSelection(sel: any): any;

    mounted() {
        // Keep track of which molecules have been loaded. Doing it this way so
        // it won't be reactive (causes problem for three.js-powered viewers
        // like NGL).

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.molCache = {}; // { [id: string]: ModelType }

        // Keep track of the surfaces as well. Associating them with molecule
        // ids. Note that a given molecule can have multiple surfaces.

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.surfaces = {}; // { [id: string]: SurfaceType[] }
    }

    /**
     * Get the molecules from the store. All viewers of any type will need to
     * react to changes in the molecules.
     *
     * @returns {IMolContainer[]} the molecules.
     */
    get treeview(): IMolContainer[] {
        return this.$store.state["molecules"];
    }

    /**
     * Checks if the treeview has changed.
     *
     * @param {IMolContainer[]} allMolecules  The new molecules.
     */
    @Watch("treeview", { immediate: false, deep: true })
    onTreeviewChanged(allMolecules: IMolContainer[]) {
        let promise: Promise<any>;
        if (api.visualization.viewer !== undefined) {
            // Molecular library already loaded.
            promise = Promise.resolve(api.visualization.viewer);
        } else {
            // Need to load the molecular library.
            promise = this.loadAndSetupViewerLibrary().then((viewer: any) => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                window["viewer"] = viewer;

                api.visualization.viewer = viewer;
                return viewer;
            });
        }

        promise
            .then(() => {
                if (allMolecules.length === 0) {
                    // No molecules present
                    this._clearCache();
                    return;
                }

                // Update and zoom
                return this._updateStylesAndZoom();
            })
            .catch((err) => {
                console.log(err);
                return;
            });
    }

    /**
     * Update the styles and zoom of the molecules.
     *
     * @returns {Promise<any>}  A promise that resolves when the styles and
     *    zoom have been updated.
     */
    private _updateStylesAndZoom(): Promise<any> {
        api.messages.waitSpinner(true);
        return this._updateStyleChanges()
            .then((visibleTerminalNodeModels) => {
                this._zoomPerFocus(visibleTerminalNodeModels);
                api.messages.waitSpinner(false);
                return;
            })
            .catch((err) => {
                console.log(err);
                api.messages.waitSpinner(false);
                return;
            });
    }

    /**
     * Clear the cache of molecules and surfaces.
     */
    private _clearCache() {
        for (const id in (this as any).molCache) {
            this._removeModel(id);
        }
        api.visualization.viewer.render();
    }

    /**
     * Remove a model.
     *
     * @param {string} id The id of the model to remove.
     */
    private _removeModel(id: string) {
        const mol = (this as any).molCache[id];

        // Clear any surfaces
        this._clearSurface(id);

        this.removeModel(mol);

        // Remove from cache
        delete (this as any).molCache[id];

        // Note that not calling render here. Need to call it elsewhere fore these
        // changes to appear in 3dmoljs viewer.
    }

    /**
     * Clear the surface associated with a molecule or molecule id.
     *
     * @param {IMolContainer | string} mol  The molecule or molecule id.
     */
    private _clearSurface(mol: IMolContainer | string) {
        const id = typeof mol === "string" ? mol : mol.id;
        if (id && (this as any).surfaces[id]) {
            for (const surface of (this as any).surfaces[id]) {
                this.removeSurface(surface);
                delete (this as any).surfaces[id];
            }
        }
    }

    /**
     * Remove models no longer present in the vuex store molecules variables.
     *
     * @param {IMolContainer[]} terminalNodes  The terminal nodes of the treeview.
     */
    private _removeOldModels(terminalNodes: IMolContainer[]) {
        // Remove any molecules not presently in the terminal nodes.

        // Get the ids of the actual terminal nodes (should have deleted element
        // already removed)
        const idsOfTerminalNodes = terminalNodes.map((node) => node.id);

        // If the user has deleted one, the system has not yet removed it from the
        // cache. Make note of that here.
        const idsOfMolsToDelete: string[] = [];
        for (const molCacheId in (this as any).molCache) {
            if (idsOfTerminalNodes.indexOf(molCacheId) === -1) {
                // There's an id in the cache that isn't in the tree.
                idsOfMolsToDelete.push(molCacheId);
            }
        }

        // Remove it from the cache, viewer, etc.
        idsOfMolsToDelete.forEach((id: string) => {
            this._removeModel(id);
        });
    }

    private lookupMol(mol: IMolContainer): ModelType | undefined {
        if (mol.id === undefined) {
            return undefined;
        }
        return (this as any).molCache[mol.id];
    }

    /**
     * Updates any style changes.
     *
     * @returns {Promise<ModelType[]>}  A promise that resolves the ModelTypes
     * that are visible.
     */
    private _updateStyleChanges(): Promise<ModelType[]> {
        const visibleTerminalNodeModels: ModelType[] = [];
        const terminalNodes = getTerminalNodes(this.treeview);

        this._removeOldModels(terminalNodes);

        // Add all the models and put them in the cache.
        const addMolPromises: Promise<IMolContainer>[] = [];
        for (const molContainer of terminalNodes) {
            const id = molContainer.id as string;

            // If it's not in the cache, the system has probably not yet loaded the
            // molecule. Always load it.
            let addMolPromise: Promise<IMolContainer>;
            if ((this as any).molCache[id]) {
                // Already in cache
                addMolPromise = Promise.resolve(molContainer);
            } else {
                // Not in cache.
                addMolPromise = this.addGLModel(molContainer.model as GLModel)
                    .then((visMol: ModelType) => {
                        (this as any).molCache[id] = visMol;
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

        // All models now loaded. Style them appropriately.
        const surfaceMolContainerPromises: IMolContainer[] = [];
        return Promise.all(addMolPromises)
            .then((molContainers: IMolContainer[]) => {
                const surfacePromises: Promise<any>[] = [];

                for (const molContainer of molContainers) {
                    if (molContainer.visible) {
                        visibleTerminalNodeModels.push(
                            this.lookupMol(molContainer)
                        );
                    }

                    if (!molContainer.viewerDirty) {
                        // If the container isn't dirty, there's no need to apply a
                        // new style.
                        continue;
                    }

                    // You're about to update the style, so mark it as not dirty.
                    molContainer.viewerDirty = false;

                    // If mol is not visible, hide it.
                    if (!molContainer.visible) {
                        // hide it.
                        this.hideMolecule(this.lookupMol(molContainer));

                        // Clear any surfaces associated with this molecule.
                        this._clearSurface(molContainer);

                        continue;
                    }

                    // There are styles to apply. Apply them.
                    if (molContainer.styles) {
                        // Styles to apply, so make sure it's visible.
                        this.showMolecule(this.lookupMol(molContainer));

                        // Clear current styles
                        this.clearMoleculeStyles(this.lookupMol(molContainer));

                        // Clear any surfaces associated with this molecule.
                        this._clearSurface(molContainer);

                        // Add new styles
                        let spheresUsed = false;
                        for (const style of molContainer.styles) {
                            if (!style["surface"]) {
                                // It's a style, not a surface.
                                const convertedStyle = this.convertStyle(style, molContainer);
                                this.setMolecularStyle(
                                    this.lookupMol(molContainer),
                                    this.convertSelection({}),
                                    convertedStyle,
                                    true
                                );
                                if (style.sphere) {
                                    spheresUsed = true;
                                }
                                continue;
                            }

                            // It's a surface. Mark it for adding later.
                            const convertedStyle = this.convertStyle(style, molContainer);
                            surfacePromises.push(
                                this.addSurface(
                                    this.lookupMol(molContainer),
                                    convertedStyle
                                )
                            );
                            surfaceMolContainerPromises.push(molContainer);
                        }

                        // Regardless of specified style, anything not bound to other molecule
                        // should be visible.
                        if (molContainer.styles.length > 0 && !spheresUsed) {
                            // If there's any style, no style is spheres, make sure unbonded
                            // atoms are visible.
                            const convertedStyle = this.convertStyle(unbondedAtomsStyle, molContainer);
                            this.setMolecularStyle(
                                this.lookupMol(molContainer),
                                this.convertSelection({ bonds: 0 }),
                                convertedStyle,
                                true
                            );
                        }

                        continue;
                    }

                    // Visible, but no style specified. This should never happen.
                    this.setMolecularStyle(
                        this.lookupMol(molContainer),
                        this.convertSelection({}),
                        this.convertStyle({ line: {} }, molContainer)
                    );
                    console.warn("error?");
                }
                return Promise.all(surfacePromises);
            })
            .then((surfaces: SurfaceType[]) => {
                for (let i = 0; i < surfaces.length; i++) {
                    const surface = surfaces[i];
                    const molContainer = surfaceMolContainerPromises[i];
                    if (molContainer.id) {
                        (this as any).surfaces[molContainer.id] =
                            (this as any).surfaces[molContainer.id] || [];
                        (this as any).surfaces[molContainer.id].push(surface);
                    }
                }

                return visibleTerminalNodeModels;
            })
            .catch((err) => {
                console.log(err);
                return visibleTerminalNodeModels;
            });
    }

    /**
     * Zoom in on the visible molecules.
     *
     * @param {ModelType[]} visibleTerminalNodeModels  The visible models.
     */
    private _zoomPerFocus(visibleTerminalNodeModels: ModelType[]) {
        let molsToFocus: ModelType[] = [];
        for (const molContainer of getAllNodesFlattened(this.treeview)) {
            if (molContainer.focused) {
                if (!molContainer.nodes) {
                    // Already terminal
                    molsToFocus = [this.lookupMol(molContainer)];
                } else {
                    molsToFocus = getTerminalNodes(molContainer.nodes).map(
                        (n) => this.lookupMol(n)
                    ) as ModelType[];
                }
                break;
            }
        }

        if (molsToFocus.length === 0) {
            molsToFocus = visibleTerminalNodeModels;
        }

        this.renderAll();
        if (this.$store.state["updateZoom"]) {
            this.zoomToModels(molsToFocus);
            // api.visualization.viewer.zoom(0.8);
        }
    }
}
