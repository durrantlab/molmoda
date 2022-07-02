Continue implementing forms per https://getbootstrap.com/docs/5.2/forms/select/
(now on radios)

If no format specified, get it from the file extension.

Button?

Plugins. Divide into core (always loads) and optional.

When setting up styles panel, sometimes doesn't reflect changes if hidden.
Especially after having turned to hidden explicitly (never comes back). Need to
invdstigate.


# DONE

Toggle visibility and focus in styles too. Might be ablet to eliinate "none" category.

viewerDirty is necessary? Why not just rely on reactivity?

Hover over atom, get info. Click on it, zoom to that atom.

If you click on a tree folder, act on everything below it as well?

onTreeviewChanged is VERY slow. Need to implement caching system. (Some
progress, but still working on it.)

Can you load and parse molecules from webworker?

Also implement disabled on all form inputs.
