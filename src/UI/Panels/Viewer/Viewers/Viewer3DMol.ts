import { GLModel } from "../GLModelType";
import { ViewerParent } from "./ViewerParent";
import { dynamicImports } from "@/Core/DynamicImports";
import {
    IArrow,
    IBox,
    ICylinder,
    ISphere,
    IStyle,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    GenericSurfaceType,
    GenericStyleType,
    GenericLabelType,
    GenericRegionType,
} from "./Types";

/**
 * Viewer3DMol
 */
export class Viewer3DMol extends ViewerParent {
    private _mol3dObj: any;
    private _zoomToModelsTimeout: any;
    private _renderAllTimeout: any;

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
        }
    }

    /**
     * Clear the current molecular styles.
     *
     * @param  {string} id  The id of the model to clear the styles of.
     */
    clearMoleculeStyles(id: string) {
        const model = this.lookup(id);
        model.setStyle({}, {});
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
        return this._mol3dObj.addSurface(
            // $3Dmol.SurfaceType.VDW,
            // $3Dmol.SurfaceType.MS,
            2, // surface type $3Dmol.SurfaceType.MS
            style.surface, // style
            { model: model as any } // selection
        );
    }

    /**
     * Adds a model to the viewer. Returns same model, but now it's been added
     * to viewer.
     *
     * @param  {GLModel} model  The model to add.
     * @returns {Promise<GLModel>}  The model that was added.
     */
    addGLModel(model: GLModel): Promise<GLModel> {
        // this._mol3dObj.addRawModel_JDD(model);
        const newMol = this._mol3dObj.addGLModel(model, true);
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
     * Render all the molecules and surfaces currently added to the viewer.
     *
     * @returns {Promise<void>}  A promise that resolves when the molecules and
     *    surfaces are rendered.
     */
    async renderAll(): Promise<void> {
        // This is pretty expensive, I think. Be sure to not call it too often.
        return new Promise((resolve) => {
            // Clear any existing timeout
            if (this._renderAllTimeout) {
                clearTimeout(this._renderAllTimeout);
            }

            // Set a new timeout
            this._renderAllTimeout = setTimeout(() => {
                this._mol3dObj.render();
                resolve();
            }, 1000);
        });
    }

    /**
     * Zoom in on a set of models.
     *
     * @param  {string[]} ids  The models to zoom in on.
     */
    zoomToModels(ids: string[]) {
        // This zooming is quite expensive. Use a timeout to avoid doing it
        // too often.

        // Clear any existing timeout
        if (this._zoomToModelsTimeout) {
            clearTimeout(this._zoomToModelsTimeout);
        }

        // Set a new timeout
        this._zoomToModelsTimeout = setTimeout(() => {
            let models = ids.map((id) => this.lookup(id));
            models = models.filter((model) => model !== undefined);

            // Remove ones that aren't molecules. So can't focus on boxes.
            // Appears to be a limitation of 3dmoljs.
            models = models.filter(
                (model) => model.selectedAtoms !== undefined
            );

            if (models.length > 0) {
                this._mol3dObj.zoomTo({ model: models }, 500, true);
            } else {
                // Zoom to all as backup option. Commented out because if there are
                // regions, this causes problems.
                // this._mol3dObj.zoomTo();
            }
        }, 500);
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
     * @param  {string} lblTxt  The text of the label.
     * @param  {number} x       The x coordinate.
     * @param  {number} y       The y coordinate.
     * @param  {number} z       The z coordinate.
     * @returns {GenericLabelType}  The label.
     */
    addLabel(
        lblTxt: string,
        x: number,
        y: number,
        z: number
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
                inFront: true,
                alignment: "bottomCenter", // 'bottomLeft'
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
    _loadAndSetupViewerLibrary(id: string): Promise<ViewerParent> {
        return dynamicImports.mol3d.module
            .then(($3Dmol: any) => {
                const viewer = $3Dmol.createViewer(id, {
                    defaultcolors: $3Dmol.rasmolElementColors,
                });
                viewer.setBackgroundColor(0xffffff);
                this._mol3dObj = viewer;

                // Changing the thickness of the fog doesn't seem to be possible.
                this._mol3dObj.enableFog(true);

                // Adding subtle outline makes things easier to see.
                viewer.setViewStyle({style:"outline", width: 0.02});

                return this as ViewerParent;
            })
            .catch((err: any) => {
                throw err;
                // return this as ViewerParent;
            });
    }

    /**
     * Converts the 3DMoljs style stored in the molecules tree to a style format
     * compatible with this viewer.
     *
     * @param {IStyle} style  The style to convert.
     * @returns {IStyle}  The converted style.
     */
    convertStyle(style: IStyle): IStyle {
        // Already in 3Dmoljs format, so no conversion needed.
        return style;
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
}
