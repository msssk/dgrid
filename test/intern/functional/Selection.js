define([
	"intern!tdd",
	"intern/chai!assert",
	"./util",
	"dojo/node!wd/lib/special-keys",
	"require"
], function (test, assert, util, specialKeys, require) {
	var GRID_ROW_COUNT = 6;

	test.suite("dgrid/Selection functional tests", function () {
		var CONTROL_KEY = specialKeys.Control;
		var isShiftClickSupported;

		test.before(function () {
			var remote = this.get("remote");

			remote.sessionCapabilities()
				.then(function (sessionCapabilities) {
					if (sessionCapabilities.platform === "MAC") {
						CONTROL_KEY = specialKeys.Command;
					}
				});

			remote.get(require.toUrl("./Selection.html"));

			return remote.waitForCondition("ready", 15000).then(function () {
				return util.isShiftClickSupported(remote).then(function (isSupported) {
					isShiftClickSupported = isSupported;
					if (!isSupported) {
						console.warn("shift+click tests will be no-ops because " +
							"this browser/WebDriver combination does not support shift+click.");
					}
				});
			});
		});

		test.beforeEach(function () {
			return this.get("remote").execute(function () {
				grid.clearSelection();
			});
		});

		// Test goals:
		// Verify click selects one row and deselects any other rows
		test.test("selectionMode: single", function () {
			var remote = this.get("remote");
			var i;

			function each (rowIndex) {
				remote.execute(function () {
							grid.set("selectionMode", "single");
						})
						.elementByCssSelector("#grid-row-" + rowIndex)
						.click()
						.end()
					.executeAsync(function (done) {
						done(grid.selection);
					})
						.then(function (gridSelection) {
							var rowId;

							for (rowId = 0; rowId < GRID_ROW_COUNT; rowId++) {
								if (rowId === rowIndex ) {
									assert.isTrue(gridSelection[rowId],
										"The clicked row (" + rowIndex + ") should be selected");
								}
								else {
									assert.isUndefined(gridSelection[rowId],
										"Row " + rowId + " should not be selected");
								}
							}
						});
			}

			for (i = 0; i < GRID_ROW_COUNT; i++) {
				each(i);
			}

			return remote.end();
		});

		// Test goals:
		// Verify shift+click is same as normal click
		test.test("selectionMode: single; shift+click", function () {
			var remote = this.get("remote");
			var i;

			if (!isShiftClickSupported) {
				return;
			}

			function each (rowIndex) {
				remote.execute(function () {
							grid.set("selectionMode", "single");
						})
						.elementByCssSelector("#grid-row-" + rowIndex)
						.keys(specialKeys.Shift)
						.click()
						.keys(specialKeys.NULL)
						.end()
					.executeAsync(function (done) {
						done(grid.selection);
					})
						.then(function (gridSelection) {
							var rowId;

							for (rowId = 0; rowId < GRID_ROW_COUNT; rowId++) {
								if (rowId === rowIndex ) {
									assert.isTrue(gridSelection[rowId],
										"The clicked row (" + rowIndex + ") should be selected");
								}
								else {
									assert.isUndefined(gridSelection[rowId],
										"Row " + rowId + " should not be selected");
								}
							}
						})
					.end();
			}

			for (i = 0; i < GRID_ROW_COUNT; i++) {
				each(i);
			}

			return remote.end();
		});

		// Test goals:
		// Verify ctrl+click is mostly same as normal click; will deselect on a selected row
		test.test("selectionMode: single; control+click", function () {
			var remote = this.get("remote");
			var i;

			function each (rowIndex) {
				remote.execute(function () {
						grid.set("selectionMode", "single");
					})
					.elementByCssSelector("#grid-row-" + rowIndex)
					.keys(CONTROL_KEY)
					.click()
					.keys(specialKeys.NULL)
					.executeAsync(function (done) {
						done(grid.selection);
					})
					.then(function (gridSelection) {
						var rowId;

						for (rowId = 0; rowId < GRID_ROW_COUNT; rowId++) {
							if (rowId === rowIndex ) {
								assert.isTrue(gridSelection[rowId],
									"The clicked row (" + rowIndex + ") should be selected");
							}
							else {
								assert.isUndefined(gridSelection[rowId],
									"Row " + rowId + " should not be selected");
							}
						}
					})
					.keys(CONTROL_KEY)
					.click()
					.keys(specialKeys.NULL)
					.executeAsync(function (done) {
						done(grid.selection);
					})
					.then(function (gridSelection) {
						var rowId;

						for (rowId = 0; rowId < GRID_ROW_COUNT; rowId++) {
							assert.isUndefined(gridSelection[rowId],
								"Row " + rowId + " should not be selected");
						}
					})
				.end();
			}

			for (i = 0; i < GRID_ROW_COUNT; i++) {
				each(i);
			}

			return remote.end();
		});

	});
});
