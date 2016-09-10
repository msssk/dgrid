define(function() {
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
	var MAX_SAFE_INTEGER = 9007199254740991;
	var HALF_MAX_SAFE_INTEGER = MAX_SAFE_INTEGER % 2 ? (MAX_SAFE_INTEGER - 1) / 2 : MAX_SAFE_INTEGER / 2;
	var TOLERANCE = 0.0003;

	function withinTolerance(result, expected, tolerance) {
		// Since browsers are terrible, they're not too concerned about consistency between
		// the CSS height value and the value returned by 'node.offsetHeight'.
		// Observed oddities (more may exist):
		//		Chrome: 'offsetHeight' may vary by 1px
		//		Firefox: 'offsetHeight' may vary by ~100px (at high values; 100 is ~0.00028% off)

		if (Math.abs(result - expected) < 2) {
			return true;
		}

		if (Math.abs((expected - result) / expected) <= tolerance) {
			return true;
		}

		return false;
	}

	return {
		setMaxHeight: function(node, options) {
			options = options || {};

			var testHeight = options.startingHeight || 1000000;
			var lastGoodHeight = 0;
			var lastBadHeight = 0;
			var tolerance = options.tolerance || TOLERANCE;
			var maxTries = 8;
			var tries = 0;

			node.style.height = testHeight + 'px';

			// Double the node's height each iteration until we exceed max valid height
			while (withinTolerance(node.clientHeight, testHeight, tolerance)) {
				if (testHeight === MAX_SAFE_INTEGER) {
					// No point messing around beyond MAX_SAFE_INTEGER
					return;
				}

				lastGoodHeight = testHeight;

				// ensure that doubling the current value won't exceed MAX_SAFE_INTEGER
				if (testHeight < HALF_MAX_SAFE_INTEGER) {
					testHeight *= 2;
				} else {
					testHeight = MAX_SAFE_INTEGER;
				}

				node.style.height = testHeight + 'px';
				lastBadHeight = testHeight;
			}

			// Some browsers (Chrome, IE) will return the max height from node.offsetHeight when the CSS
			// height property has been set too high
			if (node.offsetHeight > 0) {
				node.style.height = node.offsetHeight + 'px';

				return;
			}

			// For browsers that return zero for node.offsetHeight, do some testing to find the max valid height

			// We don't need to find the precise max height, just quickly find a close approximation
			while (tries++ < maxTries) {
				if (withinTolerance(node.clientHeight, testHeight, tolerance)) {
					testHeight += Math.floor((lastBadHeight - testHeight) / 2);
				} else {
					testHeight -= Math.floor((testHeight - lastGoodHeight) / 2);
				}

				node.style.height = testHeight + 'px';
			}

			if (!withinTolerance(node.clientHeight, testHeight, tolerance)) {
				node.style.height = lastGoodHeight + 'px';
			}
		}
	};
});
