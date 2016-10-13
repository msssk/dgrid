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

			if (this.debug) {
				this.bodyNode.style.width = (this.bodyNode.offsetWidth - scrollbarWidth) + 'px';
			}
		},

		postCreate: function() {
			this.inherited(arguments);

			var self = this;
			var bodyNode = this.bodyNode;
			var scrollbarNode = this.scrollbarNode;
			var bodyNodeScrollPauseCounter = 0;
			var bodyNodeScrollResetHandle;
			var scrollbarScrollPauseCounter = 0;
			var scrollbarScrollResetHandle;

			function bodyNodeScrollPauseReset() {
//				self.log('bodyNodeScrollPauseReset', bodyNodeScrollPauseCounter);
				bodyNodeScrollPauseCounter = 0;
			}

			function scrollbarScrollPauseReset() {
//				self.log('scrollbarScrollPauseReset', scrollbarScrollPauseCounter);
				scrollbarScrollPauseCounter = 0;
			}

			on(bodyNode, 'scroll', function(event) {
				if (bodyNodeScrollPauseCounter) {
//					self.log('skip body scroll', bodyNodeScrollPauseCounter);
					bodyNodeScrollPauseCounter--;
					return;
				}

				var scrollPosition = self.getScrollPosition();
				var newScrollTop = scrollPosition.y / self._scrollScaleFactor;

				clearTimeout(scrollbarScrollResetHandle);

				assert(scrollbarNode.scrollTop !== newScrollTop, 'Scrollbar scroll top did not change');

				scrollbarScrollPauseCounter++;
				scrollbarNode.scrollTop = newScrollTop;
				scrollbarScrollResetHandle = setTimeout(scrollbarScrollPauseReset, 200);
			});

			on(scrollbarNode, 'scroll', function(event) {
				if (scrollbarScrollPauseCounter) {
//					self.log('skip scrollbar scroll', scrollbarScrollPauseCounter);
					scrollbarScrollPauseCounter--;
					return;
				}

				clearTimeout(bodyNodeScrollResetHandle);

				assert(bodyNode.scrollTop !== event.target.scrollTop, 'Content scroll top did not change');

				bodyNodeScrollPauseCounter++;
				bodyNode.scrollTop = event.target.scrollTop * self._scrollScaleFactor;
				bodyNodeScrollResetHandle = setTimeout(bodyNodeScrollPauseReset, 200);
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

			if (contentHeight === undefined) {
				contentHeight = this._getContentHeight();
			}

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
				preload.extraHeight = 0;
				preload.virtualHeight = 0;
			} else {
				preload.extraHeight = height - clampedHeight;
				preload.virtualHeight = height;
			}

			preload.node.style.height = clampedHeight + 'px';
			assert(Math.abs(clampedHeight - preload.node.offsetHeight) < 1,
				'Preload height mismatch ' + clampedHeight + ':' + preload.node.offsetHeight
			);
			this._updateScrollScaleFactor();
		},

		_getContentChildOffsetTop: function(node) {
			var offset = node.offsetTop;
			var topPreload;

			// If offset is zero, then it's the top node and we don't need to add the preload height
			if (offset) {
				topPreload = this._getHeadPreload();
				assert(topPreload.extraHeight !== undefined, 'Top preload extraHeight is undefined');
				offset += topPreload.extraHeight;
			}

			return offset;
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
				contentHeight += topPreload.extraHeight === undefined ? 0 : topPreload.extraHeight;

				if (bottomPreload && bottomPreload.extraHeight !== undefined) {
					contentHeight += bottomPreload.extraHeight;
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

			return this.bodyNode.scrollTop + topPreload.extraHeight;
		}
	});
});
