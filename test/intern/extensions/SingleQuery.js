define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/on',
	'dojo/query',
	'dojo/string',
	'dgrid/Grid',
	'dgrid/extensions/SingleQuery',
	'dgrid/test/data/createSyncStore',
	'dgrid/test/data/genericData',
	'dojo/domReady!'
], function (test, assert, declare, on, query, string, Grid, SingleQuery, createSyncStore, genericData) {
	var grid;
	var SingleQueryGrid = declare([ Grid, SingleQuery ]);

	function getColumns() {
		return {
			id: 'id',
			col1: 'Column 1',
			col2: 'Column 2',
			col5: 'Column 5'
		};
	}

	function createTestStore() {
		return createSyncStore({ data: genericData });
	}

	test.suite('SingleQuery', function () {
		var store = createTestStore();
		var numItems = store.storage.fullData.length;

		test.beforeEach(function () {
			grid = new SingleQueryGrid({
				collection: store,
				columns: getColumns()
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		});

		test.afterEach(function () {
			grid.destroy();
		});

		test.test('Should render all results at once', function () {
			assert.strictEqual(grid.contentNode.children.length, numItems,
				'A grid row should exist for every item in the collection');
		});

		test.test('Should expose total via get(\'total\')', function () {
			assert.strictEqual(grid.get('total'), numItems,
				'grid.get(\'total\') should return total number of items');
		});

		test.test('Should fire dgrid-refresh-complete event, always on a separate turn than refresh', function () {
			var dfd = this.async(1000);
			grid.on('dgrid-refresh-complete', dfd.resolve);
		});
	});
});
