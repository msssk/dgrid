define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/dom-class',
	'dojo/topic',
	'dijit/_WidgetBase',
	'./ColumnConfigForm',
	'./ColumnGrid'
], function (declare, lang, domClass, topic, _WidgetBase, ColumnConfigForm, ColumnGrid) {
	return declare(_WidgetBase, {
		baseClass: 'columnEditor',

		buildRendering: function () {
			this.inherited(arguments);

			this.columnGrid = new ColumnGrid().placeAt(this.domNode);
			this.form = new ColumnConfigForm().placeAt(this.domNode);
		},

		postCreate: function () {
			this.inherited(arguments);

			this.form.on('close', lang.hitch(this, '_showGrid'));
			this.columnGrid.on('editcolumn', lang.hitch(this, '_onEditColumn'));
			topic.subscribe('/configuration/changed', lang.hitch(this, '_onConfigChanged'));
		},

		startup: function () {
			if (this._started) {
				return;
			}
			this.inherited(arguments);

			this.columnGrid.startup();
			this.form.startup();
		},

		_onConfigChanged: function () {
			var formValue = this.form.get('value');

			// If the configuration has changed as a result of enabling/disabling a column feature mixin the valid
			// options in the column config form will change, but the data in this.columnGrid's store won't
			// automatically change. If we recalculate the value from this.form and notify this.columnGrid, then
			// it will update the data in the store.
			if (formValue && formValue.id) {
				// If there's a form value that has an id, then there's a store item that needs to be updated
				topic.publish('/column/changed', formValue);
			}
			else {
				// If there's no store item to update, we still want to update the demo to reflect that some feature
				// has been enabled/disabled
				topic.publish('/demo/update');
			}
		},

		_getColumnsAttr: function () {
			return this.columnGrid.get('columns');
		},

		_showGrid: function () {
			domClass.remove(this.domNode, 'slid');
		},

		_onEditColumn: function (event) {
			domClass.add(this.domNode, 'slid');
			this.form.set('value', event.data);
		}
	});
});
