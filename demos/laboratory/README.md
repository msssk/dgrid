## Overview

* `index.html`: application entry point
* `Laboratory.js`: top-level widget with full-page UI layout
	* tab navigation
	* demo grid
	* generated code

Module hierarchy
<pre>
Laboratory
	ColumnEditor
		ColumnGrid
		ColumnConfigForm
	FeatureEditor
		FeatureGrid
		ConfigForm[]
</pre>

## Communication

In addition to the typical parent-child widget communication, and occasional cross-widget communication, the Laboratory listens at the top level (`Laboratory.js`) for data update events in order to keep the demo grid and generated code updated in real time.

### Pub-sub topics

* **/configuration/changed**: indicates that some data directly related to the display of the demo grid or generated code has changed
	* Publishers:
		* `ColumnGrid`: published when the grid's store is modified
		* `FeatureEditor`: published when the store used for the `FeatureGrid` is modified
		* `ConfigForm`: published when the form's `value` property changes
	* Subscribers:
		* `Laboratory`: when this topic is published the demo grid or generated code is updated (depending on which is visible)

* **/column/changed**: indicates that column configuration data has been updated in the UI
	* Publishers:
		* `ColumnConfigForm`: published when the form's `value` property changes
	* Subscribers:
		* `ColumnGrid`: keeps the store data constantly in sync with the UI form values

* **/store/columns/update**: indicates that column configuration data has been updated in the store
	* Publishers:
		* `ColumnGrid`: published when the grid's store is modified
	* Subscribers:
		* `configForms/Tree`: updates the list of columns names so the user can select which one should render the tree expando

* **/feature/select**: indicates that a feature (dgrid mixin) has been selected (or de-selected)
	* Publishers:
		* `FeatureGrid`: published when the grid's editable fields change (`dgrid-datachange` event)
	* Subscribers:
		* `ColumnConfigForm`: updates which column features are visible for configuration

## Modules

### `Laboratory.js`

This is the top-level widget. It provides the full-page UI layout and manages child widgets. While the functionality of most components is encapsulated in child widgets, `Laboratory` directly manages some items itself:

* tab navigation
* updating the demo grid (`_showDemoGrid`) or generated code (`_generateCode`), depending on which is visible
	* both the `_showDemoGrid` and `_generateCode` methods rely on the `_generateGridOptions` method to read the current configuration from the UI and calculate a dgrid options object to pass to the grid constructor function
* the "About" dialog

### `ColumnEditor.js`

This widget is initially visible when the page is loaded in the far left pane in the tab titled "Columns". It is a lightweight container for the `ColumnGrid` and `ColumnConfigForm` widgets.

#### API

* `ColumnEditor#get('columns')`: returns an array of objects from the store that represent the user-defined columns; proxies to `ColumnGrid#get('columns')`
* `ColumnEditor#addColumn/removeColumn`: these methods proxy to the respective methods on `ColumnGrid` and provide the ability to add and remove user-defined columns

### `ColumnGrid`

This widget is a little more than just a grid - it's a templated widget that contains a grid, but it also manages the grid's store and the new column entry field in the UI (visible directly above the grid).

#### API

* `ColumnGrid#get('columns')`: returns an array of objects from the store that represent the user-defined columns
* `ColumnGrid#addColumn(label)`: adds a new column to the grid with the specified label, and auto-generates a field name based on the label
* `ColumnGrid#removeColumn(target)`: target can be any value supported by dgrid's [`row` method](https://github.com/SitePen/dgrid/blob/master/doc/components/core-components/List.md#method-summary). The associated column definition will be removed from the store (and grid)

### `ColumnConfigForm`

This widget provides the UI for editing user-defined columns. Some sections are hidden or visible depending on which mixins are enabled (e.g. `Editor`, `ColumnHider`, etc.). It extends `dijit/form/_FormMixin` for basic form management and `the get/set('value')` methods. As a result, when the widget's `value` property is set, any values in the object provided that do not map directly to fields in the form are discarded. In order to correctly update items in the store, whenever the `value` is set the `id` property (which is not represented by any of the form fields) is persisted by the custom setter method. The custom getter method restores the `id` property to the object returned by `ColumnConfigForm#get('value')`.

### `FeatureEditor`

This widget encapsulates the functionality in the "Grid Features" and "Column Features" tabs. It extends `dijit/layout/StackContainer` and contains one `FeatureGrid` and multiple widgets that extend `configForms/ConfigForm`. The config form widgets are defined by two components:

1. an item in the array defined in the `data/features` module
2. (optional) if the feature has configurable properties, the UI to edit them should be provided in a module that extends `configForms/ConfigForm`. The module id of the config form module should be included in the item in the `data/features` module

#### API

* `FeatureEditor#getModuleConfig(moduleId)`: returns an object representing the configured options for the specified dgrid module id
* `FeatureEditor#isSelected(moduleId)`: returns a truthy value indicating if the specified dgrid mixin module id is selected
* `FeatureEditor#filter(query)`: filter's the `FeatureGrid` by the specified query
* `FeatureEditor#get('expandoColumn')`: if the `dgrid/Tree` mixin has been enabled, this method returns the name of the column that has been configured to render the tree expando icon
* `FeatureEditor#set('featureType')`: `featureType` should be "grid" or "column"; filters the `FeatureGrid` by the specified type; proxies to `FeatureGrid#set('featureType')`. The same grid is displayed in both the "Grid Features" and "Column Features" tabs using this method to filter which rows are displayed

### `FeatureGrid`

Like the `ColumnGrid` widget this is a templated widget that encapsulates not only the grid, but also its store. Logic is included to prevent incompatible configurations (e.g. `OnDemandGrid` with `drid/extensions/Pagination`).

#### API

* `FeatureGrid#set('featureType')`: `featureType` should be "grid" or "column"; filters the grid by the specified type
* `FeatureGrid#set('gridModule')`: `gridModule` should be "Grid" or "OnDemandGrid"; sets the base grid module of the user-defined grid and prevents incompatible combinations

### `ConfigForm`

This module should not be instantiated directly. It provides the basic functionality for grid feature configuration forms (e.g. `Selection`, `Tree`). Each subclassing module should provide an object on the `defaultsObject` property that defines default values for configuration properties. This can typically be achieved by providing the dgrid module's prototype since these modules define their configurable properties and their default values. The default values are used both to initially populate the form and to filter values - if the user has not changed the value from the default, it will be omitted from the generated code. `moduleName` and `documentationUrl` properties should also be specified for display in the config form's UI.

This base module provides rendering of a "Done" button as well as custom accessor methods to set unspecified properties to their default values and to filter out properties whose values match the default values when reading the `value` property.
