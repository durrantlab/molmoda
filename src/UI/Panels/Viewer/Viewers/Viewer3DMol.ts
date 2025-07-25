import { GLModel } from "../GLModelType";
import { ViewerParent } from "./ViewerParent";
import { dynamicImports } from "@/Core/DynamicImports";
import {
    IArrow,
    IAtom,
    IBox,
    ICylinder,
    ISphere,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    GenericSurfaceType,
    GenericStyleType,
    GenericLabelType,
    GenericRegionType,
} from "./Types";
import { IFileInfo } from "@/FileSystem/Types";
import { FileInfo } from "@/FileSystem/FileInfo";
import { getFormatInfoGivenType } from "@/FileSystem/LoadSaveMolModels/Types/MolFormats";
import { convertIAtomsToIFileInfoPDB } from "@/FileSystem/LoadSaveMolModels/ConvertMolModels/_ConvertIAtoms";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { ISelAndStyle } from "@/Core/Styling/SelAndStyleInterfaces";
import { getNamedPastelColor } from "@/Core/Styling/Colors/ColorUtils";
import { waitForCondition } from "@/Core/Utils/MiscUtils";

/**
 * Viewer3DMol
 */
export class Viewer3DMol extends ViewerParent {
    public _mol3dObj: any; // public to make debugging easier
    // private _zoomToModelsTimeout: any;
    // New properties for hybrid debounce
    private _renderCooldownTimer: number | null = null;
    private _renderTrailingEdgeTimer: number | null = null;
    private _isInRenderCooldown = false;

    // Time after initial (immediate) render before we allow another render. In
    // other words, cooldown after an immediate render.
    private readonly RENDER_COOLDOWN_MS = 500;

    // Time to wait for the trailing render after the last call in a burst. This
    // is the time after the last call before we render again. In other words,
    // wait time for the trailing render.
    private readonly RENDER_DEBOUNCE_MS = 1000;
    
    // Keep track of labels on regions so you can show and hide them with the
    // region itself.
    private _regionLabels: { [key: string]: GenericLabelType } = {};

    /**
     * Removes a model from the viewer.
     *
     * @param  {string} id  The id of the model to remove.
     */
    _removeModel(id: string) {
        // remove from viewer
        const mol = this.lookup(id);
        if (mol) {
            this._mol3dObj.removeModel(mol);

            // Remove from cache too
            this.molCache[id] = null;
            delete this.molCache[id];
        }
    }

    /**
     * Removes a region from the viewer.
     *
     * @param  {string} id  The id of the region to remove.
     * @returns {void}
     */
    _removeRegion(id: string) {
        // remove from viewer
        const region = this.lookup(id);
        if (region) {
            this._mol3dObj.removeShape(region);

            // Also remove label
            this.destroyRegionLabel(id);
        }
    }

    /**
     * Removes a surface from the viewer.
     *
     * @param  {GenericSurfaceType} surface  The surface to remove.
     */
    removeSurface(surface: GenericSurfaceType) {
        // Note: This is also used when you hide the associated molecule (to
        // remove the surface).
        this._mol3dObj.removeSurface(surface);
    }

    /**
     * Hide a model.
     *
     * @param  {string} id  The model to hide.
     */
    hideMolecule(id: string) {
        const model = this.lookup(id);
        if (model) {
            model.hide();

            // also remove it to free up memory, at the cost of speed.
            this._removeModel(id);
        }
    }

    /**
     * Hide a region.
     *
     * @param  {string} id  The region to hide.
     */
    hideRegion(id: string) {
        const region = this.lookup(id);
        if (region) {
            region.hidden = true;
            this.destroyRegionLabel(id);
        }
    }

    /**
     * Show a model.
     *
     * @param  {string} id  The id of the model to show.
     */
    showMolecule(id: string) {
        const model = this.lookup(id);
        if (model) {
            model.show();
            // this.renderAll();
        }
    }

    /**
     * Show a region.
     *
     * @param  {string} id  The id of the region to show.
     * @param  {number} opacity  The opacity to show the region at.
     */
    showRegion(id: string, opacity: number) {
        const region = this.lookup(id);
        if (region) {
            region.hidden = false;
            region.opacity = opacity;

            // Note that makeRegionLabel called separately from parent.
        }
    }

    /**
     * Create a label for a region.
     *
     * @param {string} id    The id of the region.
     * @param {string} text  The text of the label.
     */
    createRegionLabel(id: string, text: string) {
        const region = this.lookup(id);
        if (region) {
            console.log("CREATE: ", id, text);

            // Delete old label
            this.destroyRegionLabel(id);

            // Make new one
            this._regionLabels[id] = this.addLabel(
                text,
                region.x,
                region.y,
                region.z,
                "center",
                14
                // false
            );
        }
    }

    /**
     * Destroy a region label.
     *
     * @param {string} id  The id of the region.
     */
    destroyRegionLabel(id: string) {
        // Delete old label
        if (this._regionLabels[id]) {
            console.log("DESTROY: ", id);
            this.removeLabel(this._regionLabels[id]);
            delete this._regionLabels[id];
        }
    }

    /**
     * Clear the current molecular styles.
     *
     * @param  {string} id  The id of the model to clear the styles of.
     */
    clearMoleculeStyles(id: string) {
        const model = this.lookup(id);

        if (model && model.setStyle) {
            // because regions don't have setStyle
            model.setStyle({}, {});
        }
    }

    /**
     * Sets the style of a molecule. TODO: good to not use any type for selection.
     *
     * @param  {string}     id           The id of the model to set the style of.
     * @param  {any}        selection    The selection to apply the style to.
     * @param  {GenericStyleType}  style        The style to apply.
     * @param  {boolean}    [add=false]  Whether to add the style to the existing
     *                                   styles. If false, replaces the existing
     *                                   style.
     */
    setMolecularStyle(
        id: string,
        selection: any,
        style: GenericStyleType,
        add = false
    ) {
        const model = this.lookup(id);
        if (model && model.setStyle) {
            model.setStyle(selection, style, add);
        }
    }

    /**
     * Adds a surface to the given model.
     *
     * @param  {string}     id     The id of the model to add the surface to.
     * @param  {GenericStyleType}  style  The style of the surface.
     * @returns {Promise<GenericSurfaceType>}  A promise that resolves when the
     *     surface.
     */
    _addSurface(
        id: string,
        style: GenericStyleType
    ): Promise<GenericSurfaceType> {
        // NOTE: any in the promise is the surface object.
        const model = this.lookup(id);
        let atomSelectionForSurface = { model: model as any }; // Default to all atoms in the model

        // Check if a more specific selection is provided in ISelAndStyle
        // The selection object from ISelAndStyle (e.g., {resn: "LYS"})
        // is compatible with 3Dmol.js selection specification when
        // model context is also provided.
        if (style.selection && Object.keys(style.selection).length > 0) {
            atomSelectionForSurface = {
                ...this.convertSelection(style.selection), // convertSelection is currently identity
                model: model as any, // Ensure the model context is part of the selection
            };
        }

        return this._mol3dObj.addSurface(
            2, // surface type $3Dmol.SurfaceType.MS (Molecular Surface)
            style.surface, // style for the surface itself (e.g., color, opacity)
            atomSelectionForSurface // selection of atoms to base the surface on
        );
    }

    // updateSurfaceStyle(id: string, style: GenericStyleType): void {
    //     // debugger;
    //     const surfaceIdx = this.surfaces[id];
    //     if (surfaceIdx) {
    //         const tmp = this._mol3dObj.setSurfaceMaterialStyle(surfaceIdx, JSON.parse(JSON.stringify(style.surface)));
    //         // debugger;
    //         this.renderAll();
    //     }
    // }

    /**
     * Adds a model to the viewer. Returns same model, but now it's been added
     * to viewer.
     *
     * @param  {GLModel} model  The model to add.
     * @returns {Promise<GLModel>}  The model that was added.
     */
    addModel(model: IAtom[] | IFileInfo): Promise<GLModel> {
        if (
            (model as IFileInfo).name === undefined &&
            (model as IFileInfo).contents === undefined
        ) {
            // This should rarely occur. The model should be an IFileInfo with
            // the text of the model. But if loading old MolModa files, it might
            // be IAtom[]. Convert to pdb text so these old files load.

            model = convertIAtomsToIFileInfoPDB(model as IAtom[]);
        }

        // Get the format
        const typ = new FileInfo(model as IFileInfo).getFileType();
        const format = getFormatInfoGivenType(typ as string);
        const ext = format?.primaryExt;

        const newMol = this._mol3dObj.addModel(
            (model as IFileInfo).contents,
            ext,
            {
                keepH: true,
            }
        );

        // Remove all styles
        newMol.setStyle({}, {});

        return Promise.resolve(newMol);
    }

    /**
     * Adds a sphere to the viewer.
     *
     * @param  {ISphere} region  The sphere to add.
     * @returns {GenericRegionType}  The sphere that was added.
     */
    addSphere(region: ISphere): Promise<GenericRegionType> {
        const sphere = this._mol3dObj.addSphere({
            center: {
                x: region.center[0],
                y: region.center[1],
                z: region.center[2],
            },
            radius: region.radius,
            color: region.color,
        });
        this._setRegionOpacity(sphere, region?.opacity);
        return Promise.resolve(sphere);
    }

    /**
     * Adds a box to the viewer.
     *
     * @param  {IBox} region  The box to add.
     * @returns {GenericRegionType}  The box that was added.
     */
    addBox(region: IBox): Promise<GenericRegionType> {
        const dimens = region.dimensions as number[];
        const center = region.center as number[];
        const box = this._mol3dObj.addBox({
            corner: {
                x: center[0] - 0.5 * dimens[0],
                y: center[1] - 0.5 * dimens[1],
                z: center[2] - 0.5 * dimens[2],
            },
            dimensions: {
                w: dimens[0],
                h: dimens[1],
                d: dimens[2],
            },
            color: region.color,
        });

        this._setRegionOpacity(box, region?.opacity);

        return Promise.resolve(box);
    }

    /**
     * Adds a arrow to the viewer.
     *
     * @param  {IArrow} region  The arrow to add.
     * @returns {GenericRegionType}  The arrow that was added.
     */
    addArrow(region: IArrow): Promise<GenericRegionType> {
        const arrow = this._mol3dObj.addArrow({
            start: {
                x: region.center[0],
                y: region.center[1],
                z: region.center[2],
            },
            end: {
                x: region.endPt[0],
                y: region.endPt[1],
                z: region.endPt[2],
            },
            radius: region.radius,
            color: region.color,
            radiusRatio: region.radiusRatio,
        });
        this._setRegionOpacity(arrow, region?.opacity);
        return Promise.resolve(arrow);
    }

    /**
     * Adds a cylinder to the viewer.
     *
     * @param  {ICylinder} region  The cylinder to add.
     * @returns {GenericRegionType}  The cylinder that was added.
     */
    addCylinder(region: ICylinder): Promise<GenericRegionType> {
        const cylinder = this._mol3dObj.addCylinder({
            start: {
                x: region.center[0],
                y: region.center[1],
                z: region.center[2],
            },
            end: {
                x: region.endPt[0],
                y: region.endPt[1],
                z: region.endPt[2],
            },
            radius: region.radius,
            color: region.color,
            fromCap: 2,
            toCap: 2,
            dashed: region.dashed,
        });
        this._setRegionOpacity(cylinder, region?.opacity);
        return Promise.resolve(cylinder);
    }

    /**
     * Sets the opacity of a region.
     *
     * @param {any}                region    The region to set the opacity of.
     * @param {number | undefined} opacity  The opacity to set.
     */
    private _setRegionOpacity(region: any, opacity: number | undefined) {
        setTimeout(() => {
            // Not sure why, but this needs to be in a setTimeout for the
            // opacity to actually change.
            region.opacity = opacity || 0.8;
            this.renderAll();
        }, 0);
    }

    /**
     * Performs the actual render call to 3dmol.js. This is separated from the
     * scheduling logic in `renderAll`.
     */
    private _performRender(): void {
        if (this._mol3dObj) {
            this._mol3dObj.render();
        }
    }
    /**
     * Schedules a render of the viewer. This uses a hybrid "leading-edge"
     * debounce strategy. The first call in a series triggers an immediate
     * render. Subsequent calls within a short cooldown period are debounced,
     * meaning only the last one in the burst will trigger a render after the
     * cooldown. This provides immediate feedback while preventing performance
     * issues from too many render calls in rapid succession.
     *
     * @returns {Promise<void>} A promise that resolves immediately, as the
     *   render is scheduled asynchronously.
     */
    public renderAll(): Promise<void> {
        // If we are NOT in a cooldown period, render immediately.
        if (!this._isInRenderCooldown) {
            this._performRender();
            this._isInRenderCooldown = true;
            // Clear any existing cooldown timer.
            if (this._renderCooldownTimer) {
                clearTimeout(this._renderCooldownTimer);
            }
            // Set a timer to end the cooldown period.
            this._renderCooldownTimer = window.setTimeout(() => {
                this._isInRenderCooldown = false;
                this._renderCooldownTimer = null;
            }, this.RENDER_COOLDOWN_MS);
        } else {
            // We ARE in a cooldown period. Schedule a trailing-edge render.
            // Clear any previously scheduled trailing-edge render to debounce.
            if (this._renderTrailingEdgeTimer) {
                clearTimeout(this._renderTrailingEdgeTimer);
            }
            // Schedule a new one to run after a short delay.
            this._renderTrailingEdgeTimer = window.setTimeout(() => {
                this._performRender();
                this._renderTrailingEdgeTimer = null;
            }, this.RENDER_DEBOUNCE_MS);
        }
        return Promise.resolve();
    }

    /**
     * Get the molecules for zooming. This is used to zoom in on a set of
     * models. It filters out any models that are not molecules (i.e., those
     * that do not have a `selectedAtoms` method).
     *
     * @param {string[]} ids  The ids of the models to get.
     * @returns {GLModel[]}  The models that can be zoomed in on.
     */
    private _getMolsForZooming(ids: string[]): GLModel[] {
        let models = ids.map((id) => this.lookup(id));
        models = models.filter((model) => model !== undefined);

        // Remove ones that aren't molecules. So can't focus on boxes.
        // Appears to be a limitation of 3dmoljs.
        models = models.filter((model) => model.selectedAtoms !== undefined);
        return models;
    }

    /**
     * Zoom in on a set of models.
     *
     * @param  {string[]} ids  The models to zoom in on.
     */
    async zoomToModels(ids: string[]) {
        // This zooming is quite expensive. Use a timeout to avoid doing it
        // too often.

        let models: GLModel[] = [];
        const startTime = performance.now();

        await waitForCondition(() => {
            models = this._getMolsForZooming(ids);
            const elapsedTime = performance.now() - startTime;
            return models.length > 0 || elapsedTime > 5000; // Wait for five seconds max.
        }, 100);

        // If no models found, don't zoom.
        if (models.length === 0) {
            return;
        }

        this._mol3dObj.zoomTo({ model: models.map((m) => m.id) }, 750, true);

        // // Clear any existing timeout
        // if (this._zoomToModelsTimeout) {
        //     clearTimeout(this._zoomToModelsTimeout);
        // }

        // // Set a new timeout
        // this._zoomToModelsTimeout = setTimeout(() => {
        //     debugger
        //     this._mol3dObj.zoomTo({ model: models }, 500, true);
        //     // if (models.length > 0) {
        //     // } else {
        //     //     // Zoom to all as backup option. Commented out because if there are
        //     //     // regions, this causes problems.
        //     //     // this._mol3dObj.zoomTo();
        //     // }
        // }, 500);
    }

    /**
     * Zoom in on a specific point.
     *
     * @param  {number} x  The x coordinate.
     * @param  {number} y  The y coordinate.
     * @param  {number} z  The z coordinate.
     */
    centerOnPoint(x: number, y: number, z: number) {
        // this._mol3dObj.zoomTo({ x: x, y: y, z: z }, 500, true);
        this._mol3dObj.center({ x: x, y: y, z: z }, 500, false);
    }

    /**
     * Adds a label to the viewer
     *
     * @param  {string} lblTxt                      The text of the label.
     * @param  {number} x                           The x coordinate.
     * @param  {number} y                           The y coordinate.
     * @param  {number} z                           The z coordinate.
     * @param  {string} [alignment="bottomCenter"]  The alignment of the label.
     * @param  {number} [fontSize=18]               The font size of the label.
     * @param  {boolean} [inFront=true]             Whether the label should be
     *                                              in front of the molecule.
     * @returns {GenericLabelType}  The label.
     */
    addLabel(
        lblTxt: string,
        x: number,
        y: number,
        z: number,
        alignment = "bottomCenter",
        fontSize = 18,
        inFront = true
    ): GenericLabelType {
        return this._mol3dObj.addLabel(
            lblTxt,
            // https://3dmol.csb.pitt.edu/doc/types.html#LabelSpec
            {
                position: { x: x, y: y, z: z },
                backgroundColor: "white",
                fontColor: "black",
                borderThickness: 1,
                borderColor: "black",
                backgroundOpacity: 0.9,
                // screenOffset: $3Dmol.Vector2(10, 10),
                inFront: inFront,
                alignment: alignment, // 'bottomLeft'
                fontSize: fontSize,
            }
        );
    }

    /**
     * Removes a label from the viewer.
     *
     * @param  {GenericLabelType} label  The label to remove.
     */
    removeLabel(label: GenericLabelType) {
        this._mol3dObj.removeLabel(label);
    }

    /**
     * Load 3dmol.js dynamically, set the viewer object, etc.
     *
     * @param  {string} id  The HTML Dom id of the element to load the viewer
     *                      into.
     * @returns {Promise<any>}  A promise that resolves the viewer object when
     *     3dmol.js is loaded.
     */
    async _loadAndSetupViewerLibrary(id: string): Promise<ViewerParent> {
        const $3Dmol: any = await dynamicImports.mol3d.module;

        // Wait for the DOM element to be present before attempting to create the viewer.
        await waitForCondition(() => document.getElementById(id) !== null, 100);

        const viewer = $3Dmol.createViewer(id, {
            defaultcolors: $3Dmol.rasmolElementColors,
        });

        // If viewer creation fails even after the DOM element is present, it's
        // likely a critical error. But let's keep waiting.
        await waitForCondition(
            () => viewer !== null && viewer !== undefined,
            100
        );

        viewer.setBackgroundColor(0xffffff);
        this._mol3dObj = viewer;

        // Changing the thickness of the fog doesn't seem to be
        // possible. Also examined the libarry code with llm, which
        // confirmed fog near/far values cannot be set externally.
        this._mol3dObj.enableFog(true);

        // Adding subtle outline makes things easier to see.
        viewer.setViewStyle({ style: "outline", width: 0.02 });

        return this as ViewerParent;
    }

    /**
     * Converts the 3DMoljs style stored in the molecules tree to a style format
     * compatible with this viewer.
     *
     * @param {ISelAndStyle}   style     The style to convert.
     * @param {TreeNode} treeNode  The treenode associated with the style.
     * @returns {ISelAndStyle}  The converted style.
     */
    convertStyle(style: ISelAndStyle, treeNode: TreeNode): ISelAndStyle {
        // Process style if it contains any @byMolecule colors
        if (treeNode.id !== undefined && this._containsByMoleculeColor(style)) {
            const processedStyle = this._processStyleColors(style, treeNode.id);
            style = processedStyle;
        }
        return style;
    }

    /**
     * Recursively checks if a style object contains any @byMolecule colors
     *
     * @param {any} obj The object to check
     * @returns {boolean} Whether the object contains any @byMolecule colors
     */
    private _containsByMoleculeColor(obj: any): boolean {
        if (!obj || typeof obj !== "object") {
            return false;
        }

        return Object.entries(obj).some(([_, value]) => {
            if (value === "@byMolecule") {
                return true;
            }
            if (typeof value === "object") {
                return this._containsByMoleculeColor(value);
            }
            return false;
        });
    }

    /**
     * Recursively processes a style object, replacing any @byMolecule colors
     * with the actual molecule color
     *
     * @param {any}    obj         The style object to process
     * @param {string} moleculeId  The ID of the molecule to get the color for
     * @returns {Record<string, any>} The processed style object
     */
    private _processStyleColors(
        obj: any,
        moleculeId: string
    ): Record<string, any> {
        if (!obj || typeof obj !== "object") {
            return obj;
        }

        const result: Record<string, any> = Array.isArray(obj) ? [] : {};

        let allMols: TreeNodeList | undefined = undefined;

        Object.entries(obj).forEach(([key, value]) => {
            if (value === "@byMolecule") {
                if (allMols === undefined) {
                    allMols = getMoleculesFromStore().flattened;
                }
                const treeNode = allMols.find((node) => node.id === moleculeId);
                let colorId = moleculeId;
                if (treeNode !== undefined) {
                    // Associated treenode found. Get it's top-most ancestor.
                    const topAncestor = treeNode.getAncestry(allMols).nodes[0];
                    colorId = topAncestor.id || moleculeId;
                }
                result[key] = getNamedPastelColor(colorId);
            } else if (typeof value === "object") {
                result[key] = this._processStyleColors(value, moleculeId);
            } else {
                result[key] = value;
            }
        });

        return result;
    }

    /**
     * Converts a 3DMoljs selection to the selection format compatible with this
     * viewer.
     *
     * @param {any} sel  The selection to convert.
     * @returns {any}  The converted selection.
     */
    convertSelection(sel: any): any {
        // Already in 3Dmoljs format, so no conversion needed.
        return sel;
    }

    /**
     * Gets the data uri of the current view (png).
     *
     * @returns {Promise<string>}  A promise that resolves to the data uri.
     */
    pngURI(): Promise<string> {
        return Promise.resolve(this._mol3dObj.pngURI());
    }

    /**
     * Unloads the viewer (from the DOM, etc.).
     */
    unLoad() {
        // this._mol3dObj.clear();
        this._mol3dObj = null;
    }

    /**
     * Makes atoms NOT responsive to mouse hovering and clicking.
     *
     * @param {GLModel} model  The model to make atoms NOT hoverable and
     *                         clickable.
     */
    makeAtomsNotClickable(model: GLModel) {
        model.setClickable({}, false);

        // Above doesn't remove the callback, which I think can take up quite a
        // bit of space. Let's remove it. NOTE: In practice, this occasionally
        // causes an error.

        // model.selectedAtoms({}).forEach((atom: any) => {
        //     if (atom.callback) {
        //         delete atom.callback;
        //     }
        // });
    }

    /**
     * Makes atoms react when clicked.
     *
     * @param {GLModel}  model     The model to make clickable.
     * @param {Function} callBack  Function that runs when atom is clicked. The
     *                             function is passed the x, y, and z
     *                             coordinates of the atom.
     */
    makeAtomsClickable(
        model: GLModel,
        callBack: (x: number, y: number, z: number) => any
    ) {
        // Remove existing clickable
        this.makeAtomsNotClickable(model);

        model.setClickable(
            {},
            true,
            (atom: any /* _viewer: any, _event: any, _container: any */) => {
                this.centerOnPoint(atom.x, atom.y, atom.z);
                setTimeout(() => {
                    // Delay the callback so that the centering has time to
                    // finish.
                    callBack(atom.x, atom.y, atom.z);
                }, 1000);
            }
        );
        this.renderAll();
    }

    /**
     * Makes atoms NOT react when mouse moves over then (NOT hoverable).
     *
     * @param {GLModel} model  The model to make NOT hoverable.
     */
    makeAtomsNotHoverable(model: GLModel) {
        model.setHoverable({}, false);

        // Below doesn't remove callbacks. They take up quite a bit of memory, I
        // think. Let's remove them. NOTE: In practice, this occasionally causes
        // an error.
        // model.selectedAtoms({}).forEach((atom: any) => {
        //     if (atom.hover_callback) {
        //         delete atom.hover_callback;
        //     }
        //     if (atom.unhover_callback) {
        //         delete atom.unhover_callback;
        //     }
        // });
    }

    /**
     * Makes atoms react when mouse moves over then (hoverable).
     *
     * @param {GLModel}  model               The model to make hoverable.
     * @param {Function} onHoverInCallBack   Function that runs when hover over
     *                                       atom starts.
     * @param {Function} onHoverOutCallBack  Function that runs when hover over
     *                                       atom ends.
     */
    makeAtomsHoverable(
        model: GLModel,
        onHoverInCallBack: (x: number, y: number, z: number) => any,
        onHoverOutCallBack: () => any
    ) {
        this.makeAtomsNotHoverable(model);

        model.setHoverable(
            {},
            true,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            (atom: any, viewer: any, _event: any, _container: any) => {
                if (!atom.label) {
                    const lblTxt = this.hoverLabelText(
                        atom.chain,
                        atom.resn,
                        atom.resi,
                        atom.atom
                    );

                    if (lblTxt) {
                        atom.label = this.addLabel(
                            lblTxt,
                            atom.x,
                            atom.y,
                            atom.z
                        );
                    }
                }
                onHoverInCallBack(atom.x, atom.y, atom.z);
            },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            (atom: any, _viewer: any, _event: any, _container: any) => {
                if (atom.label) {
                    setTimeout(() => {
                        this.removeLabel(atom.label);
                        delete atom.label;
                    }, 1000);
                }
                onHoverOutCallBack();
            }
        );
    }

    /**
     * Gets a VRML model of the current scene. But not implemented for NGL.
     *
     * @returns {string}  The VRML string.
     */
    exportVRML(): string {
        // for (const model of this._mol3dObj.models) {
        //     this.makeAtomsHoverable(
        //         model,
        //         () => {
        //             alert("hi");
        //         },
        //         () => {
        //             alert("bye");
        //         }
        //     );
        // }
        return this._mol3dObj.exportVRML();
    }

    /**
     * Exports the VRML for each model in the viewer.
     *
     * @param {boolean} [simplify=false]  Whether to simplify the VRML.
     * @returns {string[][]}  The VRML for each model.
     */
    async exportVRMLPerModel(simplify = false): Promise<[string, string][]> {
        // const vrmls: {[id: string]: string} = {};
        const vrmls: [string, string][] = [];

        let simpParams = {};
        let surfaceSimpParams = {};

        if (simplify === true) {
            // If simplify is true, we need to merge the vertices and reduce the
            // precision of the VRML, etc.
            simpParams = {
                mergeVertices: 0.1, // NOTE: 0.1 is lowest value that still looks good.
                removeOrphanVertexes: true,
                precision: 2, // NOTE: at 1, starts to degrade.
                sphereQuality: 1, // NOTE this is good enough
                cylinderSubdivisions: 3, // NOTE: minimum to get a decent cylinder
                cylinderHeightSegments: 4, // NOTE: must be even, four is good enough
                cartoonQuality: 5, // NOTE: Minimum to get a decent cartoon,
                minimizeWhiteSpace: true,
            };

            surfaceSimpParams = {
                mergeVertices: 0.5, // NOTE: 0.1 is lowest value that still looks good.
                precision: 2, // NOTE: at 1, starts to degrade.
                removeOrphanVertexes: true,
                minimizeWhiteSpace: true,
                simplifySurfaces: 0.7,
                smoothSurfaces: 1,
            };
        }

        // Get all the models
        for (const id in this.molCache) {
            const model = this.lookup(id);
            if (model) {
                vrmls.push([id, model.exportVRML(simpParams)]);
            }
        }

        // Do the same for surfaces
        for (const id in this.surfaces) {
            const surfaceIds = this.surfaces[id];
            for (const surfaceId of surfaceIds) {
                const surfaces = this._mol3dObj.getSurface(surfaceId);
                for (const surface of surfaces) {
                    vrmls.push([id, surface.lastGL.vrml(surfaceSimpParams)]);
                }
            }
        }

        return vrmls;
    }

    /**
     * Sets up a callback that runs every time the view changes.
     *
     * @param {Function} callback  The callback to run.
     */
    _registerViewChangeCallback(callback: (view: number[]) => void) {
        // NOTE: The below slows things down quite a bit, I think. Don't use it.
        // this._mol3dObj.setViewChangeCallback(callback);

        let lastViewSum = this.getView().reduce((a, b) => a + b, 0);

        setInterval(() => {
            const newView = this.getView();
            const newViewSum = newView.reduce((a, b) => a + b, 0);
            if (newViewSum !== lastViewSum) {
                lastViewSum = newViewSum;
                callback(newView);
            }
        }, 1000);
    }

    /**
     * Gets the current view.
     *
     * @returns {number[]}  The view.
     */
    getView(): number[] {
        return this._mol3dObj.getView();
    }

    /**
     * Sets the view.
     *
     * @param {number[]} view  The view to set.
     */
    setView(view: number[]) {
        this._mol3dObj.setView(view);
    }
}
