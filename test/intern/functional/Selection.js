define([
	"intern!tdd",
	"intern/chai!assert",
	"./util",
	"dojo/node!wd/lib/special-keys",
	"require"
], function (test, assert, util, specialKeys, require) {
	var GRID_ROW_COUNT = 6;
	var getSelection = "return grid.selection;";

	function expect(expectedSelection, message) {
		return function (gridSelection) {
			assert.deepEqual(gridSelection, expectedSelection, message);
		};
	}

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
				remote.elementByCssSelector("#grid-row-" + rowIndex)
						.click()
						.end()
					.execute(getSelection)
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

			remote.execute(function () {
				grid.set("selectionMode", "single");
			});

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
				remote.elementByCssSelector("#grid-row-" + rowIndex)
						.keys(specialKeys.Shift)
						.click()
						.keys(specialKeys.NULL)
						.end()
					.execute(getSelection)
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

			remote.execute(function () {
				grid.set("selectionMode", "single");
			});

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
				remote.elementByCssSelector("#grid-row-" + rowIndex)
						.keys(CONTROL_KEY)
						.click()
						.keys(specialKeys.NULL)
						.end()
					.execute(getSelection)
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
					.execute(function () {
						return grid.selection;
					})
						.then(function (gridSelection) {
							var rowId;

							for (rowId = 0; rowId < GRID_ROW_COUNT; rowId++) {
								assert.isUndefined(gridSelection[rowId],
									"Row " + rowId + " should not be selected");
							}
						});
			}

			remote.execute(function () {
				grid.set("selectionMode", "single");
			});

			for (i = 0; i < GRID_ROW_COUNT; i++) {
				each(i);
			}

			return remote.end();
		});

		// Test goals:
		// Verify click selects one row and deselects any other rows
		test.test("selectionMode: extended", function () {
			var remote = this.get("remote");
			var i;

			function each (rowIndex) {
				remote.elementByCssSelector("#grid-row-" + rowIndex)
						.click()
						.end()
					.execute(getSelection)
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

			remote.execute(function () {
				grid.set("selectionMode", "extended");
			});

			for (i = 0; i < GRID_ROW_COUNT; i++) {
				each(i);
			}

			return remote.end();
		});

		// Test goals:
		// Verify shift+click selects range; deselects anything else
		test.test("selectionMode: extended; shift+click", function () {
			var remote = this.get("remote");

			if (!isShiftClickSupported) {
				return;
			}

			remote.execute(function () {
					grid.set("selectionMode", "extended");
				})
				.elementByCssSelector("#grid-row-0")
					.click()
					.end()
				.elementByCssSelector("#grid-row-1")
					.keys(CONTROL_KEY)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.elementByCssSelector("#grid-row-3")
					.keys(specialKeys.Shift)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.execute(getSelection)
					.then(expect({
						1: true,
						2: true,
						3: true
					}, "Rows 1-3 should be selected"))
				.elementByCssSelector("#grid-row-4")
					.click()
					.end()
				.elementByCssSelector("#grid-row-5")
					.keys(specialKeys.Shift)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.execute(getSelection)
					.then(expect({
						4: true,
						5: true
					}, "Rows 4-5 should be selected"));

			return remote.end();
		});

		// Test goals:
		// Verify control+click toggles selection; does not affect anything else
		test.test("selectionMode: extended; control+click", function () {
			var remote = this.get("remote");

			remote.execute(function () {
					grid.set("selectionMode", "extended");
				})
				.elementByCssSelector("#grid-row-0")
					.keys(CONTROL_KEY)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.execute(getSelection)
					.then(expect({ 0: true }, "Row 0 should be selected"))
				.elementByCssSelector("#grid-row-0")
					.keys(CONTROL_KEY)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.execute(getSelection)
					.then(expect({}, "No rows should be selected"))
				.elementByCssSelector("#grid-row-1")
					.keys(CONTROL_KEY)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.elementByCssSelector("#grid-row-2")
					.keys(CONTROL_KEY)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.elementByCssSelector("#grid-row-3")
					.keys(CONTROL_KEY)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.execute(getSelection)
					.then(expect({
						1: true,
						2: true,
						3: true
					}, "Rows 1-3 should be selected"))
				.elementByCssSelector("#grid-row-0")
					.click()
					.end()
				.elementByCssSelector("#grid-row-5")
					.keys(specialKeys.Shift)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.elementByCssSelector("#grid-row-3")
					.keys(CONTROL_KEY)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.execute(getSelection)
					.then(expect({
						0: true,
						1: true,
						2: true,
						4: true,
						5: true
					}, "Rows 0-2; 4-5 should be selected"));

			return remote.end();
		});

		// Test goals:
		// Verify control+shift+click selects range; does not affect anything else
		test.test("selectionMode: extended; control+shift+click", function () {
			var remote = this.get("remote");

			if (!isShiftClickSupported) {
				return;
			}

			remote.execute(function () {
					grid.set("selectionMode", "extended");
				})
				.elementByCssSelector("#grid-row-0")
					.click()
					.end()
				.elementByCssSelector("#grid-row-2")
					.keys(specialKeys.Shift)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.elementByCssSelector("#grid-row-4")
					.keys(CONTROL_KEY)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.elementByCssSelector("#grid-row-5")
					.keys(CONTROL_KEY)
					.keys(specialKeys.Shift)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.execute(getSelection)
					.then(expect({
						0: true,
						1: true,
						2: true,
						4: true,
						5: true
					}, "Rows 0-2; 4-5 should be selected"));

			return remote.end();
		});

		// Test goals:
		// Verify click adds to selection
		test.test("selectionMode: multiple; click", function () {
			var remote = this.get("remote");
			var expectedSelection = {};
			var i;

			function each(rowIndex) {
				remote.elementByCssSelector("#grid-row-" + rowIndex)
						.click()
						.end()
					.execute(getSelection)
						.then(function (gridSelection) {
							expectedSelection[rowIndex] = true;
							assert.deepEqual(gridSelection, expectedSelection,
								"Clicking rows should add to selection");
						});
			}

			remote.execute(function () {
				grid.set("selectionMode", "multiple");
			});

			for (i = 0; i < GRID_ROW_COUNT; i++) {
				each(i);
			}

			return remote.end();
		});

		// Test goals:
		// Verify shift+click creates multiple selections
		test.test("selectionMode: multiple; shift+click", function () {
			var remote = this.get("remote");

			if (!isShiftClickSupported) {
				return;
			}

			remote.execute(function () {
					grid.set("selectionMode", "multiple");
				})
				.elementByCssSelector("#grid-row-0")
					.click()
					.end()
				.elementByCssSelector("#grid-row-2")
					.click()
					.end()
				.elementByCssSelector("#grid-row-5")
					.keys(specialKeys.Shift)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.execute(getSelection)
					.then(expect({
						0: true,
						2: true,
						3: true,
						4: true,
						5: true
					}, "Shift+clicking rows should add to selection"));

			return remote.end();
		});

		// Test goals:
		// Verify click selects row (no deselection or side effects)
		// Verify control+click toggles selection on target row (no side effects)
		test.test("selectionMode: multiple; control+click", function () {
			var remote = this.get("remote");
			var expectedSelection = {};
			var i;

			function clickEach(rowIndex) {
				remote.elementByCssSelector("#grid-row-" + rowIndex)
						.click()
						.end()
					.execute(getSelection)
						.then(function (gridSelection) {
							expectedSelection[rowIndex] = true;

							assert.deepEqual(gridSelection, expectedSelection,
								"Clicking rows should add to selection");
						});
			}

			function controlClickEach(rowIndex) {
				remote.elementByCssSelector("#grid-row-" + rowIndex)
						.keys(CONTROL_KEY)
						.click()
						.keys(specialKeys.NULL)
						.end()
					.execute(getSelection)
						.then(function (gridSelection) {
							if (expectedSelection[rowIndex] ) {
								delete expectedSelection[rowIndex];
							}
							else {
								expectedSelection[rowIndex] = true;
							}

							assert.deepEqual(gridSelection, expectedSelection,
								"Control+clicking rows should toggle selection");
						});
			}

			remote.execute(function () {
				grid.set("selectionMode", "multiple");
			});

			// Select each row with click
			for (i = 0; i < GRID_ROW_COUNT; i++) {
				clickEach(i);
			}

			// Click each row again and verify no change of selection state
			for (i = 0; i < GRID_ROW_COUNT; i++) {
				clickEach(i);
			}

			// Control+click each row and verify selection was toggled (off)
			for (i = 0; i < GRID_ROW_COUNT; i++) {
				controlClickEach(i);
			}

			// Control+click each row and verify selection was toggled (on)
			for (i = 0; i < GRID_ROW_COUNT; i++) {
				controlClickEach(i);
			}

			return remote.end();
		});

		// Test goals:
		// Verify click (and with shift or control) toggles selection on target row (no side effects)
		test.test("selectionMode: toggle", function () {
			var remote = this.get("remote");

			remote.execute(function () {
					grid.set("selectionMode", "toggle");
				})
				.elementByCssSelector("#grid-row-0")
					.click()
					.end()
				.elementByCssSelector("#grid-row-1")
					.keys(specialKeys.Shift)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.elementByCssSelector("#grid-row-2")
					.keys(CONTROL_KEY)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.execute(getSelection)
					.then(expect({
						0: true,
						1: true,
						2: true
					}, "Clicking should select rows"))
				.elementByCssSelector("#grid-row-0")
					.click()
					.end()
				.elementByCssSelector("#grid-row-1")
					.keys(specialKeys.Shift)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.elementByCssSelector("#grid-row-2")
					.keys(CONTROL_KEY)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.execute(getSelection)
					.then(expect({}, "Clicking should deselect rows"));

			return remote.end();
		});

		// Test goals:
		// Verify click (and with shift or control) has no effect on selection
		test.test("selectionMode: none", function () {
			var remote = this.get("remote");

			remote.execute(function () {
					grid.set("selectionMode", "none");
				})
				.elementByCssSelector("#grid-row-0")
					.click()
					.end()
				.elementByCssSelector("#grid-row-1")
					.keys(specialKeys.Shift)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.elementByCssSelector("#grid-row-2")
					.keys(CONTROL_KEY)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.elementByCssSelector("#grid-row-3")
					.click()
					.end()
				.elementByCssSelector("#grid-row-4")
					.keys(specialKeys.Shift)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.elementByCssSelector("#grid-row-5")
					.keys(CONTROL_KEY)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.execute(getSelection)
					.then(function (gridSelection) {
						assert.deepEqual(gridSelection, {},
							"Clicking should not affect row selection state");
					})
				.execute(function () {
					grid.selectAll();
				})
				.elementByCssSelector("#grid-row-0")
					.click()
					.end()
				.elementByCssSelector("#grid-row-1")
					.keys(specialKeys.Shift)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.elementByCssSelector("#grid-row-2")
					.keys(CONTROL_KEY)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.elementByCssSelector("#grid-row-3")
					.click()
					.end()
				.elementByCssSelector("#grid-row-4")
					.keys(specialKeys.Shift)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.elementByCssSelector("#grid-row-5")
					.keys(CONTROL_KEY)
					.click()
					.keys(specialKeys.NULL)
					.end()
				.execute(getSelection)
					.then(expect({
						0: true,
						1: true,
						2: true,
						3: true,
						4: true,
						5: true
					}, "Clicking should not affect row selection state"));

			return remote.end();
		});

		// Test goal:
		// Verify single-row selection with dgrid/Keyboard
		test.test("selectionMode: single; Keyboard", function () {
			var remote = this.get("remote");

			remote.execute(function () {
					grid.set("selectionMode", "single");
					grid.focus(query("#grid-row-0 .field-id")[0]);
					return grid.selection;
				})
					.then(expect({ 0: true }, "Initial grid selection should be row 0"))
					.keys(specialKeys["Right arrow"])
				.execute(getSelection)
					.then(expect({ 0: true }, "Right arrow should not change row selection"))
					.keys(specialKeys["Down arrow"])
				.execute(getSelection)
					.then(expect({ 1: true }, "Down arrow should change row selection"))
					.keys(specialKeys["Left arrow"])
				.execute(getSelection)
					.then(expect({ 1: true }, "Left arrow should not change row selection"))
					.keys(specialKeys.Shift + specialKeys["Down arrow"] + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({ 2: true }, "Shift+down should change row selection"))
					.keys(CONTROL_KEY + specialKeys["Down arrow"] + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({ 2: true }, "Control+down should not change row selection"))
					.keys(specialKeys.Space)
				.execute(getSelection)
					.then(expect({ 3: true }, "Space should change row selection"));

			return remote.end();
		});

		// Test goal:
		// Verify extended row selection with dgrid/Keyboard
		test.test("selectionMode: extended; Keyboard", function () {
			var remote = this.get("remote");

			if (!isShiftClickSupported) {
				return;
			}

			remote.execute(function () {
					grid.set("selectionMode", "extended");
					grid.focus(query("#grid-row-0 .field-id")[0]);
					return grid.selection;
				})
					.then(expect({ 0: true }, "Initial grid selection should be row 0"))
					.keys(specialKeys.Shift + specialKeys["Down arrow"] + specialKeys["Down arrow"] + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({ 0: true, 1: true, 2: true }, "Shift+down should expand selection"))
					.keys(CONTROL_KEY + specialKeys["Down arrow"] + specialKeys.NULL)
					.keys(CONTROL_KEY + specialKeys["Down arrow"] + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({ 0: true, 1: true, 2: true }, "Control+down should not affect selection"))
					.keys(CONTROL_KEY + specialKeys.Space + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({ 0: true, 1: true, 2: true, 4: true }, "Control+space should toggle selection (on)"))
					.keys(CONTROL_KEY + specialKeys.Space + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({ 0: true, 1: true, 2: true }, "Control+space should toggle selection (off)"));

			return remote.end();
		});

		// Test goal:
		// Verify keyboard navigation has no effect with selectionMode:none
		test.test("selectionMode: none; Keyboard", function () {
			var remote = this.get("remote");
			remote.execute(function () {
					grid.set("selectionMode", "none");
					grid.focus(query("#grid-row-0 .field-id")[0]);
					return grid.selection;
				})
					.then(expect({}, "Initial selection should be empty"))
					.keys(specialKeys["Down arrow"])
				.execute(getSelection)
					.then(expect({}, "Keyboard navigation should not affect selection"))
					.keys(specialKeys.Shift + specialKeys["Down arrow"] + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({}, "Keyboard navigation should not affect selection"))
					.keys(CONTROL_KEY + specialKeys["Down arrow"] + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({}, "Keyboard navigation should not affect selection"))
					.keys(specialKeys["Right arrow"])
					.keys(specialKeys["Right arrow"])
					.keys(specialKeys["Right arrow"])
				.execute(getSelection)
					.then(expect({}, "Keyboard navigation should not affect selection"))
					.keys(specialKeys["Up arrow"])
				.execute(getSelection)
					.then(expect({}, "Keyboard navigation should not affect selection"))
					.keys(specialKeys["Left arrow"])
					.keys(specialKeys["Left arrow"])
					.keys(specialKeys["Left arrow"])
				.execute(getSelection)
					.then(expect({}, "Keyboard navigation should not affect selection"));

			return remote.end();
		});

		// Test goal:
		// Verify single-cell selection with dgrid/Keyboard and dgrid/CellSelection
		test.test("selectionMode: single; Keyboard+CellSelection", function () {
			var remote = this.get("remote");

			remote.execute(function () {
					grid.destroy();
					grid = new CellSelectionGrid({
						id: "grid",
						cellNavigation: true,
						selectionMode: "single",
						columns: columns
					});
					document.body.appendChild(grid.domNode);
					grid.renderArray(data);
					grid.focus(query("#grid-row-0 .field-id")[0]);
					return grid.selection;
				})
					.then(expect({ 0: { id: true } }, "Initial grid selection should be row 0, column 'id'"))
					.keys(specialKeys["Right arrow"])
				.execute(getSelection)
					.then(expect({ 0: { info: true } }, "Right arrow should change selection"))
					.keys(specialKeys["Down arrow"])
				.execute(getSelection)
					.then(expect({ 1: { info: true } }, "Down arrow should change selection"))
					.keys(specialKeys["Left arrow"])
				.execute(getSelection)
					.then(expect({ 1: { id: true } }, "Left arrow should change selection"))
					.keys(specialKeys["Up arrow"])
				.execute(getSelection)
					.then(expect({ 0: { id: true } }, "Up arrow should change selection"))
					.keys(CONTROL_KEY + specialKeys["Down arrow"] + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({ 0: { id: true } }, "Control+down should not affect selection"))
					.keys(specialKeys.Shift + specialKeys["Down arrow"] + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({ 2: { id: true } }, "Shift+down should change selection"))
					.keys(CONTROL_KEY + specialKeys["Right arrow"] + specialKeys.NULL)
					.keys(CONTROL_KEY + specialKeys.Space + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({ 2: { info: true } }, "Control+space should change selection"))
					.keys(CONTROL_KEY + specialKeys.Space + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({}, "Control+space should change selection"));

			return remote.end();
		});

		// Test goal:
		// Verify extended cell selection with dgrid/Keyboard and dgrid/CellSelection
		test.test("selectionMode: extended; Keyboard+CellSelection", function () {
			var remote = this.get("remote");

			remote.execute(function () {
					grid.destroy();
					grid = new CellSelectionGrid({
						id: "grid",
						cellNavigation: true,
						selectionMode: "extended",
						columns: columns
					});
					document.body.appendChild(grid.domNode);
					grid.renderArray(data);
					grid.focus(query("#grid-row-0 .field-id")[0]);
					return grid.selection;
				})
					.then(expect({ 0: { id: true } }, "Initial grid selection should be row 0, columnd 'id'"))
					.keys(specialKeys["Right arrow"])
				.execute(getSelection)
					.then(expect({ 0: { info: true } }, "Right arrow should change selection"))
					.keys(specialKeys["Down arrow"])
				.execute(getSelection)
					.then(expect({ 1: { info: true } }, "Down arrow should change selection"))
					.keys(specialKeys["Left arrow"])
				.execute(getSelection)
					.then(expect({ 1: { id: true } }, "Left arrow should change selection"))
					.keys(specialKeys["Up arrow"])
				.execute(getSelection)
					.then(expect({ 0: { id: true } }, "Up arrow should change selection"))
					.keys(CONTROL_KEY + specialKeys["Down arrow"] + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({ 0: { id: true } }, "Control+down should not affect selection"))
					.keys(specialKeys.Shift + specialKeys["Down arrow"] + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({
						0: { id: true },
						1: { id: true },
						2: { id: true }
					}, "Shift+down should expand selection"))
					.keys(specialKeys.Shift + specialKeys["Right arrow"] + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({
						0: { id: true, info: true },
						1: { id: true, info: true },
						2: { id: true, info: true }
					}, "Shift+right should expand selection"))
					.keys(CONTROL_KEY + specialKeys.Space + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({
						0: { id: true, info: true },
						1: { id: true, info: true },
						2: { id: true, info: false }
					}, "Control+space should toggle selection"))
					.keys(CONTROL_KEY + specialKeys.Space + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({
						0: { id: true, info: true },
						1: { id: true, info: true },
						2: { id: true, info: true }
					}, "Control+space should toggle selection"));

			return remote.end();
		});

		// Test goal:
		// Verify keyboard navigation has no effect with selectionMode:none
		test.test("selectionMode: none; Keyboard", function () {
			var remote = this.get("remote");
			remote.execute(function () {
					grid.destroy();
					grid = new CellSelectionGrid({
						id: "grid",
						cellNavigation: true,
						selectionMode: "none",
						columns: columns
					});
					document.body.appendChild(grid.domNode);
					grid.renderArray(data);
					grid.focus(query("#grid-row-0 .field-id")[0]);
					return grid.selection;
				})
					.then(expect({}, "Initial selection should be empty"))
					.keys(specialKeys["Down arrow"])
				.execute(getSelection)
					.then(expect({}, "Keyboard navigation should not affect selection"))
					.keys(specialKeys.Shift + specialKeys["Down arrow"] + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({}, "Keyboard navigation should not affect selection"))
					.keys(CONTROL_KEY + specialKeys["Down arrow"] + specialKeys.NULL)
				.execute(getSelection)
					.then(expect({}, "Keyboard navigation should not affect selection"))
					.keys(specialKeys["Right arrow"])
					.keys(specialKeys["Right arrow"])
					.keys(specialKeys["Right arrow"])
				.execute(getSelection)
					.then(expect({}, "Keyboard navigation should not affect selection"))
					.keys(specialKeys["Up arrow"])
				.execute(getSelection)
					.then(expect({}, "Keyboard navigation should not affect selection"))
					.keys(specialKeys["Left arrow"])
					.keys(specialKeys["Left arrow"])
					.keys(specialKeys["Left arrow"])
				.execute(getSelection)
					.then(expect({}, "Keyboard navigation should not affect selection"));

			return remote.end();
		});

	});
});
