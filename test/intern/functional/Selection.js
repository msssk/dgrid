define([
	"intern!tdd",
	"intern/chai!assert",
	"./util",
	"dojo/node!wd/lib/special-keys",
	"require"
], function (test, assert, util, specialKeys, require) {
	test.suite("dgrid/Selection functional tests", function () {
		var isShiftClickSupported;

		test.before(function () {
			var remote = this.get("remote");
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

		test.test("selectionMode: single", function () {
			var remote = this.get("remote");

			remote.execute(function () {
					grid.set("selectionMode", "single");
				})
				.elementByCssSelector("#grid-row-0")
				.click();

			return remote.end();
		});
	});
});
