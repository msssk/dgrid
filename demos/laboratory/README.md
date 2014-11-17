index.html: application entry point
Laboratory.js: top-level widget with full-page UI layout
* tab navigation
* demo grid
* generated code

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

In addition to the typical parent-child widget communication, and occasional cross-widget communication, the Laboratory listens at the top level (Laboratory.js) for data update events in order to keep the demo grid and generated code updated in real time.

### Pub-sub topics

* /configuration/changed: indicates that some data directly related to the display of the demo grid or generated code has changed

** Subscribers:

*** `Laboratory`: when this topic is published the demo grid or generated code is updated (depending on which is visible)

** Publishers:

*** `ColumnGrid`: published when the grid's store is modified
*** `FeatureEditor`: published when the store used for the FeatureGrid is modified
*** `ConfigForm`: published when the form's `value` property changes

* /column/changed: indicates that column configuration data has been updated in the UI

** Subscribers:

*** `ColumnGrid`: keeps the store data constantly in sync with the UI form values

** Publishers:

*** `ColumnConfigForm`: published when the form's `value` property changes

* /store/columns/update: indicates that the data in the columns store (ColumnGrid) has changed

** Subscribers:

*** `configForms/Tree`: updates the list of columns names so the user can select which one should render the tree expando

** Publishers:

*** `ColumnGrid`: published when the grid's store is modified

/feature/select: indicates that a feature (dgrid mixin) has been selected (or de-selected)

Subscribers:

* `ColumnConfigForm`: updates which column features are visible for configuration

Publishers:

* `FeatureGrid`: published when the grid's editable fields change (`dgrid-datachange` event)

