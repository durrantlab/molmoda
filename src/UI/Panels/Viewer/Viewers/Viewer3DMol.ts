import { GLModel } from "../GLModelType";
import { ViewerParent } from "./ViewerParent";
import { dynamicImports } from "@/Core/DynamicImports";
import {
    IArrow,
    IBox,
    ICylinder,
    IShape,
    ISphere,
    IStyle,
} from "@/UI/Navigation/TreeView/TreeInterfaces";
import {
    GenericSurfaceType,
    GenericStyleType,
    GenericLabelType,
    GenericShapeType,
} from "./Types";

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
        const mol = this.lookup(id);
        if (mol) {
            this._mol3dObj.removeModel(mol);
        }
    }

    /**
     * Removes a shape from the viewer.
     *
     * @param  {string} id  The id of the shape to remove.
     * @returns {void}
     */
    _removeShape(id: string) {
        // remove from viewer
        const shape = this.lookup(id);
        if (shape) {
            this._mol3dObj.removeShape(shape);
        }
    }

    /**
     * Removes a surface from the viewer.
     *
     * @param  {GenericSurfaceType} surface  The surface to remove.
     */
    removeSurface(surface: GenericSurfaceType) {
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
     * Hide a shape.
     *
     * @param  {string} id  The shape to hide.
     */
    hideShape(id: string) {
        const shape = this.lookup(id);
        if (shape) {
            shape.opacity = 0;
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
        }
    }

    /**
     * Show a shape.
     *
     * @param  {string} id  The id of the shape to show.
     * @param  {number} opacity  The opacity to show the shape at.
     */
    showShape(id: string, opacity: number) {
        const shape = this.lookup(id);
        if (shape) {
            shape.opacity = opacity;
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
        this._mol3dObj.addRawModel_JDD(model);
        return Promise.resolve(model);
    }

    /**
     * Adds a sphere to the viewer.
     *
     * @param  {ISphere} shape  The sphere to add.
     * @returns {GenericShapeType}  The sphere that was added.
     */
    addSphere(shape: ISphere): Promise<GenericShapeType> {
        const sphere = this._mol3dObj.addSphere({
            center: {
                x: shape.center[0],
                y: shape.center[1],
                z: shape.center[2],
            },
            radius: shape.radius,
            color: shape.color,
        });
        this.setShapeOpacity(sphere, shape?.opacity);
        return Promise.resolve(sphere);
    }

    /**
     * Adds a box to the viewer.
     *
     * @param  {IBox} shape  The box to add.
     * @returns {GenericShapeType}  The box that was added.
     */
    addBox(shape: IBox): Promise<GenericShapeType> {
        const dimens = shape.dimensions as number[];
        const center = shape.center as number[];
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
            color: shape.color,
        });
        this.setShapeOpacity(box, shape?.opacity);
        return Promise.resolve(box);
    }

    /**
     * Adds a arrow to the viewer.
     *
     * @param  {IArrow} shape  The arrow to add.
     * @returns {GenericShapeType}  The arrow that was added.
     */
    addArrow(shape: IArrow): Promise<GenericShapeType> {
        const arrow = this._mol3dObj.addArrow({
            start: {
                x: shape.center[0],
                y: shape.center[1],
                z: shape.center[2],
            },
            end: {
                x: shape.endPt[0],
                y: shape.endPt[1],
                z: shape.endPt[2],
            },
            radius: shape.radius,
            color: shape.color,
            radiusRatio: shape.radiusRatio,
        });
        this.setShapeOpacity(arrow, shape?.opacity);
        return Promise.resolve(arrow);
    }

    /**
     * Adds a cylinder to the viewer.
     *
     * @param  {ICylinder} shape  The cylinder to add.
     * @returns {GenericShapeType}  The cylinder that was added.
     */
    addCylinder(shape: ICylinder): Promise<GenericShapeType> {
        const cylinder = this._mol3dObj.addCylinder({
            start: {
                x: shape.center[0],
                y: shape.center[1],
                z: shape.center[2],
            },
            end: {
                x: shape.endPt[0],
                y: shape.endPt[1],
                z: shape.endPt[2],
            },
            radius: shape.radius,
            color: shape.color,
            fromCap: 2,
            toCap: 2,
            dashed: shape.dashed,
        });
        this.setShapeOpacity(cylinder, shape?.opacity);
        return Promise.resolve(cylinder);
    }

    setShapeOpacity(shape: any, opacity: number | undefined) {
        setInterval(() => {
            // Not sure why, but this needs to be in an interval for the opacity
            // to actually change.
            shape.opacity = opacity || 0.8;
            this.renderAll();
        }, 0);
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
        let models = ids.map((id) => this.lookup(id));
        models = models.filter((model) => model !== undefined);

        // Remove ones that aren't molecules
        models = models.filter((model) => model.selectedAtoms !== undefined);

        if (models.length > 0) {
            this._mol3dObj.zoomTo({ model: models }, 500, true);
        } else {
            // Zoom to all as backup option. Commented out because if there are
            // shapes, this causes problems.
            // this._mol3dObj.zoomTo();
        }
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
     * @returns {GenericLabelType}  The label.
     */
    addLabel(
        lblTxt: string,
        x: number,
        y: number,
        z: number
    ): GenericLabelType {
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
    loadAndSetupViewerLibrary(id: string): Promise<ViewerParent> {
        return dynamicImports.mol3d.module
            .then(($3Dmol: any) => {
                const viewer = $3Dmol.createViewer(id, {
                    defaultcolors: $3Dmol.rasmolElementColors,
                });
                viewer.setBackgroundColor(0xffffff);
                this._mol3dObj = viewer;

                console.warn('viewer.setViewStyle({style:"outline"})');

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                window["shapeCache"] = this.shapeCache;

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
