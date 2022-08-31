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

https://github.com/pulsardev/vue-tour
https://gruhn.github.io/vue-qrcode-reader/demos/CustomTracking.html ???
Table component?

Would be good to be able to use multiple processors for queue. Give some thought
to how. Likely needs webworker?

Also, popup to just show text (info). Already have it somewhere but good to move
to Popup directory.

Make ViewerPanel library agnostic (not just 3dmoljs). Is this worth it?

Settings panel to control things like fog, whether outline:
viewer.setViewStyle({style:"outline"}) . Note also color, width on outline.

Need functions to output pdb and mol2. (use open babel for mol2).

New session, but with ability to detect if saved or not. This is almost done.
    When then try to close, catches it, opens savesession plugin. But need to
    make sure all that works, supplement with additional text if closing (maybe
    no cancel), and hten popup after telliung them they can save.

On optional plugin, can you reopen it once closed? Only if cancel. If run, can
rerun later.

Idea to consider: Ability to select molecule. Rename/extract/etc only appears
when selected. Menu items too. And then widget to select protein/ligand allows
you to choose between all visible and all selected.
Vue component to specify whether to combine PDBs (receptors) or not. Basically
combine everything but something designated ligand.
    CombineProteins should be integrated into FormFull

If you rename too quickly, value not recorded. Might be problem with other
plugins too with only one text input.

Allow user to select themes from option menu?

When loading molecule, cursor indicates as much. Good to standardize that
(api-level).

Implement checkUseAllowed for export menu options.

Can you undo the initial loading of the molecule? Good to investigate.

All classes that inherit PopupPluginParent should not use @beforePopupOpen and
@onPopupOpen. Need some way to enforce this. Really, whole validation system to
verify everythign documented correctly too.


https://github.com/xjamundx/eslint-plugin-promise
https://github.com/brettz9/eslint-plugin
https://github.com/mysticatea/eslint-plugin
https://github.com/sindresorhus/eslint-plugin-unicorn
https://github.com/SonarSource/eslint-plugin-sonarjs
https://github.com/github/eslint-plugin-github
https://github.com/KidkArolis/healthier
https://github.com/sheerun/prettier-standard
https://github.com/davidjbradshaw/eslint-config-adjunct
https://github.com/AlloyTeam/eslint-config-alloy


# DONE

https://github.com/RunDevelopment/eslint-plugin-clean-regex
https://github.com/kantord/eslint-plugin-write-good-comments
https://www.npmjs.com/package/eslint-plugin-jsdoc

Also can't delete top-level molecule, I think. (but can clone it... I checked)

Load molecule from pubchem (can always load, no validation)

Can you sylize modal per functio (default, info, alert).

with new api.messages.popupError, no need to bubble up onError to app. Just
handle in plugin itself. Also, there should be a callback on that.

Also need to be able to extract a molecule, and merge it.

Plugins should be able to do check and abort. For example, of not all ligands
have 3D coordinates. But make generic, user-defined.
* Gray out undo/redo if not possible?

Menu should close when popup opens.

Need a deselect all menu item.

You should be able to do clone on top-level molecule. Copying the molecule.
Extract doesn't make sense, though.

When you clone, not enough to do deep copy. Because then when you hide original,
hides clone. Need to regenerate GLModel for clone.
    Note: You tried to implement this, broke it. Need to fix.

Need delete molecule too. 
* Not being removed. 
* I have confirmed the problem in _zoomPerFocus. If I comment it mostly out,
    still doesn't work.
* Confirmed being removed from cache. That's not the problem.
* In example, even when using your library, remove does change value of
  viewer.getModel(X). But it doesn't change it in the context of your app.  

Also delete and extract. Would require select

Both extract and clone move node to top. Some code in common (see TODO: code in
common). Good to make dedicated function.

Clone and extract can be moved into one. Just add checkbox to specify "delete
original (extract rather than clone)" or something like that.

Select color shoul be done with bootstrap classes so themable.

Parentheses after tree item indicating number of hcildren nodes (if any).

Note you souldn't be able to extract or clone top-level molecules.

Also, you can select molecules that aren't visible (so you don't have to display
large molecular library to use it, for example).

Note extract doesn't require name change. 

Make plugin parent type for all edit buttons?

You should be able to rename molecule. 

Also, put a cap on how many previous states stored?

Undo/redo. Note that in replaceMolecules, mols and state.molecules end up being
the same, so clearing before adding doesn't work. Need to serialize.

Ability to drag moleculsr components. Working, but still not great. Need to
stress test. Actually, are you sure you want to be able to rearrange the order?
Overly complicated, and might be eaiser to keep things organized if not. I do
recommend extract/copy/merge functions, but maybe not drag and drop. Think about
that some. (To extract, etc., you might need to be able to select a portion of a
protein).

1HU4 makes bad tree?

Surface opacity? Sticks/lines width? Etc. (No, better to keep interface as
simple as possible)

You need to be able to reorder the molecules. 
    https://www.npmjs.com/package/vuedraggable

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
