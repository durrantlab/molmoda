# Ongoing

https://doc.babylonjs.com/divingDeeper/mesh/simplifyingMeshes
https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/Meshes/meshSimplification.ts

When change colors and things, shouldn't refocus.

When you load multi-frame pdb or mol2, need to deal with that still.

Messaging. Need toast, log, system alert, etc. You started working on toast.
    Rather than bind to a boolean to show or not, populate a list of messages.
    After certain amount of time (specified in data structure), close toast and
    go to next one (if present).
    https://getbootstrap.com/docs/5.0/components/toasts/

vue-chartjs (or V Chart Plugin better?)

You need to be able to reorder the molecules. 
    https://www.npmjs.com/package/vuedraggable

Also need to be able to extract a molecule, and merge it.

https://github.com/pulsardev/vue-tour
https://gruhn.github.io/vue-qrcode-reader/demos/CustomTracking.html ???
Table component?

Surface opacity? Sticks/lines width? Etc.

Would be good to be able to use multiple processors for queue. Give some thought
to how. Likely needs webworker?

Also, popup to just show text (info). Already have it somewhere but good to move
to Popup directory.

Make ViewerPanel library agnostic (not just 3dmoljs).

Settings panel to control things like fog, whether outline:
viewer.setViewStyle({style:"outline"}) . Note also color, width on outline.

Need functions to output pdb and mol2. (use open babel for mol2).

New session, but with ability to detect if saved or not.

Ability to drag moleculsr components

# DONE

Eyeball button should be to the farthest right, so when others get hidden not so
disruptive (no hole).

SAve PDB & Mol2. Filenames messed up. Not converting compound to mol2.

When you go to drag molecular components, important that all components be the
same, regardless of chain, residue, molecule, etc. So you'll need to stanardize
that.

1FDA is good to test. More files in ZIP than are in outline. Very confusing.

Would be good to have simple popup with single text input for use in saving and
exporting. (Mostly done, except for export VRML.) 

Menu items should have rank option for ordering. (Works on leafs, but not
branches, meaning submenus). What about using something like optional [#] at
start of menu name?

Surfaces don't turn off with associated molecules.

load 1xdn2.biotite. Not respecting hidden solvent.

Also look at sizes of libraries.

Way to add contributors/organizations too (not just software)? PDB, etc. Also,
maybe refs to this and software credits?

Still heirarchy on a compound. Shouldn't be one.

Need to organize dynamic imports. Should automatically add to credits. And need
to make sure dividing into separate chunks.

Ability to save store to localstorage, and download.
    https://www.npmjs.com/package/vuex-persist
    https://github.com/championswimmer/vuex-persist/issues/99 
    Don't think this is going to work. Started to work on custom solution...

Load in aspirin and unfurl tree. Undefineds there.

If no format specified, get it from the file extension.

Button?

Shouldn't be able to focus on molecule that is not visible.

You can start working on loading and saving without openbabel.js.

Continue implementing forms per https://getbootstrap.com/docs/5.2/forms/select/
(now on radios)

Plugins. Divide into core (always loads) and optional.

Move all default credits to separate file (cluttering App.vue).

Color in widget doesn't always update, though it does on protein. Color by
solid, though perhaps elsewhere.

Other problems with vis system. for example, protein atoms => sphere, can't
color.

When setting up styles panel, sometimes doesn't reflect changes if hidden.
Especially after having turned to hidden explicitly (never comes back). Need to
invdstigate.

Toggle visibility and focus in styles too. Might be ablet to eliinate "none" category.

viewerDirty is necessary? Why not just rely on reactivity?

Hover over atom, get info. Click on it, zoom to that atom.

If you click on a tree folder, act on everything below it as well?

onTreeviewChanged is VERY slow. Need to implement caching system. (Some
progress, but still working on it.)

Can you load and parse molecules from webworker?

Also implement disabled on all form inputs.
