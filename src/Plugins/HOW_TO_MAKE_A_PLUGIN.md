# How to Make a Plugin

TODO: Create demo (minimal) plugin to illustrate. Once API settles.

## \<PluginComponent>

All plugins must include a template that contains only a single
\<PluginComponent> tag, which is used to display the plugin.

### Required Properties

Every \<PluginComponent> must define the following properties.


#### `pluginId` (:property) <a id="pluginId"></a>

A unique id that defines the plugin. Must be lower case. This component property is required.
 Type: `string`. 

#### `title` (:property) <a id="title"></a>

Title of the popup. This component property is required.
 Type: `string`. 

#### `userArgs` (:property) <a id="userArgs"></a>

The user arguments (plugin parameters) that the end user can specify. This component property is required.
 Type: `FormElement[]`.  `FormElement` is defined in [FormFullInterfaces.ts, line 14](https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/UI/Forms/FormFull/FormFullInterfaces.ts#L14).


### Optional Properties

\<PluginComponent> is not required to define the following properties. They are
optional.


#### `actionBtnTxt` (:property) <a id="actionBtnTxt"></a>

The text that appears on the action button (e.g., "Load"). This component property is optional. If it is not specified, the default value is used: `"Load"`.
 Type: `string`. 

#### `cancelBtnTxt` (:property) <a id="cancelBtnTxt"></a>

The text that appears on the cancel button (e.g., "Cancel"). This component property is optional. If it is not specified, the default value is used: `"Cancel"`.
 Type: `string`. 

#### `hideIfDisabled` (:property) <a id="hideIfDisabled"></a>

Whether to hide user parameters that are disabled or to show them in a disabled state. This component property is optional. If it is not specified, the default value is used: `false`.
 Type: `boolean`. 

#### `intro` (:property) <a id="intro"></a>

Introductory text that appears at the top of the plugin (above the user inputs). This component property is optional. If it is not specified, the default value is used: `""`.
 Type: `string`. 

#### `isActionBtnEnabled` (:property) <a id="isActionBtnEnabled"></a>

Whether the action button (e.g., "Load") is enabled. This component property is optional. If it is not specified, the default value is used: `undefined`.
 Type: `boolean`. 

#### `prohibitCancel` (:property) <a id="prohibitCancel"></a>

Whether the user can cancel the plugin. Some rare plugins are not cancelable. This component property is optional. If it is not specified, the default value is used: `false`.
 Type: `boolean`. 

#### `variant` (:property) <a id="variant"></a>

The popup variant (i.e., whether to style the popup as primary, secondary, success, danger, etc.). This component property is optional. If it is not specified, the default value is used: `PopupVariant.Primary`.
 Type: `PopupVariant`.  `PopupVariant` is defined in [InterfacesAndEnums.ts, line 3](https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/UI/Layout/Popups/InterfacesAndEnums.ts#L3).


### Events

\<PluginComponent> emits the following events.


#### `onDataChanged` (@event) <a id="onDataChanged"></a>

Runs when the user changes any user arguments (plugin parameters).

| Parameter | Type | Description
| --------- | ---- | -----------
| `userArgs` | `IUserArg[]` | The updated user arguments. `IUserArg` is defined in [FormFullUtils.ts, line 8](https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/UI/Forms/FormFull/FormFullUtils.ts#L8).

#### `onPopupDone` (@event) <a id="onPopupDone"></a>

Runs when the primary action button is pressed, after the popup closes.

| Parameter | Type | Description
| --------- | ---- | -----------
| `userArgs` | `IUserArg[]` | The specified user arguments. `IUserArg` is defined in [FormFullUtils.ts, line 8](https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/UI/Forms/FormFull/FormFullUtils.ts#L8).

#### `onPopupDone2` (@event) <a id="onPopupDone2"></a>

Runs when the secondary action button is pressed, after the popup closes.


## Plugin Class

All plugin classes must export a class that extends the `PluginParentClass`
class. The class name must end in `Plugin`. For example:

`export default class ActionPlugin extends PluginParentClass`

### Required Functions/Variables

Every plugin class must define the following functions and variables.


#### `contributorCredits` (variable) <a id="contributorCredits"></a>

A list of people to credit.
 Type: `IContributorCredit[]`.  `IContributorCredit` is defined in [PluginInterfaces.ts, line 69](https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/Plugins/PluginInterfaces.ts#L69).

#### `menuPath` (variable) <a id="menuPath"></a>

The menu path for this plugin (e.g., `["[3] Biotite", "[1] About"]` or `"File/Molecules/Import/[4] AlphaFold"`). Note that you can include a priority (number) in brackets. The priority is stripped from the text, but its value is used to order the menu item relative to others. The vast majority of plugins should be accessible from the menu, but set [`menuPath`](#menuPath) to null if you want to create a menu-inaccessible plugin.
 Type: `string[] | string | null`. 

#### `pluginId` (variable) <a id="pluginId"></a>

A unique id that defines the plugin. Must be lower case.
 Type: `string`. 

#### `runJobInBrowser` (function) <a id="runJobInBrowser"></a>

Each plugin is associated with specific jobs (calculations). Most of these will run in the browser itself, rather than on a remote computing resource. This function runs a single job in the browser (or calls the JavaScript/WASM libraries to run the job). The job-queue system calls `runJob` directly.

| Parameter | Type | Description
| --------- | ---- | -----------
| `[parameterSet]` | `any` | One of the parameterSets items submitted via the [`submitJobs`](#submitJobs) function. Optional.
| `(returns)` | `RunJobReturn` | A promise that resolves a result (object) when the job is done. The object maps a filename to file content, with the type determined by the filename (key) extension. You can also return such an object directly, without using a promise, if the job is synchronous. Return void or undefined if there's nothing to return. `RunJobReturn` is defined in [PluginParentClass.ts, line 31](https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/Plugins/Parents/PluginParentClass/PluginParentClass.ts#L31).

#### `softwareCredits` (variable) <a id="softwareCredits"></a>

A list of software credits. If the plugin uses no third-party packages, set this to `[]`.
 Type: `ISoftwareCredit[]`.  `ISoftwareCredit` is defined in [PluginInterfaces.ts, line 63](https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/Plugins/PluginInterfaces.ts#L63).

#### `userArgs` (variable) <a id="userArgs"></a>

A list of user arguments. Note that [`userArgs`](#userArgs) defines the user arguments, but it is not reactive. See it as an unchangable template. Use [`updateUserArgs`](#updateUserArgs) to programmatically change actual user-specified inputs.
 Type: `FormElement[]`.  `FormElement` is defined in [FormFullInterfaces.ts, line 14](https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/UI/Forms/FormFull/FormFullInterfaces.ts#L14).


### Optional Functions/Variables

Plugin classes are not required to define the following functions and variables.
They are optional.


#### `checkPluginAllowed` (function) <a id="checkPluginAllowed"></a>

Checks if the plugin can currently run. This function allows plugins to provide a warning message when the user has not yet loaded the data necessary to run the plugin successfully.

| Parameter | Type | Description
| --------- | ---- | -----------
| `(returns)` | `string \| null` | If a string, the error message to show instead of running the plugin. If null, proceeds to run the plugin.

#### `onBeforePopupOpen` (function) <a id="onBeforePopupOpen"></a>

Called right before the plugin popup opens.

| Parameter | Type | Description
| --------- | ---- | -----------
| `(returns)` | `boolean \| Promise<boolean> \| void` | If [`onBeforePopupOpen`](#onBeforePopupOpen) returns false or a promise that resolves false, the popup will not open. This is useful for those rare occasions when you need to stop an opening plugin. If void (or true), the popup will still open.

#### `onMounted` (function) <a id="onMounted"></a>

Called when the plugin is mounted. No plugin should define its own `mounted()` function. Use [`onMounted`](#onMounted) instead.

#### `onPopupOpen` (function) <a id="onPopupOpen"></a>

Called right after the plugin popup opens.


### Helper Functions

Plugin classes should not define the following helper (utility) functions. They
are defined in the `PluginParentClass` and can be called from other plugin class
functions.


#### `closePopup` (function) <a id="closePopup"></a>

Closes the popup.

#### `openPopup` (function) <a id="openPopup"></a>

Opens the popup.

#### `submitJobs` (function) <a id="submitJobs"></a>

Submits multiple jobs to the queue system. [`submitJobs`](#submitJobs) is typically called from the [`onPopupDone`](#onPopupDone) function (after the user presses the popup's action button).

| Parameter | Type | Description
| --------- | ---- | -----------
| `[parameterSets]` | `any[]` | A list of parameters, one per job. Even if your plugin submits only one job (most common case), you must still wrap the parameters in an array. Optional.
| `[numProcessorsPerJob=1]` | `number` | The number of processors to use per job. Defaults to 1.
| `[delayBetweenJobsMS]` | `number` | The number of milliseconds to wait between running jobs. A modal appears during this time giving the user the opportunity to cancel all jobs. Optional.

#### `testLoadExampleProtein` (function) <a id="testLoadExampleProtein"></a>

Adds a selenium test command to load a sample molecule (small protein and ligand) for testing.

| Parameter | Type | Description
| --------- | ---- | -----------
| `(returns)` | `ITestCommand` | The command to wait for the molecule to load. `ITestCommand` is defined in [ParentPluginTestFuncs.ts, line 14](https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/Testing/ParentPluginTestFuncs.ts#L14).

#### `testPressButton` (function) <a id="testPressButton"></a>

Adds a selenium test command to press a plugin (popup) button.

| Parameter | Type | Description
| --------- | ---- | -----------
| `selector` | `string` | The css selector of the button.
| `(returns)` | `ITestCommand` | The command to run. `ITestCommand` is defined in [ParentPluginTestFuncs.ts, line 14](https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/Testing/ParentPluginTestFuncs.ts#L14).

#### `testUserArg` (function) <a id="testUserArg"></a>

If running a selenium test, this function will generate the command to test a specific user argument.

| Parameter | Type | Description
| --------- | ---- | -----------
| `argName` | `string` | The name of the specific user argument.
| `argVal` | `any` | The value of the specific user argument.
| `(returns)` | `ITestCommand` | The command to test the specific user argument. `ITestCommand` is defined in [ParentPluginTestFuncs.ts, line 14](https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/Testing/ParentPluginTestFuncs.ts#L14).

#### `testWaitForRegex` (function) <a id="testWaitForRegex"></a>

If running a selenium test, this function will generate the command to wait until a given DOM element contains specified text.

| Parameter | Type | Description
| --------- | ---- | -----------
| `selector` | `string` | The selector of the DOM element.
| `regex` | `string` | The regex to wait for, as a string.
| `(returns)` | `ITestCommand` | The command to wait until the DOM element contains the specified text. `ITestCommand` is defined in [ParentPluginTestFuncs.ts, line 14](https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/Testing/ParentPluginTestFuncs.ts#L14).

#### `updateUserArgs` (function) <a id="updateUserArgs"></a>

Programmatically update user arguments. Necessary because [`userArgs`](#userArgs) is NOT reactive. Useful to do things like (1) prepopulate a [`userArgs`](#userArgs) value or (2) modify one [`userArgs`](#userArgs) value based on the value of another (see also `<PluginComponent>`'s `onDataChanged` function). For [`updateUserArgs`](#updateUserArgs) to work, the plugin's `<PluginComponent>` must have `ref="pluginComponent"`.

| Parameter | Type | Description
| --------- | ---- | -----------
| `userArgs` | `IUserArg[]` | The user variables to update. `IUserArg` is defined in [FormFullUtils.ts, line 8](https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/UI/Forms/FormFull/FormFullUtils.ts#L8).


### Optional Functions/Variables with Good Defaults

The following functions and variables have good default implementations, so most
plugin classes should not define them. But they can be defined if needed
(advanced use, rare cases).


#### `getTests` (function) <a id="getTests"></a>

Gets the selenium test commands for the plugin. For advanced use.

| Parameter | Type | Description
| --------- | ---- | -----------
| `(returns)` | `ITest[] \| ITest` | The selenium test command(s). `ITest` is defined in [ParentPluginTestFuncs.ts, line 20](https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/Testing/ParentPluginTestFuncs.ts#L20). `ITest` is defined in [ParentPluginTestFuncs.ts, line 20](https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/Testing/ParentPluginTestFuncs.ts#L20).

#### `onEndJobLogMsg` (function) <a id="onEndJobLogMsg"></a>

Provides the message to log when the plugin job finishes. The total run time will be appended to the message. Return "" if you want to hide this message.

| Parameter | Type | Description
| --------- | ---- | -----------
| `pluginId` | `string` | The plugin ID.
| `(returns)` | `string` | The message to log.

#### `onPluginStart` (function) <a id="onPluginStart"></a>

Runs when the user first starts the plugin. Called when the user clicks the plugin from the menu. Can also be called directly using the api (advanced/rare use).

| Parameter | Type | Description
| --------- | ---- | -----------
| `[payload]` | `any` | Data to pass to the plugin. Probably only useful when programmatically starting the plugin without using the menu system. Optional.

#### `onPopupDone` (function) <a id="onPopupDone"></a>

Runs when the user clicks the plugin action button (e.g., "Load"). You likely want to call the [`submitJobs`](#submitJobs) function from [`onPopupDone`](#onPopupDone) to submit job(s) to the queue system. The default version submits the user arguments as a single job. Override it if you want to modify those arguments before submitting to the queue, or if you want to submit multiple jobs to the queue.

| Parameter | Type | Description
| --------- | ---- | -----------
| `userArgs` | `IUserArg[]` | The user arguments. `IUserArg` is defined in [FormFullUtils.ts, line 8](https://git.durrantlab.pitt.edu/jdurrant/biotite-suite/-/blob/main/src/UI/Forms/FormFull/FormFullUtils.ts#L8).

#### `onStartJobLogMsg` (function) <a id="onStartJobLogMsg"></a>

Provides the message to log when the plugin job starts. The parameters will be automatically appended to the message, if given. Return "" if you want to hide this message.

| Parameter | Type | Description
| --------- | ---- | -----------
| `pluginId` | `string` | The plugin ID.
| `(returns)` | `string` | The message to log.

#### `onSubmitJobLogMsg` (function) <a id="onSubmitJobLogMsg"></a>

Provides the message to log when the plugin job is submitted. Return "" if you want to hide this message.

| Parameter | Type | Description
| --------- | ---- | -----------
| `pluginId` | `string` | The plugin ID.
| `(returns)` | `string` | The message to log.


