/*
 * ASSUMPTION: there are only two preload nodes, the top and the bottom
 * ASSUMPTION: all pre-existing scroll logic will relate to content node (grid.bodyNode)
 * 		Only this module will listen to scrolling on grid.scrollbarNode
 * 		All other modules will listen continue to listen to scrolling on grid.bodyNode
 */

define([
	'dojo/_base/declare',
	'dojo/dom-construct',
	'dojo/on'
], function(declare, domConstruct, on) {
	var BOTTOM_PRELOAD_HEIGHT = 1000;
	var TOP_PRELOAD_HEIGHT = 5000;
	var SCROLLBAR_MAX_HEIGHT = 10000;

	// for debugging
	function assert(condition, message) {
		if (!condition) {
			console.warn(message);
		}
	}

	return declare(null, {
		// This is the value of the total theoretical/virtual height of the content (this.bodyNode)
		// divided by the height of the scrollbar node.
		// scrollbarNode.scrollTop === bodyNode.scrollTop / _scrollScaleFactor
		// bodyNode.scrollTop === scrollbarNode.scrollTop * _scrollScaleFactor
		_scrollScaleFactor: 1,

		buildRendering: function() {
			this.inherited(arguments);

			// TODO: if 0, set to 7 (8?) for Safari (scrollbar is hidden by default)
			// Add 1 pixel: some browsers (IE, FF) don't make the scrollbar active if it doesn't have visible content
			var scrollbarWidth = this.bodyNode.offsetWidth - this.bodyNode.clientWidth + 1;

			this.scrollbarNode = domConstruct.create('div', {
				className: 'dgrid-virtual-scrollbar'
			});

			this.scrollbarNode.style.width = scrollbarWidth + 'px';
			domConstruct.create('div', null, this.scrollbarNode);
			this.bodyNode.parentNode.insertBefore(this.scrollbarNode, this.bodyNode);
		},

		postCreate: function() {
			this.inherited(arguments);

			var bodyNode = this.bodyNode;
			var scrollbarNode = this.scrollbarNode;
			var bodyNodeScrollPauseCounter = 0;
			var scrollbarScrollPauseCounter = 0;

			on(bodyNode, 'scroll', function(event) {
				if (bodyNodeScrollPauseCounter) {
					bodyNodeScrollPauseCounter--;
					return;
				}

				scrollbarScrollPauseCounter++;
				scrollbarNode.scrollTop = event.target.scrollTop;
			});

			on(scrollbarNode, 'scroll', function(event) {
				if (scrollbarScrollPauseCounter) {
					scrollbarScrollPauseCounter--;
					return;
				}

				bodyNodeScrollPauseCounter++;
				bodyNode.scrollTop = event.target.scrollTop;
			});
		},

		getScrollPosition: function() {
			return {
				x: this.bodyNode.scrollLeft,
				y: this._calculateScrollTop()
			};
		},

		refresh: function() {
			var self = this;

			return this.inherited(arguments).then(function(results) {
				var contentHeight = self._calculateContentHeight();
				var clampedHeight = Math.min(SCROLLBAR_MAX_HEIGHT, contentHeight);

				self.scrollbarNode.firstChild.style.height = clampedHeight + 'px';
				self._scrollScaleFactor = contentHeight / self.scrollbarNode.offsetHeight;

				return results;
			});
		},

		_adjustPreloadHeight: function(preload, noMax) {
			var height = this._calculatePreloadHeight(preload, noMax);
			var clampedHeight = Math.min(height, preload.next ? TOP_PRELOAD_HEIGHT : BOTTOM_PRELOAD_HEIGHT);

			if (clampedHeight === height) {
				preload.clampedHeight = 0;
				preload.virtualHeight = 0;
			} else {
				preload.clampedHeight = clampedHeight;
				preload.virtualHeight = height;
			}

			preload.node.style.height = clampedHeight + 'px';
		},

		_calculateContentHeight: function() {
			// grid._total: total number of currently rendered rows
			// preload.count: number of rows the preload is holding space for
			// preload.rowHeight: average height of sibling rows

			var topPreload = this._getTopPreload();
			var bottomPreload = topPreload.next;
			var contentHeight = 0;

			if (topPreload) {
				contentHeight = (topPreload.virtualHeight || topPreload.node.offsetHeight) +
					(this._total * topPreload.rowHeight);

				if (bottomPreload) {
					contentHeight += (bottomPreload.virtualHeight || bottomPreload.node.offsetHeight);
				}
			}

			return contentHeight;
		},

		_calculateScrollTop: function() {
			var topPreload = this._getTopPreload();
			var extraHeight = 0;

			if (topPreload.virtualHeight) {
				extraHeight = topPreload.virtualHeight - topPreload.node.offsetHeight;
			}

			return this.scrollbarNode.scrollTop + extraHeight;

		},

		_getTopPreload: function() {
			var topPreload = this.preload;

			while (topPreload.previous) {
				topPreload = topPreload.previous;
			}

			return topPreload;
		}
	});
});
