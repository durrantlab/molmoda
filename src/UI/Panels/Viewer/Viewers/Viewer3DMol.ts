import { GLModel } from "../GLModelType";
import { ViewerParent } from "./ViewerParent";
import { dynamicImports } from "@/Core/DynamicImports";
import { IStyle } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { SurfaceType, StyleType, LabelType } from "./Types";

/**
 * Viewer3DMol
 */
export class Viewer3DMol extends ViewerParent {
    private _mol3dObj: any;

    /**
     * Removes a model from the viewer.
     *
     * @param  {string} id  The id of the model to remove.
     */
    _removeModel(id: string) {
        // remove from viewer
        const mol = this.lookupMol(id);
        this._mol3dObj.removeModel(mol);
    }

    /**
     * Removes a surface from the viewer.
     *
     * @param  {SurfaceType} surface  The surface to remove.
     */
    removeSurface(surface: SurfaceType) {
        this._mol3dObj.removeSurface(surface);
    }

    /**
     * Hide a model.
     *
     * @param  {string} id  The model to hide.
     */
    hideMolecule(id: string) {
        const model = this.lookupMol(id);
        model.hide();
    }

    /**
     * Show a model.
     *
     * @param  {string} id  The id of the model to show.
     */
    showMolecule(id: string) {
        const model = this.lookupMol(id);
        model.show();
    }

    /**
     * Clear the current molecular styles.
     *
     * @param  {string} id  The id of the model to clear the styles of.
     */
    clearMoleculeStyles(id: string) {
        const model = this.lookupMol(id);
        model.setStyle({}, {});
    }

    /**
     * Sets the style of a molecule. TODO: good to not use any type for selection.
     *
     * @param  {string}     id           The id of the model to set the style of.
     * @param  {any}        selection    The selection to apply the style to.
     * @param  {StyleType}  style        The style to apply.
     * @param  {boolean}    [add=false]  Whether to add the style to the existing
     *                                   styles. If false, replaces the existing
     *                                   style.
     */
    setMolecularStyle(
        id: string,
        selection: any,
        style: StyleType,
        add = false
    ) {
        const model = this.lookupMol(id);
        model.setStyle(selection, style, add);
    }

    /**
     * Adds a surface to the given model.
     *
     * @param  {string}     id     The id of the model to add the surface to.
     * @param  {StyleType}  style  The style of the surface.
     * @returns {Promise<SurfaceType>}  A promise that resolves when the
     *     surface.
     */
    _addSurface(id: string, style: StyleType): Promise<SurfaceType> {
        // NOTE: any in the promise is the surface object.
        const model = this.lookupMol(id);
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
        this._mol3dObj.addRawModel_JDD(model);
        return Promise.resolve(model);
    }

    /**
     * Render all the molecules and surfaces currently added to the viewer.
     */
    renderAll() {
        this._mol3dObj.render();
    }

    /**
     * Zoom in on a set of models.
     *
     * @param  {string[]} ids  The models to zoom in on.
     */
    zoomToModels(ids: string[]) {
        const models = ids.map((id) => this.lookupMol(id));
        this._mol3dObj.zoomTo({ model: models }, 500, true);
    }

    /**
     * Zoom in on a specific point.
     *
     * @param  {number} x  The x coordinate.
     * @param  {number} y  The y coordinate.
     * @param  {number} z  The z coordinate.
     */
    zoomToPoint(x: number, y: number, z: number) {
        this._mol3dObj.zoomTo({ x: x, y: y, z: z }, 500, true);
    }

    /**
     * Adds a label to the viewer
     *
     * @param  {string} lblTxt  The text of the label.
     * @param  {number} x       The x coordinate.
     * @param  {number} y       The y coordinate.
     * @param  {number} z       The z coordinate.
     * @returns {LabelType}  The label.
     */
    addLabel(lblTxt: string, x: number, y: number, z: number): LabelType {
        return this._mol3dObj.addLabel(
            // TODO:
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
     * @param  {LabelType} label  The label to remove.
     */
    removeLabel(label: LabelType) {
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
    loadAndSetupViewerLibrary(id: string): Promise<ViewerParent> {
        return dynamicImports.mol3d.module
            .then(($3Dmol: any) => {
                const viewer = $3Dmol.createViewer(id, {
                    defaultcolors: $3Dmol.rasmolElementColors,
                });
                viewer.setBackgroundColor(0xffffff);
                this._mol3dObj = viewer;

                console.warn('viewer.setViewStyle({style:"outline"})');

                return this as ViewerParent;
            })
            .catch((err: any) => {
                console.log(err);
                return this as ViewerParent;
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
}
