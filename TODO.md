If no format specified, get it from the file extension.

Button?

When change colors and things, shouldn't refocus.

Surfaces don't turn off with associated molecules.

When you load multi-frame pdb or mol2, need to deal with that still.

Messaging. Need toast, log, system alert, etc. You started working on toast.
    Rather than bind to a boolean to show or not, populate a list of messages.
    After certain amount of time (specified in data structure), close toast and
    go to next one (if present).
    https://getbootstrap.com/docs/5.0/components/toasts/

Ability to save store to localstorage, and download.
    https://www.npmjs.com/package/vuex-persist
    https://github.com/championswimmer/vuex-persist/issues/99 
    Don't think this is going to work. Started to work on custom solution...

vue-chartjs (or V Chart Plugin better?)

You need to be able to reorder the molecules. 
    https://www.npmjs.com/package/vuedraggable

Also need to be able to extract a molecule, and merge it.


https://github.com/pulsardev/vue-tour
https://gruhn.github.io/vue-qrcode-reader/demos/CustomTracking.html ???
Table component?


Surface opacity? Sticks/lines width? Etc.

You can start working on loading and saving without openbabel.js.

Shouldn't be able to focus on molecule that is not visible.

# DONE

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
