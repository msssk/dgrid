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
	var SCROLLBAR_MAX_HEIGHT = 50000;

	// for debugging
	function assert(condition, message) {
		if (!condition) {
			console.warn(message);
		}
	}

	return declare(null, {
		// This is the value of the total virtual height of the content (this.bodyNode)
		// divided by the height of the scrollbar node.
		// It should always be greater than or equal to 1, as the scrollbar height will be clamped at
		// a maximum height, but will shrink to below that to match the bodyNode.
		// scrollbarNode.scrollTop === bodyNode.scrollTop / _scrollScaleFactor
		// bodyNode.scrollTop === scrollbarNode.scrollTop * _scrollScaleFactor
		_scrollScaleFactor: 1,

		buildRendering: function() {
			this.inherited(arguments);

			// Add 1 pixel: some browsers (IE, FF) don't make the scrollbar active if it doesn't have visible content
			var scrollbarWidth = this.bodyNode.offsetWidth - this.bodyNode.clientWidth + 1;

			// If 0, assume scrollbar is hidden and set to 8 (Safari width is 7 or 8)
			if (!scrollbarWidth) {
				scrollbarWidth = 8;
			}

			this.scrollbarNode = domConstruct.create('div', {
				className: 'dgrid-virtual-scrollbar'
			});

			this.scrollbarNode.style.width = scrollbarWidth + 'px';
			domConstruct.create('div', null, this.scrollbarNode);
			this.bodyNode.parentNode.insertBefore(this.scrollbarNode, this.bodyNode);
		},

		postCreate: function() {
			this.inherited(arguments);

			var self = this;
			var bodyNode = this.bodyNode;
			var scrollbarNode = this.scrollbarNode;
			var bodyNodeScrollPauseCounter = 0;
			var scrollbarScrollPauseCounter = 0;

			on(bodyNode, 'scroll', function(event) {
				if (bodyNodeScrollPauseCounter) {
					console.log('skip body scroll', bodyNodeScrollPauseCounter);
					bodyNodeScrollPauseCounter--;
					return;
				}

				var scrollPosition = self.getScrollPosition();
				var newScrollTop = scrollPosition.y / self._scrollScaleFactor;

				if (scrollbarNode.scrollTop !== newScrollTop) {
					scrollbarScrollPauseCounter++;
					scrollbarNode.scrollTop = newScrollTop;
				}
				else {
					console.log('no change');
				}
			});

			on(scrollbarNode, 'scroll', function(event) {
				if (scrollbarScrollPauseCounter) {
					console.log('skip scrollbar scroll', scrollbarScrollPauseCounter);
					scrollbarScrollPauseCounter--;
					return;
				}

				if (bodyNode.scrollTop !== event.target.scrollTop) {
					bodyNodeScrollPauseCounter++;
					bodyNode.scrollTop = event.target.scrollTop * self._scrollScaleFactor;
				}
				else {
					console.log('sbn no change');
				}
			});
		},

		getScrollPosition: function() {
			return {
				x: this.bodyNode.scrollLeft,
				y: this._getScrollTop()
			};
		},

		refresh: function() {
			var self = this;

			return this.inherited(arguments).then(function(results) {
				var contentHeight = self._getContentHeight();
				var clampedHeight = Math.min(SCROLLBAR_MAX_HEIGHT, contentHeight);

				self.scrollbarNode.firstChild.style.height = clampedHeight + 'px';
				self._updateScrollScaleFactor(contentHeight);

				return results;
			});
		},

		_updateScrollScaleFactor: function(contentHeight) {
			var scrollbarHeight = this.scrollbarNode.scrollHeight;

			if (scrollbarHeight < contentHeight) {
				this._scrollScaleFactor = contentHeight / scrollbarHeight;
			}
			else {
				this._scrollScaleFactor = 1;
			}
			console.group('_updateScrollScaleFactor');
			console.table([{
				contentHeight: contentHeight,
				scrollbarHeight: scrollbarHeight,
				scrollScale: this._scrollScaleFactor
			}]);
			console.groupEnd();
		},

		_adjustPreloadHeight: function(preload, noMax) {
			var height = this._calculatePreloadHeight(preload, noMax);
			var clampedHeight = Math.min(height, preload.next ? TOP_PRELOAD_HEIGHT : BOTTOM_PRELOAD_HEIGHT);

			if (clampedHeight === height) {
				preload.virtualHeight = 0;
			} else {
				preload.virtualHeight = height;
			}
			console.log('set', preload.next ? 'top' : 'bottom', 'preload height', clampedHeight);

			preload.node.style.height = clampedHeight + 'px';
			this._updateScrollScaleFactor(this._getContentHeight());
		},

		/**
		 * Calculate the total virtual height of grid.bodyNode.
		 */
		_getContentHeight: function() {
			// grid._total: total number of currently rendered rows
			// preload.count: number of rows the preload is holding space for
			// preload.rowHeight: average height of sibling rows

			var topPreload = this._getHeadPreload();
			var bottomPreload = topPreload.next;
			var contentHeight = this.bodyNode.scrollHeight;

			if (topPreload) {
				if (topPreload.virtualHeight) {
					contentHeight -= topPreload.node.offsetHeight;
					contentHeight += topPreload.virtualHeight;
				}

				if (bottomPreload && bottomPreload.virtualHeight) {
					contentHeight -= bottomPreload.node.offsetHeight;
					contentHeight += bottomPreload.virtualHeight;
				}
			}

			return contentHeight;
		},

		_getPreloadHeight: function(preload) {
			return preload.virtualHeight || preload.node.offsetHeight;
		},

		/**
		 * Calculate top scroll position of grid.bodyNode within its total virtual height.
		 */
		_getScrollTop: function() {
			var topPreload = this._getHeadPreload();
			var extraHeight = 0;

			if (topPreload.virtualHeight) {
				extraHeight = topPreload.virtualHeight - topPreload.node.offsetHeight;
			}

			return this.bodyNode.scrollTop + extraHeight;
		}
	});
});
