// import { dynamicImports } from "@/Core/DynamicImports";
// import { FileInfo } from "@/FileSystem/FileInfo";
// import {
//     IStyle,
//     IColorStyle,
//     IRegion,
//     IBox,
//     ISphere,
//     ICylinder,
//     IArrow,
// } from "@/UI/Navigation/TreeView/TreeInterfaces";
// import {
//     analyzeColor,
//     colorNameToHex,
// } from "../../Options/Styles/ColorSelect/ColorConverter";
// import { elementColors, defaultElementColor } from "../ElementColors";
// import { GLModel } from "../GLModelType";
// import {
//     GenericModelType,
//     GenericSurfaceType,
//     GenericStyleType,
//     GenericLabelType,
//     GenericViewerType,
//     GenericRegionType,
// } from "./Types";
// import { ViewerParent } from "./ViewerParent";
// import * as api from "@/Api";
// import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";

// let NGL: any;

// /**
//  * The NGL viewer. Inherits ViewerParent class.
//  */
// export class ViewerNGL extends ViewerParent {
//     private _nglObj: any;
//     private _resizeInterval: any;
//     private _madeClickable = false;
//     private _madeHoverable = false;

//     /**
//      * Removes a model from the viewer.
//      *
//      * @param  {string} id  The id of the model to remove.
//      */
//     _removeModel(id: string) {
//         // remove from viewer
//         const mol = this.lookup(id);
//         if (mol) {
//             mol.dispose();
//         }
//     }

//     /**
//      * Removes a region from the viewer.
//      *
//      * @param  {string} id  The id of the region to remove.
//      */
//     _removeRegion(id: string) {
//         const region = this.lookup(id);
//         if (region) {
//             region.associatedRegionComponent.dispose();
//             region.dispose();
//         }
//     }

//     /**
//      * Removes a surface from the viewer.
//      *
//      * @param  {GenericSurfaceType} surface  The surface to remove.
//      */
//     removeSurface(surface: GenericSurfaceType) {
//         // ngl throws an error. Very annoying. Couldn't debug, so just catch.
//         try {
//             surface.dispose();
//         } catch (e) {
//             return;
//         }
//         // Below doesn't throw error, but I don't think surface is being removed
//         // from memory...
//         // surface.setVisibility(false);
//     }

//     /**
//      * Hide a model.
//      *
//      * @param  {string} id  The id of the model to hide.
//      */
//     hideMolecule(id: string) {
//         const model = this.lookup(id);
//         model.setVisibility(false);

//         // Adding a hidden property
//         model.hidden = true;
//     }

//     /**
//      * Show a model.
//      *
//      * @param  {string} id  The model to show.
//      */
//     showMolecule(id: string) {
//         const model = this.lookup(id);
//         model.setVisibility(true);

//         // Adding a hidden property
//         model.hidden = false;
//     }

//     /**
//      * Hide a region.
//      *
//      * @param  {string} id  The region to hide.
//      */
//     hideRegion(id: string) {
//         const region = this.lookup(id);
//         if (region) {
//             region.associatedRegionComponent.addRepresentation("buffer", {
//                 opacity: 0,
//             });
//         }
//     }

//     /**
//      * Show a region.
//      *
//      * @param  {string} id  The id of the region to show.
//      * @param  {number} opacity  The opacity to show the region at.
//      */
//     showRegion(id: string, opacity: number) {
//         const region = this.lookup(id);
//         if (region) {
//             region.associatedRegionComponent.addRepresentation("buffer", {
//                 opacity,
//             });
//         }
//     }

//     /**
//      * Clear the current molecular styles.
//      *
//      * @param  {string} id  The id of the model to clear the styles of.
//      */
//     clearMoleculeStyles(id: string) {
//         const model = this.lookup(id);
//         model.removeAllRepresentations();
//     }

//     /**
//      * Converts the 3DMoljs style stored in the molecules tree to a style format
//      * compatible with this viewer.
//      *
//      * @param {IStyle}        style         The style to convert.
//      * @param {TreeNode} treeNode  The molecular container, which may
//      *                                      contain additional/more accessible
//      *                                      information about the molecule than is
//      *                                      available in the model itself.
//      * @returns {GenericStyleType}  The converted style.
//      */
//     convertStyle(style: IStyle, treeNode: TreeNode): GenericStyleType {
//         const styleAsDict = style as { [key: string]: IColorStyle };

//         const newStyle: { [key: string]: any } = {
//             multipleBond: true,
//         };

//         // Iterate through properties of the style
//         for (const component in style) {
//             // component is like sphere, stick, line, etc.
//             const colorStyle = styleAsDict[component];

//             const {color, colorscheme, radius, opacity} = colorStyle;

//             switch (color) {
//                 case undefined:
//                     break;
//                 case "spectrum":
//                     newStyle[component] = { colorScheme: "atomindex" };
//                     break;
//                 default:
//                     newStyle[component] = { color: color };
//                     break;
//             }

//             let chainId = "A";

//             // Create a list of 10 pastel colors, hex
//             const chainColors = [
//                 "#FFB3BA",
//                 "#FFDFBA",
//                 "#FFFFBA",
//                 "#BAFFC9",
//                 "#BAE1FF",
//                 "#D0BAFF",
//                 "#FFBAF2",
//                 "#FFB3BA",
//                 "#FFDFBA",
//                 "#FFFFBA",
//             ];

//             switch (colorscheme) {
//                 case undefined:
//                     break;
//                 case "default":
//                     newStyle[component] = { colorScheme: "element" };
//                     break;
//                 case "ssJmol":
//                     newStyle[component] = { colorScheme: "sstruc" };
//                     break;
//                 case "chain":
//                     if (treeNode.model) {
//                         chainId = (treeNode.model as GLModel).selectedAtoms(
//                             {}
//                         )[0].chain;
//                     }
//                     // Convert chainId to a number between 0 and 9, inclusive.
//                     newStyle[component] = {
//                         color: chainColors[chainId.charCodeAt(0) % 10],
//                     };
//                     break;
//                 default:
//                     if (colorscheme.endsWith("Carbon")) {
//                         const schemeId = NGL.ColormakerRegistry.addScheme(
//                             function (/* params: any */) {
//                                 // See https://nglviewer.org/ngl/api/manual/usage/coloring.html

//                                 const carbonColor = parseInt(
//                                     "0x" +
//                                         colorNameToHex(
//                                             colorscheme.slice(0, -6)
//                                         ).slice(1)
//                                 );

//                                 // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//                                 // @ts-ignore
//                                 (this as any).atomColor = (atom: any): any => {
//                                     if (atom.element === "C") {
//                                         return carbonColor;
//                                     } else {
//                                         return elementColors[atom.element] !==
//                                             undefined
//                                             ? elementColors[atom.element]
//                                             : defaultElementColor;
//                                     }
//                                 };
//                             }
//                         );

//                         newStyle[component] = { colorScheme: schemeId };
//                     }
//             }

//             if (color === undefined && colorscheme === undefined) {
//                 // Default is element
//                 newStyle[component] = { colorScheme: "element" };
//             }

//             if (radius !== undefined) {
//                 newStyle[component] = { aspectRatio: radius };
//             }

//             if (opacity !== undefined) {
//                 // For some reason opacity is not as strong in NGL, so reduce it
//                 // artifactually.
//                 newStyle[component].opacity = opacity * 0.5;
//             }
//         }

//         console.log(newStyle);

//         return newStyle;
//     }

//     /**
//      * Converts a 3DMoljs selection to the selection format compatible with this
//      * viewer.
//      *
//      * @param {any} sel  The selection to convert.
//      * @returns {string}  The converted selection string.
//      */
//     convertSelection(sel: any): string {
//         // Not too many selections are used. Just not bonded and all.
//         if (sel.bonds !== undefined && sel.bonds === 0) {
//             return "not bonded";
//         }

//         return "all";
//     }

//     /**
//      * Sets the style of a molecule. TODO: good to not use any type for
//      * selection.
//      *
//      * @param  {string}     id           The id of the model to set the style
//      *                                   of.
//      * @param  {string}     selection    The selection to apply the style to.
//      * @param  {GenericStyleType}  style        The style to apply.
//      * @param  {boolean}    [add=false]  Whether to add the style to the
//      *                                   existing styles. If false, replaces the
//      *                                   existing style.
//      */
//     setMolecularStyle(
//         id: string,
//         selection: string,
//         style: GenericStyleType,
//         add = false
//     ) {
//         const model = this.lookup(id);
//         if (!model) {
//             // Model not present
//             return;
//         }

//         if (!model.removeAllRepresentations) {
//             // It's a region, not a molecule
//             return;
//         }

//         if (!add) {
//             // Clear existing style
//             // this.clearMoleculeStyles(model);
//             this.clearMoleculeStyles(id);
//         }

//         // Iterate through properties of the style
//         for (const component in style) {
//             // component is like sphere, stick, line, etc.
//             const styleAsDict = style as { [key: string]: any };
//             const componentStyle = styleAsDict[component];

//             switch (component) {
//                 case "sphere":
//                     if (componentStyle.aspectRatio !== undefined) {
//                         // Used for non-bonded atoms.
//                         const params = {
//                             sele: selection,
//                             ...componentStyle,
//                         };
//                         params.aspectRatio = 5 * params.aspectRatio;
//                         model.addRepresentation("ball+stick", params);
//                     } else {
//                         model.addRepresentation("spacefill", {
//                             sele: selection,
//                             ...componentStyle,
//                         });
//                     }
//                     break;
//                 case "stick":
//                     model.addRepresentation("ball+stick", {
//                         sele: selection,
//                         ...componentStyle,
//                         aspectRatio: 1,
//                     });
//                     break;
//                 case "line":
//                     model.addRepresentation("line", {
//                         sele: selection,
//                         ...componentStyle,
//                     });
//                     break;
//                 case "cartoon":
//                     model.addRepresentation("cartoon", {
//                         sele: selection,
//                         ...componentStyle,
//                     });
//                     break;
//             }
//         }
//     }

//     /**
//      * Adds a surface to the given model.
//      *
//      * @param  {string}     id     The id of the model to add the surface to.
//      * @param  {GenericStyleType}  style  The style of the surface.
//      * @returns {Promise<GenericSurfaceType>}  A promise that resolves when the
//      *     surface.
//      */
//     _addSurface(
//         id: string,
//         style: GenericStyleType
//     ): Promise<GenericSurfaceType> {
//         const model = this.lookup(id);
//         const surf = model.addRepresentation("surface", {
//             ...style.surface,
//         });

//         // sele: "not hetero",
//         // multipleBond: true,
//         // color: "#00FF00",
//         // , opacity: 0.6

//         return Promise.resolve(surf);
//     }

//     /**
//      * Adds a model to the viewer. Returns same model, but now it's been added
//      * to viewer.
//      *
//      * @param  {GLModel} model  The model to add.
//      * @returns {Promise<GenericModelType>}  The model that was added.
//      */
//     addGLModel(model: GLModel): Promise<GenericModelType> {
//         // TODO: If ligand, convert to SDF (preserve bond orders)

//         // Convert the model to PDB
//         return new TreeNode({ model: model } as TreeNode)
//             .toFileInfo("pdb")
//             .then((fileInfoPDB: FileInfo) => {
//                 const stringBlob = new Blob([fileInfoPDB.contents], {
//                     type: "text/plain",
//                 });

//                 // Return the model
//                 return this._nglObj.loadFile(stringBlob, {
//                     ext: "pdb",
//                     // defaultRepresentation: true, // TODO: Remove after debugging.
//                 });
//             })
//             .catch((err) => {
//                 throw err;
//             });
//     }

//     /**
//      * Adds a sphere to the viewer.
//      *
//      * @param  {ISphere} region  The sphere to add.
//      * @returns {GenericRegionType}  The sphere that was added.
//      */
//     addSphere(region: ISphere): Promise<GenericRegionType> {
//         return dynamicImports.ngl.module.then((ngl: any) => {
//             const colorVec = this._getColorVec(region);
//             const sphere = new ngl.Region("sphere", { disableImpostor: true });
//             sphere.addSphere(region.center, colorVec, region.radius);
//             this._addRegionToViewer(sphere, region.opacity as number);
//             return sphere;
//         });
//     }

//     /**
//      * Adds a region to the viewer.
//      *
//      * @param  {GenericRegionType} region    The region to add.
//      * @param  {number}           opacity  The opacity of the region.
//      */
//     private _addRegionToViewer(region: GenericRegionType, opacity: number) {
//         const regionComp = this._nglObj.addComponentFromObject(region);
//         region.associatedRegionComponent = regionComp;
//         regionComp.addRepresentation("buffer", { opacity });
//     }

//     /**
//      * Gets a normalized color vector from a region.
//      *
//      * @param  {IRegion} region  The region to get the color from.
//      * @returns {number[]}  The color vector.
//      */
//     private _getColorVec(region: IRegion): [number, number, number] {
//         return analyzeColor(region.color as string).rgb?.map((c) => c / 255) as [
//             number,
//             number,
//             number
//         ];
//     }

//     /**
//      * Adds a box to the viewer.
//      *
//      * @param  {IBox} region  The box to add.
//      * @returns {GenericRegionType}  The box that was added.
//      */
//     addBox(region: IBox): Promise<GenericRegionType> {
//         return dynamicImports.ngl.module.then((ngl: any) => {
//             const colorVec = this._getColorVec(region);
//             const box = new ngl.Region("box", { disableImpostor: true });
//             box.addBox(
//                 region.center,
//                 colorVec,
//                 // TODO: I'm not 100% sure below is correct.
//                 region.dimensions[0],
//                 [0, region.dimensions[1], 0],
//                 [0, 0, region.dimensions[2]]
//             );
//             this._addRegionToViewer(box, region.opacity as number);
//             return box;
//         });
//     }

//     /**
//      * Adds a arrow to the viewer.
//      *
//      * @param  {IArrow} region  The arrow to add.
//      * @returns {GenericRegionType}  The arrow that was added.
//      */
//     addArrow(region: IArrow): Promise<GenericRegionType> {
//         return dynamicImports.ngl.module.then((ngl: any) => {
//             const colorVec = this._getColorVec(region);
//             const arrow = new ngl.Region("arrow", { disableImpostor: true });
//             arrow.addArrow(region.center, region.endPt, colorVec, region.radius);
//             this._addRegionToViewer(arrow, region.opacity as number);
//             return arrow;
//         });
//     }

//     /**
//      * Adds a cylinder to the viewer.
//      *
//      * @param  {ICylinder} region  The cylinder to add.
//      * @returns {GenericRegionType}  The cylinder that was added.
//      */
//     addCylinder(region: ICylinder): Promise<GenericRegionType> {
//         return dynamicImports.ngl.module.then((ngl: any) => {
//             const colorVec = this._getColorVec(region);
//             const cylinder = new ngl.Region("cylinder", {
//                 disableImpostor: true,
//             });
//             cylinder.addCylinder(
//                 region.center,
//                 region.endPt,
//                 colorVec,
//                 region.radius
//             );
//             this._addRegionToViewer(cylinder, region.opacity as number);
//             return cylinder;
//         });
//     }

//     /**
//      * Render all the molecules and surfaces currently added to the viewer.
//      */
//     renderAll() {
//         // I don't believe ngl requires a render.
//         return;
//     }

//     /**
//      * Zoom in on a set of models.
//      *
//      * @param  {string[]} ids  The ids of the models to zoom in on.
//      */
//     zoomToModels(ids: string[]) {
//         let models = ids.map((id) => this.lookup(id));
//         models = models.filter((model) => model !== undefined);

//         if (models.length === 0) {
//             return;
//         }

//         this._nglObj.animationControls.clear();

//         // Get a box that encompasses all the models.
//         if (models.length === 0 || !models[0].getBox) {
//             // Nothing you can do...
//             return;
//         }

//         const encompassingBox = models[0].getBox();
//         for (let i = 1; i < models.length; i++) {
//             if (models[i].getBox) {
//                 // Regions don't have getBox methods.
//                 encompassingBox.union(models[i].getBox());
//             }
//         }

//         // Make the box a bit bigger.,
//         encompassingBox.min.x -= 0.5;
//         encompassingBox.min.y -= 0.5;
//         encompassingBox.min.z -= 0.5;
//         encompassingBox.max.x += 0.5;
//         encompassingBox.max.y += 0.5;
//         encompassingBox.max.z += 0.5;

//         this._nglObj.animationControls.zoomMove(
//             encompassingBox.getCenter(),
//             this._nglObj.getZoomForBox(encompassingBox),
//             500
//         );
//     }

//     /**
//      * Zoom in on a specific point.
//      *
//      * @param  {number} x  The x coordinate.
//      * @param  {number} y  The y coordinate.
//      * @param  {number} z  The z coordinate.
//      */
//     centerOnPoint(x: number, y: number, z: number) {
//         this._nglObj.animationControls.clear();

//         const box = this._nglObj.getBox();
//         box.min.x = x - 1;
//         box.min.y = y - 1;
//         box.min.z = z - 1;
//         box.max.x = x + 1;
//         box.max.y = y + 1;
//         box.max.z = z + 1;

//         this._nglObj.animationControls.zoomMove(
//             box.getCenter(),
//             this._nglObj.getZoomForBox(box),
//             500
//         );
//     }

//     /**
//      * Adds a label to the viewer
//      *
//      * @param  {string} lblTxt  The text of the label.
//      * @param  {number} x       The x coordinate.
//      * @param  {number} y       The y coordinate.
//      * @param  {number} z       The z coordinate.
//      * @returns {GenericLabelType}  The label.
//      */
//     addLabel(
//         lblTxt: string,
//         x: number,
//         y: number,
//         z: number
//     ): GenericLabelType {
//         return this._nglObj.addLabel(lblTxt, {
//             position: { x: x, y: y, z: z },
//             backgroundColor: "white",
//             fontColor: "black",
//             borderThickness: 1,
//             borderColor: "black",
//             backgroundOpacity: 0.9,
//             // screenOffset: $3Dmol.Vector2(10, 10),
//             inFront: true,
//             alignment: "bottomCenter", // 'bottomLeft'
//         });
//     }

//     /**
//      * Removes a label from the viewer.
//      *
//      * @param  {GenericLabelType} label  The label to remove.
//      */
//     removeLabel(label: GenericLabelType) {
//         this._nglObj.removeLabel(label);
//     }

//     /**
//      * Load 3dmol.js dynamically, set the viewer object, etc.
//      *
//      * @param  {string} id  The HTML Dom id of the element to load the viewer
//      *                      into.
//      * @returns {Promise<any>}  A promise that resolves the viewer object when
//      *     3dmol.js is loaded.
//      */
//     _loadAndSetupViewerLibrary(id: string): Promise<GenericViewerType> {
//         return dynamicImports.ngl.module
//             .then((ngl: any) => {
//                 NGL = ngl;

//                 const stage = new ngl.Stage(id, {
//                     backgroundColor: "white",
//                 });

//                 // Handle window resizing
//                 window.addEventListener(
//                     "resize",
//                     () => {
//                         stage.handleResize();
//                     },
//                     false
//                 );

//                 // You need to also monitor the size of the div, because with
//                 // resizing the panels, you can resize div without resizing
//                 // window.
//                 const div = document.getElementById(id);
//                 if (div) {
//                     this._resizeInterval = setInterval(() => {
//                         if (div.clientWidth !== stage.width) {
//                             stage.handleResize();
//                         }
//                     }, 1000);
//                 }

//                 this._nglObj = stage;

//                 // this.surfaceType = NGL.SurfaceType.MS;

//                 // See
//                 // https://github.com/nglviewer/nglview/issues/785#issuecomment-538043454

//                 // Check out: https://nglviewer.org/ngl/api/manual/usage/interaction-controls.html

//                 // setTimeout(() => {

//                 return this as ViewerParent;
//             })
//             .catch((err: any) => {
//                 throw err;
//                 // return this as ViewerParent;
//             });
//     }

//     /**
//      * Gets the data uri of the current view (png).
//      *
//      * @returns {Promise<string>}  A promise that resolves to the data uri.
//      */
//     pngURI(): Promise<string> {
//         return this._nglObj.viewer
//             .makeImage({
//                 factor: 1,
//                 antialias: true,
//                 trim: false,
//                 transparent: true,
//             })
//             .then((blob: Blob) => {
//                 // Blob is a png image. Convert it to DataURI.
//                 return new Promise((resolve, reject) => {
//                     const reader = new FileReader();
//                     reader.onload = () => {
//                         resolve(reader.result as string);
//                     };
//                     reader.onerror = reject;
//                     reader.readAsDataURL(blob);

//                     return reader.result as string;
//                 });
//             })
//             .catch((err: any) => {
//                 throw err;
//                 // return "";
//             });
//     }

//     /**
//      * Unloads the viewer (from the DOM, etc.).
//      */
//     unLoad() {
//         this._nglObj.dispose();
//         this._nglObj = null;
//         if (this._resizeInterval) {
//             clearInterval(this._resizeInterval);
//         }
//     }

//     /**
//      * Makes atoms react when clicked.
//      *
//      * @param {any}      model     The model to make clickable.
//      * @param {Function} callBack  Function that runs when atom is clicked. The
//      *                             function is passed the x, y, and z
//      *                             coordinates of the atom.
//      */
//     makeAtomsClickable(model: any, callBack: (x: number, y: number, z: number) => any) {
//         if (this._madeClickable) {
//             // Only need to call once for NGL.
//             return;
//         }
//         this._madeClickable = true;
//         this._nglObj.signals.clicked.add((pickingProxy: any) => {
//             if (pickingProxy.atom) {
//                 const coors = pickingProxy.atom.positionToArray();
//                 callBack(coors[0], coors[1], coors[2]);
//             }
//         });
//     }


//     /**
//      * Makes atoms NOT react when mouse moves over then (NOT hoverable).
//      *
//      * @param {any} model  The model to make NOT hoverable.
//      */
//     makeAtomsNotHoverable(model: any) {
//         alert("TODO: NOT IMPLEMENTED!");
//     }

//     /**
//      * Makes atoms NOT responsive to mouse hovering and clicking.
//      *
//      * @param {any} model  The model to make atoms NOT hoverable and clickable.
//      */
//     makeAtomsNotClickable(model: any) {
//         alert("TODO: NOT IMPLEMENTED!");
//     }

//     currentMouseHoverState = 1;
//     toolTipDiv: HTMLDivElement | null = null;

//     /**
//      * Makes atoms react when mouse moves over then (hoverable).
//      *
//      * @param {any}      model               The model to make hoverable.
//      * @param {Function} onHoverInCallBack   Function that runs when hover over
//      *                                       atom starts.
//      * @param {Function} onHoverOutCallBack  Function that runs when hover over
//      *                                       atom ends.
//      */
//     makeAtomsHoverable(
//         model: any,
//         onHoverInCallBack: (x: number, y: number, z: number) => any,
//         onHoverOutCallBack: () => any
//     ) {
//         if (this._madeHoverable) {
//             // Only need to call once for NGL.
//             return;
//         }
//         this._madeHoverable = true;
//         if (this.toolTipDiv === null) {
//             this.toolTipDiv = document.createElement("div");
//             Object.assign(this.toolTipDiv.style, {
//                 display: "none",
//                 position: "absolute",
//                 zIndex: 10,
//                 pointerEvents: "none",
//                 backgroundColor: "rgba(0, 0, 0, 0.6)",
//                 color: "lightgrey",
//                 padding: "0.5em",
//                 fontFamily: "sans-serif",
//             });
//             this._nglObj.viewer.container.appendChild(this.toolTipDiv);

//             // Remove original tooltip from DOM
//             this._nglObj.tooltip.parentElement.removeChild(
//                 this._nglObj.tooltip
//             );
//         }

//         this._nglObj.signals.hovered.removeAll();
//         this._nglObj.signals.hovered.add((pickingProxy: any) => {
//             if (pickingProxy && (pickingProxy.atom || pickingProxy.bond)) {
//                 const atom = pickingProxy.atom || pickingProxy.closestBondAtom;
//                 if (this.toolTipDiv !== null) {
//                     // const lblTxt = "";
//                     const atomInf = atom.toObject();
//                     const lblTxt = this.hoverLabelText(
//                         atomInf.chainname,
//                         atomInf.resname,
//                         atomInf.resno,
//                         atomInf.atomname
//                     );

//                     if (lblTxt) {
//                         const cp = pickingProxy.canvasPosition;
//                         this.toolTipDiv.innerText = lblTxt; //  + atom.qualifiedName();
//                         this.toolTipDiv.style.bottom =
//                             (cp.y + 2).toString() + "px";
//                         this.toolTipDiv.style.left =
//                             (cp.x + 2).toString() + "px";
//                         this.toolTipDiv.style.display = "block";
//                     } else {
//                         this.toolTipDiv.style.display = "none";
//                     }
//                 }

//                 if (this.currentMouseHoverState === 0) {
//                     return;
//                 }

//                 onHoverInCallBack(atom.x, atom.y, atom.z);
//                 this.currentMouseHoverState = 0;
//             } else {
//                 if (this.toolTipDiv !== null) {
//                     this.toolTipDiv.style.display = "none";
//                 }
//                 if (this.currentMouseHoverState === 1) {
//                     return;
//                 }

//                 onHoverOutCallBack();

//                 this.currentMouseHoverState = 1;
//             }
//         });
//         // }, 1000);
//     }

//     /**
//      * Gets a VRML model of the current scene. But not implemented for NGL.
//      *
//      * @returns {string}  The VRML string.
//      */
//     exportVRML(): string {
//         api.messages.popupError(
//             "The currently selected molecular viewer (NGL) does not support VRML export. Try switching to the 3Dmol.js viewer instead (biotite > Settings)."
//         );
//         return "";
//     }
// }
