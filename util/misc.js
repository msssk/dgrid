define([
	'dojo/has'
], function (has) {
	// summary:
	//		This module defines miscellaneous utility methods for purposes of
	//		adding styles, and throttling/debouncing function calls.

	has.add('dom-contains', function (global, doc, element) {
		return !!element.contains; // not supported by FF < 9
	});

	// establish an extra stylesheet which addCssRule calls will use,
	// plus an array to track actual indices in stylesheet for removal
	var extraRules = [],
		extraSheet,
		removeMethod,
		rulesProperty,
		invalidCssChars = /([^A-Za-z0-9_\u00A0-\uFFFF-])/g,
		maxElementHeight;

	function removeRule(index) {
		// Function called by the remove method on objects returned by addCssRule.
		var realIndex = extraRules[index],
			i, l;
		if (realIndex === undefined) {
			return; // already removed
		}

		// remove rule indicated in internal array at index
		extraSheet[removeMethod](realIndex);

		// Clear internal array item representing rule that was just deleted.
		// NOTE: we do NOT splice, since the point of this array is specifically
		// to negotiate the splicing that occurs in the stylesheet itself!
		extraRules[index] = undefined;

		// Then update array items as necessary to downshift remaining rule indices.
		// Can start at index + 1, since array is sparse but strictly increasing.
		for (i = index + 1, l = extraRules.length; i < l; i++) {
			if (extraRules[i] > realIndex) {
				extraRules[i]--;
			}
		}
	}

	function computeDecreasedValidHeight(node, heightInfo) {
		var currentTestHeight = heightInfo.currentTestHeight;
		var lastGoodHeight = heightInfo.lastGoodHeight;
		var lastTestHeight;

		// Backtrack by 50% of difference between currentTestHeight and lastGoodHeight
		// each loop until we're below max height

		// This should be:
		// node.offsetHeight !== currentTestHeight
		// but observed behavior (at least in Chrome) is that node.offsetHeight can
		// vary from the pixel value specified in the CSS height property by 1
		while (Math.abs(node.offsetHeight - currentTestHeight) > 1) {
			lastTestHeight = currentTestHeight;
			currentTestHeight -= Math.floor((currentTestHeight - lastGoodHeight) / 2);

			if (lastTestHeight === currentTestHeight) {
				break;
			}

			node.style.height = currentTestHeight + 'px';
		}

		heightInfo.currentTestHeight = currentTestHeight;
		heightInfo.lastBadHeight = lastTestHeight;
		heightInfo.lastGoodHeight = currentTestHeight;
	}

	function computeIncreasedValidHeight(node, heightInfo) {
		var currentTestHeight = heightInfo.currentTestHeight;
		var lastBadHeight = heightInfo.lastBadHeight;
		var lastGoodHeight = heightInfo.lastGoodHeight;
		var lastTestHeight = heightInfo.currentTestHeight;

		// Increase height by 50% of difference between lastBadHeight and currentTestHeight
		// each loop until we find the precise max height

		// This should be:
		// node.offsetHeight === currentTestHeight
		// but observed behavior (at least in Chrome) is that node.offsetHeight can
		// vary from the pixel value specified in the CSS height property by 1
		while (Math.abs(node.offsetHeight - currentTestHeight) < 2) {
			lastGoodHeight = currentTestHeight;
			currentTestHeight += Math.floor((lastBadHeight - currentTestHeight) / 2);

			if (lastTestHeight === currentTestHeight) {
				break;
			}

			lastTestHeight = currentTestHeight;
			node.style.height = currentTestHeight + 'px';
		}

		heightInfo.currentTestHeight = currentTestHeight;
		heightInfo.lastBadHeight = lastTestHeight;
		heightInfo.lastGoodHeight = lastGoodHeight;
	}

	var util = {
		// Throttle/debounce functions

		defaultDelay: 15,
		throttle: function (cb, context, delay) {
			// summary:
			//		Returns a function which calls the given callback at most once per
			//		delay milliseconds.  (Inspired by plugd)
			var ran = false;
			delay = delay || util.defaultDelay;
			return function () {
				if (ran) {
					return;
				}
				ran = true;
				cb.apply(context, arguments);
				setTimeout(function () {
					ran = false;
				}, delay);
			};
		},
		throttleDelayed: function (cb, context, delay) {
			// summary:
			//		Like throttle, except that the callback runs after the delay,
			//		rather than before it.
			var ran = false;
			delay = delay || util.defaultDelay;
			return function () {
				if (ran) {
					return;
				}
				ran = true;
				var a = arguments;
				setTimeout(function () {
					ran = false;
					cb.apply(context, a);
				}, delay);
			};
		},
		debounce: function (cb, context, delay) {
			// summary:
			//		Returns a function which calls the given callback only after a
			//		certain time has passed without successive calls.  (Inspired by plugd)
			var timer;
			delay = delay || util.defaultDelay;
			return function () {
				if (timer) {
					clearTimeout(timer);
					timer = null;
				}
				var a = arguments;
				timer = setTimeout(function () {
					cb.apply(context, a);
				}, delay);
			};
		},

		// Iterative functions

		each: function (arrayOrObject, callback, context) {
			// summary:
			//		Given an array or object, iterates through its keys.
			//		Does not use hasOwnProperty (since even Dojo does not
			//		consistently use it), but will iterate using a for or for-in
			//		loop as appropriate.

			var i, len;

			if (!arrayOrObject) {
				return;
			}

			if (typeof arrayOrObject.length === 'number') {
				for (i = 0, len = arrayOrObject.length; i < len; i++) {
					callback.call(context, arrayOrObject[i], i, arrayOrObject);
				}
			}
			else {
				for (i in arrayOrObject) {
					callback.call(context, arrayOrObject[i], i, arrayOrObject);
				}
			}
		},

		// CSS-related functions

		addCssRule: function (selector, css) {
			// summary:
			//		Dynamically adds a style rule to the document.  Returns an object
			//		with a remove method which can be called to later remove the rule.

			if (!extraSheet) {
				// First time, create an extra stylesheet for adding rules
				extraSheet = document.createElement('style');
				document.getElementsByTagName('head')[0].appendChild(extraSheet);
				// Keep reference to actual StyleSheet object (`styleSheet` for IE < 9)
				extraSheet = extraSheet.sheet || extraSheet.styleSheet;
				// Store name of method used to remove rules (`removeRule` for IE < 9)
				removeMethod = extraSheet.deleteRule ? 'deleteRule' : 'removeRule';
				// Store name of property used to access rules (`rules` for IE < 9)
				rulesProperty = extraSheet.cssRules ? 'cssRules' : 'rules';
			}

			var index = extraRules.length;
			extraRules[index] = (extraSheet.cssRules || extraSheet.rules).length;
			extraSheet.addRule ?
				extraSheet.addRule(selector, css) :
				extraSheet.insertRule(selector + '{' + css + '}', extraRules[index]);

			return {
				get: function (prop) {
					return extraSheet[rulesProperty][extraRules[index]].style[prop];
				},
				set: function (prop, value) {
					if (typeof extraRules[index] !== 'undefined') {
						extraSheet[rulesProperty][extraRules[index]].style[prop] = value;
					}
				},
				remove: function () {
					removeRule(index);
				}
			};
		},

		escapeCssIdentifier: function (id, replace) {
			// summary:
			//		Escapes normally-invalid characters in a CSS identifier (such as . or :);
			//		see http://www.w3.org/TR/CSS2/syndata.html#value-def-identifier
			// id: String
			//		CSS identifier (e.g. tag name, class, or id) to be escaped
			// replace: String?
			//		If specified, indicates that invalid characters should be
			//		replaced by the given string rather than being escaped

			return typeof id === 'string' ? id.replace(invalidCssChars, replace || '\\$1') : id;
		},

		getMaxElementHeight: function() {
			// summary:
			//		Browsers have a maximum height an element can be. If this value is exceeded, the element
			//		will either render with a height of zero (FF) or at the maximum height (Chrome, IE).

			if (maxElementHeight) {
				return maxElementHeight;
			}

			var node = document.createElement('div');
			var heightInfo = {
				currentTestHeight: 10000000,
				lastBadHeight: 0,
				lastGoodHeight: 0
			};

			node.style.border = 'none';
			node.style.boxShadow = 'none';
			node.style.margin = 0;
			node.style.padding = 0;
			node.style.position = 'absolute';
			node.style.left = '-1000px';
			node.style.height = heightInfo.currentTestHeight + 'px';
			node.style.width = '1px';

			document.body.appendChild(node);

			// Double the node's height each loop until we exceed max height
			while (node.offsetHeight === heightInfo.currentTestHeight) {
				heightInfo.lastGoodHeight = heightInfo.currentTestHeight;
				heightInfo.currentTestHeight *= 2;
				node.style.height = heightInfo.currentTestHeight + 'px';
			}

			// Some browsers (Chrome, IE) will return the max height from node.offsetHeight when the CSS
			// height property has been set too high
			if (node.offsetHeight > 0) {
				maxElementHeight = node.offsetHeight;

				return maxElementHeight;
			}

			// For others (Firefox) that return 0 for node.offsetHeight, we can pinpoint the max height
			// by bisecting
			while (heightInfo.currentTestHeight !== heightInfo.lastGoodHeight) {
				computeDecreasedValidHeight(node, heightInfo);
				computeIncreasedValidHeight(node, heightInfo);
			}

			node.style.height = heightInfo.lastGoodHeight + 'px';

			while (node.offsetHeight === 0) {
				heightInfo.lastGoodHeight--;
				node.style.height = heightInfo.lastGoodHeight + 'px';
			}

			maxElementHeight = node.offsetHeight;

			document.body.removeChild(node);

			return maxElementHeight;
		}
	};
	return util;
});
