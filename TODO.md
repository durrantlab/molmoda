# Ongoing: Low Priority

https://doc.babylonjs.com/divingDeeper/mesh/simplifyingMeshes
https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/Meshes/meshSimplification.ts

vue-chartjs (or V Chart Plugin better?)

Make ViewerPanel library agnostic (not just 3dmoljs). Is this worth it?

Allow user to select themes from option menu?

https://github.com/davidjbradshaw/eslint-config-adjunct (see list)

install typedoc (such a mess you've made...)

Settings panel to control things like fog, whether outline:
viewer.setViewStyle({style:"outline"}) . Note also color, width on outline.

https://github.com/pulsardev/vue-tour
https://gruhn.github.io/vue-qrcode-reader/demos/CustomTracking.html ???
Table component?

Messaging. Need toast? You started working on toast.
    Rather than bind to a boolean to show or not, populate a list of messages.
    After certain amount of time (specified in data structure), close toast and
    go to next one (if present).
    https://getbootstrap.com/docs/5.0/components/toasts/

Create demo (minimal) plugin to illustrate. Once API settles.

Once Yuri version of Open Babel ready, get rid of old version. Would be good if
you could put it in a web worker using import (rather than adding to head).

https://github.com/rdkit/rdkit-js can also draw from smiles. Maybe get rid of
smiles drawer?

# Ongoing: Important

Current versiono of openbabel (tmp version) converts only first fframe of file
(e.g., PDBQT). Make sure Yuri's converts all, and test that. Update
openmolecules to check for three molecules when you get that fixed.

When change colors and things, shouldn't refocus.

*** Idea to consider: MolCombine. You should be able to specify the formats.
Also, search for "This doesn't account for ligands!"

Load session after saving without restarting, duplicate keys in log. Good to
clear log on load session.

Evually, need login system. Wordpress powered?
    https://medevel.com/iam-systems-10-identity/ ? Keycloak?
    Or this? https://www.npmjs.com/package/passport

Search for "TODO: Would be nice if there were a separate function"

Save molecule files needs more thourough tests. Can this be simplifed somehow?
May be too many options for saving molecules. For example, by chain needed?

Get slurm/Docker working?

**** Get common interface for mol viewers (to use nglviewer)?

Perhaps settings (for local only).
    Number of processors.
    Viewer
    Save/restore layout
    Theme?

Icons? For treeview and favicon. Using SD?

For queue, do submit time, start time, end time. Always sort by submit time. Not
currently working. Need to think through carefully. Solution might be just to
use one queue.

Buttons on queue to cancel jobs (using different kinds). Should have funciton to
show table column or not (part of IHeader; sort of implemented, but if you add
second batch of things to queue, doesn't reappear).

# DONE

"Cancel Pending" button doesn't work.

Also, when you cancel a job per job, eventually gets incorporated. Not sure this
is working.

And need to get per-cancel on each row somehow. Will likely need to modify
<Table> component.

queue says nothing present if nothing present.

Need to implement delay with inbrowser queue (for vina, for example). Could
be optional parameter on jobInfo. Just do modal with timeOut that's cancellable.
    Modal should run before job. Really, when waitable job comes up, should wait
    for all other jobs to complete, then show modal, allow opportunity to cancel
    that job or all jobs, and resume in time.

I think both undo and redo should warn one item sooner on stack.

When job requires conversion, logged as ended too soon. Conversion should count
as part of job.

CIF fails because of comment. Search for // TODO: "ligs.cif",

Need to implement onJobStatusChange. Search for that. Along these same lines,
jobs should submit files and commands separately.

Need to update tests for all revised plugins.

Get multi-frame example files of every acceptable format. That should be a test.
Include ZIP files, BIOTITE files. You've made a lot of changes to this system
and I suspect there are errors.

Just auto populate response files based on type (no need for extra code there,
really). THIS SHOULD HAPPEN IN JobManagerParent.ts, not in plugin parent. Rather
than do informJobsIncorporated, do getJobOutput. Because getInfo only returns
jobId and status. 

Fake queue system should have variable to store jobId => outputfiles. And remove
from that variable just like deleting job. Currenly calling loadFile right in
browser endpoint, but would be good to put it in this variable instead (like
fake file system). Then load in JobManagerParent.ts.

IFileInfo shouldn't have type. Just use function to figure out type.

And they should return files. Even in browser. Make like it will be when remote.

Redo queue system. An object with total number of processors, items in queue,
status for each (waiting, running, error, finished), etc. Also InServerBrowser
class that mimics remote RESP API.
    https://stackoverflow.blog/2020/03/02/best-practices-for-rest-api-design/

Should be "Window" menu item to highlight (focus and flash) the various panels.
Good as app gets more complicated.

Would be good to be able to use multiple processors for queue. Give some thought
to how. Likely needs webworker?

JobManager vue component: Also, given prop not defined for any jobs, hide that column.

Add in more job properties. Sort by start time? Or end time? Not sure.

Also, no jobs, show a message.

InBrowserEndpoint.ts: Total sum of all queues should remain constant. (Jobs
moved between queues, but not destroyed)

Recommend using axios instead of fetch:
https://www.geeksforgeeks.org/difference-between-fetch-and-axios-js-for-making-http-requests/#:~:text=Axios%20has%20the%20ability%20to,does%20not%20support%20upload%20progress.

Can JobQueue.ts be merged into JobManagerForInBrowserEndpoint.ts? Or do you want to make JobQueue more generic?

When you load multi-frame pdb or mol2, need to deal with that still.

For file types that have compound names, good to get that into the viewer name
(title) too. If loading multiple files from PDB, append index if no internal
name. Does the KOES parser save the name somewhere?

If you click on SVG file, open it in a popup (bigger).

What about info panel? Could include imag ein case of compound, molecular
weight, etc. Better than overlaying image of molecule of 3D view.

Selects are strange when disabled on color scheme selection. Spacing, but other
problems. Play around with them to see.

Shouldn't be able to extract when top-level molecule.

Would be nice to warn user when saving to format that looses information (e.g.,
SMILES).

Load biotite. No spinner?

2D images show on click. Will require babel.

2D imag eshould not be visible when no compoudn selected

Viewer2D: Canvas dimensions calculated from javascript measure of actual size on
screen, * resolution factor. Style determined by prop.

You reall yneed to get SVG working on smiles draw. Canvas is bad (low res).

Can't select compounds. Once that's ready, continue working on 2D vis.

Should be able to load zip

Drag multiple files wher one is biotite file. Doesn't work.

Necessary to store both timestampSec and timestamp string in ILog? Could
calculate string. (Good to make log more readable when viewed separate.)

When saving a single file (nonbiotite), no need to compress.

Saving: Option to save chains or proteins. Also, option to save all to single
file (PDB). See runJob. Still updating.

Loading biotite should append (not replace) current workspace.

Also, MolsToFromJSON.ts is not an intuitive place to put these functions.
"Biotite" should be in file name.

Need functions to output pdb and mol2. (use open babel for mol2).

When saving molecules, should be able to choose All, Visible, Selected

Throw better error when can't load file. Also, if drag multiple files and only
one can't work, should still load the others.

Appending .biotite to lots of accept. Just load that as you would the others. So
Loader.OpenBabel, Loader.Mol3D, and Loader.Biotite. Better for organization.

Should be able to load multiple files.

Drag and drop files. https://code-boxx.com/simple-drag-and-drop-file-upload/

Merge load/export and new session/etc.

Tmp open babel (some progress, but need to keep working on it).

loadMoleculeFiles needs overhall. Code scattered there and in OpenBabelTmp.ts.
Merge into noe system. Load any file: Load directly via 3dmoljs if possible,
otherwise convert to pdb or sdf (based on input format) and load that. When
saving, save the pdb or sdf, then convert if needed. But all in one
function/module.

// TODO: makeMoleculeInput is a promise

Every plugin must have code for running a test. Implement that whole thing.

Rename molecule. No autofocs on name.

Id's on inputs should include pluginid to be unique

redo test...

// TODO: Test with saving first (secondary button)
// Second test extracting

validate:
    :userArgs="userArgs"
    v-model="open"
    title="Load PDB ID"
    @onPopupDone="onPopupDone"
    :pluginId="pluginId"
    Other?

Still need to do component too (props and emits).

User params, user inputs, user arguments. Just use user arguments everywhere
(standardize nomenclature).

Would be good to have general instructions for how to make a plugin. Maybe take
from docstrings.

validate: no plugin defines mounted() function. Use onMounted() instead.

Also, spider out and get all interfaces and enums.

Separate out helper functions for documentation. 

You stopped working mid way on CloneExtract. Used watch to make userParams
reactive. Just getting too complicated.

Userparams reactive so change directly
 
Inform when userparamstouse changes (clone/extract)

Waits too long to focus

How to specify only one plugin?

Validate.py needs to make sure all plugins define 
menuPath
softwareCredits
contributorCredits
pluginId
onPluginStart
runJob
These are no longer required by typescript or validated.

Validaion should also force all plugins to extend a Renderless class and
implement the same component in the template. NEED TO UPDATE VALIDATION IN
GENERAL FOR NEW PLUGIN SYSTEM.

Can you refactor EditBarPluginParent so not really parent? Same for one-input
popup? These are different than the others, and I worry it will confuse things.

New plugin system: Automatically focus on first input.

Uggg, this has gotten intractibly complicated. Why different kinds of components
for different plugins? Just make a single Vue component to rule them all. No
extends hierarchy.

New plugin system: Look for other things in pdb loading that can be moved to
    generic class. For example, onPopupDone should always run this.closePopup(),
    shouldn't it? Etc. Also, why not pass "sanitized/simplified" user parameters
    to onPopupDone? I think you already have a function for that.

Continue converting plugin parents to vue-based system, using Renderless

Currently working on the Optional plugins. They must define onPopupDone.

Run test plugin and notice <br> in log. Why?

Also, if log entries close to each other and have same id, merge them into one.

Should return actual protein IFileInfo objects to runJob.

Ability to select molecule. And then widget to select protein/ligand allows you
to choose between all visible and all selected. Vue component to specify whether
to combine PDBs (receptors) or not. Basically combine everything but something
designated ligand. CombineProteins should be integrated into FormFull. It's now
integrated. 

Add names of proteins in list (up to 3). 
Need standardized way of refering to this (string). Search for // MOOMOO

And it should tell you how many combinations there will be as you change it.
Also, still need protein x ligand. Why when no protein loaded, it says 1 protein
and 1 compound? 

Selected vs. visible doesn't seem to work. 

But it should really provide all combinations of proteins + ligands, not just
the proteins.

Relevant counting functions probably need to be made more global.

Certain functions should only be called through API. Enforce that.

Hamburger menu broken

Rename/extract/etc only appears when selected. Menu items too. 

Plugin class names must end in "Plugin" ... mke eslint plugin

All classes that inherit PopupPluginParent should not use @beforePopupOpen and
@onPopupOpen. Need some way to enforce this. Really, whole validation system to
verify everythign documented correctly too.

Log should automatically scroll to bottom when item added.

Some plugins are very fast, always happen quickly. Can skip log submitted to
queue on thee (override function with "").

Logging everything. Need to add log to more things. Also, need to be able to
specify log messages explicitly in plugin (override). Generally more work do be
done here.

Also, seems to make app bigger than window (can scroll down). 

In new session popup, also make "Save Session" option as second button, not just
link.

New session, but with ability to detect if saved or not. This is almost done.
    When then try to close, catches it, opens savesession plugin. But need to
    make sure all that works, supplement with additional text if closing (maybe
    no cancel), and hten popup after telliung them they can save.

On optional plugin, can you reopen it once closed? Only if cancel. If run, can
rerun later.

Implement checkUseAllowed for export menu options.

Can you undo the initial loading of the molecule? Good to investigate. (You
can't undo it...need to fix)

When loading molecule, cursor indicates as much. Good to standardize that
(api-level).

Also, popup to just show text (info). Already have it somewhere but good to move
to Popup directory.

If you rename too quickly, value not recorded. Might be problem with other
plugins too with only one text input.

https://github.com/AlloyTeam/eslint-config-alloy
https://github.com/sheerun/prettier-standard
https://github.com/KidkArolis/healthier
https://github.com/github/eslint-plugin-github
https://github.com/SonarSource/eslint-plugin-sonarjs
https://github.com/sindresorhus/eslint-plugin-unicorn
https://github.com/mysticatea/eslint-plugin
https://github.com/brettz9/eslint-plugin
https://github.com/xjamundx/eslint-plugin-promise
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
