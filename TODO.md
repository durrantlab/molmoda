# Ongoing: Low Priority

https://doc.babylonjs.com/divingDeeper/mesh/simplifyingMeshes
https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/Meshes/meshSimplification.ts

vue-chartjs (or V Chart Plugin better?)

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

https://github.com/rdkit/rdkit-js can also draw from smiles. Maybe get rid of
smiles drawer?

Evually, need login system. Wordpress powered?
https://medevel.com/iam-systems-10-identity/ ? Keycloak?
Or this? https://www.npmjs.com/package/passport

Get slurm/Docker working?

Localization: https://kazupon.github.io/vue-i18n/started.html#javascript

Bootstrap Tour

How useful is log really?

NOT REALLY NEEDED YET: https://vuejs.org/guide/components/async.html#basic-usage

# Ongoing: Important

Current version of openbabel (tmp version) converts only first fframe of file
(e.g., PDBQT). Make sure Yuri's converts all, and test that. Update
openmolecules to check for three molecules when you get that fixed.

When change colors and things, shouldn't refocus.

Load session after saving without restarting, duplicate keys in log. Good to
clear log on load session.

updateAppName not used anywhere, but I think it should be.

Add graphs to data too. Plotly? Also, you should be able to download graphs
(png, svg, xlsx, csv). And text too. And should auto keep track of how the
molecule was generated.

Test elements could be restructured as objects. Would be better to put functions
on each one. Then, Tutorial based on tests (first one). Started to do this. See
ParentPluginTestFuncs.ts

**** FPocket: blank modal flashes. Why?

**** Queue table looks bad.

Search for "// TODO: You're sending all inputFiles for each runBabel call, because"

Search for "Use clicks instead of setUserArg for boolean user arguments." Would
be good to implement this. Need to detect value of checkbox before clicking. But
if students are going to design these tests, make that happen.

**** Tests
    Return to openmolecules test. Not passing.
    Check savemolecules test. It's very complicated.

**** molprops, after done, should switch to data tab for you.

MolProps... need to neutralize molecule before calculating properties?

Mol filter could be similar plugin, might be helpful.

Conversion from 3dmol to PDB in same webworker (at least optional).

Search for // TODO: Note that only one webworker is used here. You could multithread
When you calculate properties, why does it create and destroy the webworker
before launching another one? Wouldn't it be easier just to deal with this
outside the plugin system? You'll want to repurpose it anyway for filtering,
etc. Also, you could standardie how webworkers are used for multiprocessing
(keeping track of order automatically). Reuse convert w/ obabel code.
    But when you go to do remote calculations...

Open options: add 3D coordinates, frames to separate molecules, etc.

TRY TO INTEGRATE WEBINA!!! (Also into original app). Will need select-shape form
element.

https://firebase.google.com/docs/auth

ligs.cif shows only one
biotite format surizingly works, but I'd like to resave it to make sure.

See // TODO: Need to use timeout here.

Need to check if hydrogen atoms added to protein and ligand befor eWebina.

Search for "// Select not input not textarea" and consider using this more
judiciously.

Draw molecule. (Yuri working on this)

is logging needed?

api system seems convoluted.

Way to add things to done queue directly. Things that run quickly, but you still
want a job.

fpocket should still run via new queue system. Could be multiple proteins, time
could add up.

# NEW QUEUE SYSTEM

SEE: MultiProcWorkerJob

Current system is excessively complex. Trying to keep track of total number of
processors used, etc. If users wants to overuser their processors, just let
them. You keep track only of each job, to make sure it says in the processor
limit.

For this, adapt WorkerPool. If you're not using a worker, no reason to use the
queue system (because will block main thread anyway, perhaps because very
short).

Perhaps these files should be named worker_job.ts. They should inherit a common
parent so they have to implement certain functions.

setup(): Sets up the worker pool, etc.

start(): Starts a job. Parent class also adds it to visible queue. Throws a
warning if a job currently running (just so user knows).

subJobFinish(): One of the subjobs finishes (e.g., vina VS).

finish(): All subjobs finish. Also updates queue.

Perhaps only show message letting user know job is running if job doesn't finish
quickly (e.g., in 5 secs). But this message could let user know they can check
the queue.


# DONE

WorkerPool elsewhere?

There needs to be an option when loading proteins to not include water/MG, etc.

You've got an error caught. Looks like when it fails, it fails with a protein
tht has water and MG. Need to figure out why. If good reason, might need to just
catch error.

testtta.biotite is a good test file to use for webina. It doesn' thave the
memory error.

Can't edit region on sidebar. Color, wrong. No center, dimens, etc.

Test FPocketWeb when it's finalized.

NEED TO TEST: MoveShapesOnClickPlugin.vue, SimpleMsgPlugin.vue, DelayedJobPopupPlugin.vue

ligs.mol2 shows three, not grouped
ligs.pdb too

Use pubic/ dir instad of copying things over.

Need widget to select shape (or specify X, Y, Z, dimens).

// TODO: Error when click on compound

Load 1XDN, click on compound, there's an error.

Load a molecule, clone protein portion, it's hidden. Why? Same with merging, BTW.

Load 1XDN. Look at ligand name. What?

Search for "TODO: Would be nice if there were a separate function"

Clone molecule. Not visible. Make it visible on clone. Hide original? Same with
merge.

Queue shouldn't automatically add mols to viewer. You should do that explicitly.
runInBrowser (?) always returns promise. for consistency (no multiple options).

Check to make sure all dynamic imports happen through central place. Important.
Bootstrap stuff, axios, etc.

If clicking on a shape, don't try to generate smiles string in info panel.

FPocketWeb throws error, queue says its was incorporated.

FPocketWeb: Add shape, can't hide it. I wonder if the shape is being added twice
somehow. I think it is. Need to investigate this. Search for "// TODO: Below
causes problems!!!"" ::: // TODO: Below causes problems!!!

Make ViewerPanel library agnostic (not just 3dmoljs). Is this worth it?

Once Yuri version of Open Babel ready, get rid of old version. Would be good if
you could put it in a web worker using import (rather than adding to head).

Integrate Yuri OpenBabel. See if you can get it to work in web worker.

renderAll on time to prevent rapid fire?

Broken: Selecting molecules in a row with (shift?)

Props molecule name is wrong "undefined:undefined".

When you load a CAN file, for example, maintain Protein/Compound/etc. organization. Currently messed up.

Can you use timeouts to prevent one render right after another? I think that
delays things quite a bit when there are many molecules being loaded.

molprops should be moved into its own menu item.

convertMolFormatOpenBabel() should accept multiple input files at once, all sent
to webworker simultaneously (DONE). Maybe ability to chain commands, so divide and
convert at once? Currently divides, then converts each separately. (transfer back and forth from worker).

With spinner, good to keep track of hierarchies. Could have show/hide withing
larger show/hide. Track nested calls like that with index.

Are labels being placed over molecules that are invisible? Need to investigate. (Definitely true... confirmed)

When you drop a large file, start spining. A good one for testing (that fails): /Users/jdurrant/Documents/Work/Laty/restart/virtual_library/LC_5k_Pre_Plated_Diversity_Set_PS7.sdf  

Load 1XDN. There's an extra layer in there. Why?

See also "This part of if then makes 1xdn not load. Need to investigate."

When adding new molecule, make sure filename is not already in list. Append (#).
You could now easily build this into extend and push on TreeNode classes.

Would it be possible to convert molecules to 3D using multiple processors? Maybe
there's a herd of openbabel workers always available, and incoming molecules are
automatically sent to them (queue system).

Multiframe files, still put under one molecule. And if more than a fixed number,
autohide all but first few. Can use merge feature if needed. Tick box on open:
    Option to merge as separte files, or all together.

parseMolecularModelFromText should accept array of text files, process them all
on one worker. Currently spawning a ton of workers when you use t.smi, for
example. See _ParseUsingOpenBabel.ts.

Load CAN. Takes a long time to assign 3D coordinates. Would to be good to add as
ready.

Load CAN with multiple files. Then visualize structures. They are wrong. Good to
always assign 3D coordinates to certain files?

Would be good if there were a message that was displayed when all calculations finish.

When saving file to single pdb, it's ackwardly named. Fix that.

SaveVRMLPlugin not working on 3DMoljs. Not adding vrml to filename.

Many docstrings

IForm needs to be able to display alert. Add a warning to changing parameters of FPocketWeb once implemented.

Also, why does form system not autodetect boolean as checkbox?

fpocketweb can't specify parameters. If you use the defaults you made up, you
get no results.

    Get table info from stdout. (It's not stdout. Where is the data?)

fpocketweb: opacty on surfaces (even if can't modify).

Others?

Backspace = delete.

Ctrl+A = select all

Search for // Merge them TODO: NOT MERGING PROPERLY

Protein hidden (because already present elsewhere)

Automatically open pockets so visible.

All but first few hidden.

Viewer could be spash screen until files loaded (with occasional messages that
could be informative).

No Data panel in Window menu

not running in worker. Also, 

Do fpocket web. Saying two proteins when there's only 1.

*****Export VRML for NGL viewer. Not working. Throw error.

Get common interface for mol viewers (to use nglviewer)? Working, but no labels,
zoom on click, and some representations are still problematic. Also, generic
save VRML. Not working. Need to test. Look for other places where might not work
(outside of ViewerPanel). See
https://stackoverflow.com/questions/52375863/how-to-import-three-js-gltfexporter-in-typescript

If recently moved mouse, then normal pointer. If over atom, hand pointer. If
haven't moved mouse in a while, grab. If dragging, grabbing.

Arrow change on hover.

Can some of what's in ViewerPanel be moved to ViewerParent? Maybe. Not sure.
Could still be utility in keeping the logic separate.

Need nice padding on bottom of styles panel.

When click atom, move center of all selected objects there. Also, message in
styles panel saying you can do this.

If no shapes anywhere, don't even show shape subsection of styles panel.

Shapes styles don't update. Search for "error?"

Shapes should have property "movable" to move if click on atom. Also, need to be
able to set opacity, color, and center/dimens/radius (if movable) in styles. For
this to work, you will need atom click callback.

Need vector for FormFull.

Consider implementing as hook through api.
https://nglviewer.org/ngl/api/class/src/geometry/shape.js~Shape.html

Need to make shapes (cubes and spheres). And need to implement for NGLTools.
https://3dmol.csb.pitt.edu/doc/$3Dmol.GLShape.html 

Currebtly default values on shapes (e.g., radius) are defined in Viewer3D. But
that hsould go into the parent so effects all viewers.

Need box.

Still need to do things like testing deleting, etc. Cloning. also, need to get
opacity working.

addShape should be defined on Parent, not each child. Child should define
addSphere, addBox, etc.

And legend to scroll if ther eis more than one table.

You should be able to download charts (CSV, XLSX)

You need a sortable table (optional).

Table needs horizontal scroll bar always visible (if goes to right)?

Need functions to batch the data. Test using molprop calculator.

Message at end of Mol Prop plugin letting people know properties will appear in
data tab. This kind of message needs to be in UserArgs, maybe? Might be
overkill.

Need to use data system for MolProp instead of current system. Pretty much done,
but need to check if data already present instead of recalaculting (essentially
use mol data as cache).

What about attaching a convert function to IFileInfo? Just something to think
about.

Shouldn't convert formats (e.g., to get CAN for prop calc) automatically so
availble onPopupDone. This shoul dbe in runjob. Because sometimes might want to
run conversion on remote server too. Maybe return object (from class) instead of
JSON? And it has method to do conversion right in jobs.
It's a class now, but it's tricky. You can do conversion in each job, but molecules need to be collated before, in the browser.

Font sizes in Jobs and Data are different. Make appearance consistent.

Table sorting header, should be case insensitive.

No data yet? Show message in panel saying need to load data and make it visible
or select it.

Every IMoleculeContainer should have a data attribute or terminal nodes. That
data attribute should include a data attribute itself, an ID, which is optional,
and a title, where the ID is generated by sluggifying the title if necessary.
Meaning, if it's absent. The data should also have a type attribute, and when
you click on the data itself, it can be either a graph or a table, and it opens
the right panel. Put them all in one panel, one after another, in sequence. Call
it the data panel. And all the data objects are collated according to the same
ID for all selected items, including children.

In data table, use abbreviaations for Portein, Compound, etc.

Click to data table, does something with tree to indicate as much. Select
molecule. And also unfurl its ancestors (so visible always).

Buttons not right justified in molecules?

What about making things in molecules viewer more generic? So can present
different kinds of data there. And clicking opens up apporpriate viewer. And
they are all objects so they can have associated functions inherited from common
base (like "display", "clone", etc.). I changed my mind, but e

Favicon. Using SD?

\*\*\* Perhaps settings (for local only). Edit -> Preferences.
Number of processors.
Viewer
Save/restore layout
Theme?

savePng and

Save molecule files needs more thourough tests.

When running tests, don't load two molecules (see deletemol for example)

For queue, do submit time, start time, end time. Always sort by submit time. Not
currently working. Need to think through carefully. Solution might be just to
use one queue.

Popup over title to let know about shift, command, cntrl, etc.?

Modal with just cancel button? Enter should also trigger cancel.

Multiple selected, click on just one, it should be selected and all others
deselected.

Possible to merge tree branches into one, at least at top level? Be sure to use
cloneMols() func for this.

If you clone group (e.g., protein), also clone all children. This doesn't
currently happen. I think it does now. Try cloning and deleteing a child to see
if it gets deleted from original.

On clone/extract rename, maybe just keep original root name but add increment.

Don't merge names in tree anymore. It's concise (which is nice), but ultimately
just confusing.

\*\*\* Need to be able to select multiple molecules. Currently working on one with
shift pressed. Search for "If shift key is down, selecting multiple items."

Idea to consider: MolCombine. You should be able to specify the formats. Also,
search for "This doesn't account for ligands!" Really, need to unify this with
saveing plugin. All goes to one place.

Delete test should test root node and other.

nglviewer resize panel, doesn't resize.

Can this be simplifed somehow? May be too many options for saving molecules. For
example, by chain needed?

Add ZIP files of molecules to test input

Maybe top level should always be molecule, with children always of the same
name, even if there is only one of them. That would simplify things like
merging. This is pretty critical, actually (no more OneMol merge strategy
supported).

Rename one tht is collapsed, always gets last one. What about earlir ones in
ancestory?

Extract and clone broken.

Deleteing molecules not working

Suggested name for clone/extact not always good.

MoleculeInputParams.vue pretty broken...

Would be nice if you could hide disabled items in form groups.

SaveMoleculesPlugin.vue is running this sort of thing through SaveAll.ts, SaveByMolecule.ts, SaveByChain.ts. These are the better ones to use.

MoleculeInputParams.vue using things like: (MakeMoleculeInput.ts too)
getProteinsToUse
getProteinChainsToUse
getCompoundsToUse
Which ultimately route through TreeUtils.ts. It does appear to be two different systems. Unify them. Get rid of these functions.

MoleculeInputParams

Is MolsToConsiderStr redundant with something?

Does saving files respesct other formats (e.g., XYZ)? I see PDBs regardless.

To save the files (assuming not biotite).

Single file (everything in one megafile) or separate files (proteins/ligands). None of this save by chain stuff. If they want chains, they can extract them to separate molecules.

In terms of which ones to save, all. If not all, visible or selected. (Checkboxes in UI, Booleans in func, maybe throw error if visible/selected set when all is).

Protein (othermolecule) format, then ligand format. If ligand format not given, use protein format for ligands.

Maybe instead of all/visible-selected, could be visible, selected, all others, or hidden/deselected

getTerminalNodesToConsider redundant with \_filterMolsByToConsiderProperty? Good to delete one.

Might want radio and checkbox bar options too.

One you implement molecule merge option, you could do away with that too. Good to simplify interface.

Eventually, you need a “save compounds to separate files” option. Will require refctoring a lot of things.

Returns a list of IFileInfo with the files. Use same structure as elsewhere (no two different structures).

Get rid of CombineProteinType? Use MolMergeStrategy instead.

MolsToUse (get rid of it? Replace with IMolsToConsider)

What is difference between ISaveTxt and IFileInfo?

Save plugin: Sometimes when click visible and selected both off, one doesn't pop
up. Need to investiate.

Pretty sure save is broken (make compound visible but select, say save only
visible, compound still shows up in zip file)

Icons? For treeview and f

Keyboard shortcuts built into menu system.

Buttons on queue to cancel jobs (using different kinds). Should have funciton to
show table column or not (part of IHeader; sort of implemented, but if you add
second batch of things to queue, doesn't reappear).

NGL viewer surface (change to chain) also produces error.

Menu behind divider

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
screen, \* resolution factor. Style determined by prop.

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

-   Gray out undo/redo if not possible?

Menu should close when popup opens.

Need a deselect all menu item.

You should be able to do clone on top-level molecule. Copying the molecule.
Extract doesn't make sense, though.

When you clone, not enough to do deep copy. Because then when you hide original,
hides clone. Need to regenerate GLModel for clone.
Note: You tried to implement this, broke it. Need to fix.

Need delete molecule too.

-   Not being removed.
-   I have confirmed the problem in \_zoomPerFocus. If I comment it mostly out,
    still doesn't work.
-   Confirmed being removed from cache. That's not the problem.
-   In example, even when using your library, remove does change value of
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
