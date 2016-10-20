/*
 * ASSUMPTION: there are only two preload nodes, the top and the bottom
 * ASSUMPTION: all pre-existing scroll logic will relate to content node (grid.bodyNode)
 * 		Only this module will listen to scrolling on grid.scrollbarNode
 * 		All other modules will listen continue to listen to scrolling on grid.bodyNode
 */

/*
 * TODO: It would be good to keep persistent references to the top and bottom preloads
 */

define([
	'dojo/_base/declare',
	'dojo/dom-construct',
	'dojo/on'
], function(declare, domConstruct, on) {
	// TODO: what is the optimal preload height? It should be high enough to prevent the user from quickly scrolling
	// to the beginning or end before the scrollbarNode has had a chance to sync.
	var BOTTOM_PRELOAD_HEIGHT = 5000;
	var TOP_PRELOAD_HEIGHT = 5000;
	// TODO: what is the optimal height? It should be high enough for good fidelity; small enough for performance.
	var SCROLLBAR_MAX_HEIGHT = 50000;

	// for debugging
	function assert(condition) {
		if (!condition) {
			console.warn.apply(console, Array.prototype.slice.call(arguments, 1));
		}
	}

	return declare(null, {
		// This is the value of the total virtual height of the content (grid.contentNode)
		// divided by the height of the scrollbar node.
		// It should always be greater than or equal to 1, as the scrollbar height will be clamped at
		// a maximum height, but will shrink to below that to match the contentNode.
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
			this.scrollNode = this.scrollbarNode;

			if (this.debug) {
				// make both scrollbars visible
				this.bodyNode.style.width = (this.bodyNode.offsetWidth - scrollbarWidth) + 'px';
			}
		},

		postCreate: function() {
			// TODO: should this be enforced?
			if (this.pagingMethod === 'debounce' && this.pagingDelay < 100) {
				this.pagingDelay = 100;
			}

			this.inherited(arguments);

			var self = this;
			var bodyNode = this.bodyNode;
			var scrollbarNode = this.scrollbarNode;
			var bodyNodeLastScrollTop = 0;
			var bodyNodeScrollPauseCounter = 0;
			var bodyNodeScrollResetHandle;
			var scrollbarScrollPauseCounter = 0;
			var scrollbarScrollResetHandle;

			// Sometimes the pause counter gets to a high value, which seemingly should not happen.
			// Reset it if there is no scroll activity for a bit.
			// TODO: why does the counter get high? For every manipulation of 'scrollTop', the handler
			// *should* be called and decrement the pause counter.
			function resetBodyNodeScrollPause() {
				bodyNodeScrollPauseCounter = 0;
			}

			function resetScrollbarScrollPause() {
				scrollbarScrollPauseCounter = 0;
			}

			// Set grid.bodyNode.scrollTop based on grid.scrollbarNode.scrollTop
			this._updateBodyScrollTop = function() {
				// scrollTop is sometimes not a whole number, so round it
				var newScrollTop = Math.round(scrollbarNode.scrollTop);

				clearTimeout(bodyNodeScrollResetHandle);

				if (newScrollTop) {
					assert(newScrollTop + scrollbarNode.offsetHeight <= scrollbarNode.scrollHeight,
						'scrollbarNode scrollTop + offsetHeight exceeds scrollHeight'
					);
					// If the scrollbarNode is at the bottom (scrollTop + offsetHeight === scrollHeight),
					// don't do any calculation, just set the bodyNode to its bottom as well.
					if (newScrollTop + scrollbarNode.offsetHeight === scrollbarNode.scrollHeight) {
						newScrollTop = bodyNode.scrollHeight - bodyNode.offsetHeight;

						if (bodyNode.scrollTop !== newScrollTop) {
							bodyNodeScrollPauseCounter++;
							bodyNode.scrollTop = newScrollTop;
							bodyNodeScrollResetHandle = setTimeout(resetBodyNodeScrollPause, 200);
						}

						return;
					}
					else {
						newScrollTop = Math.round(newScrollTop * self._scrollScaleFactor);
					}
				}

				if (bodyNode.scrollTop !== newScrollTop) {
					bodyNodeScrollPauseCounter++;
					self.scrollTo({ y: newScrollTop });
					bodyNodeScrollResetHandle = setTimeout(resetBodyNodeScrollPause, 200);
				}
			};

			on(bodyNode, 'scroll', function() {
				if (bodyNodeScrollPauseCounter) {
					bodyNodeScrollPauseCounter--;
					return;
				}

				// scrollTop is sometimes not a whole number, so round it
				var newScrollTop = Math.round(bodyNode.scrollTop);
				var topPreload = self._getHeadPreload();
				var bottomPreload;
				var doProcessScroll = false;

				clearTimeout(scrollbarScrollResetHandle);

				// Scroll direction is down
				if (newScrollTop > bodyNodeLastScrollTop) {
					bottomPreload = topPreload.next;

					if (newScrollTop + (2 * bodyNode.offsetHeight) > bottomPreload.node.offsetTop) {
						doProcessScroll = true;
					}
				}
				// Scroll direction is up
				else {
					/* jshint maxlen:122 */
					if (newScrollTop < topPreload.node.offsetTop + topPreload.node.offsetHeight + bodyNode.offsetHeight) {
						doProcessScroll = true;
					}
				}

				bodyNodeLastScrollTop = newScrollTop;

				// Besides wasting time, unnecessary calculations can introduce rounding errors.
				// If the bodyNode is at the top (scrollTop === 0), don't do any calculation, just
				// set the scrollbar node to the top as well.
				if (newScrollTop) {
					assert(newScrollTop + bodyNode.offsetHeight <= bodyNode.scrollHeight,
						'bodyNode scrollTop + offsetHeight exceeds scrollHeight',
						newScrollTop, bodyNode.offsetHeight, bodyNode.scrollHeight
					);
					// If the bodyNode is at the bottom (scrollTop + offsetHeight === scrollHeight),
					// don't do any calculation, just set the scrollbar node to its bottom as well.
					if (newScrollTop + bodyNode.offsetHeight === bodyNode.scrollHeight) {
						bottomPreload = bottomPreload || topPreload.next;

						// If the bottomPreload has no extra height, then we've really scrolled to the bottom
						if (bottomPreload.extraHeight === 0) {
							newScrollTop = scrollbarNode.scrollHeight - scrollbarNode.offsetHeight;
						}
						else {
							newScrollTop = Math.round(self._getScrollTop() / self._scrollScaleFactor);
						}
					}
					else {
						newScrollTop = Math.round(self._getScrollTop() / self._scrollScaleFactor);
					}
				}

				// Because of the scaling factor, a small scroll in the content may not cause the
				// scrollbarNode scroll handle to move.
				if (scrollbarNode.scrollTop !== newScrollTop) {
					scrollbarScrollPauseCounter++;
					scrollbarNode.scrollTop = newScrollTop;
					scrollbarScrollResetHandle = setTimeout(resetScrollbarScrollPause, 200);
				}
				// If the scrollbarNode's scroll handle did not move, but the scrolling within the body requires
				// loading new rows, trigger grid._processScroll
				else if (doProcessScroll) {
					console.log('bodyNode.scroll -> _processScroll');
					// Provide a parameter to _processScroll so that _processScroll knows it has not been called
					// recursively
					self._processScroll({ target: bodyNode });
				}
			});

			on(scrollbarNode, 'scroll', function() {
				if (scrollbarScrollPauseCounter) {
					scrollbarScrollPauseCounter--;
					return;
				}

				self._updateBodyScrollTop();
			});
		},

		getScrollPosition: function() {
			return {
				x: this.scrollNode.scrollLeft,
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

		// Rendering rows can change the dimensions of grid.bodyNode, altering the scroll position,
		// so re-sync its scroll position with grid.scrollbarNode
		renderArray: function() {
			var rows = this.inherited(arguments);

			this._updateBodyScrollTop();

			return rows;
		},

		// This method should always receive a y-value appropriate for the grid's full (virtual) height.
		scrollTo: function(options) {
			var topPreload;
			var newScrollTop;

			if (options.x !== undefined) {
				this.bodyNode.scrollLeft = options.x;
			}

			if (options.y !== undefined) {
				newScrollTop = options.y;
				topPreload = this._getHeadPreload();

				if (topPreload) {
					if (topPreload.extraHeight !== undefined) {
						newScrollTop -= topPreload.extraHeight;
					}
				}

				this.bodyNode.scrollTop = newScrollTop;
			}
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
		},

		_adjustPreloadHeight: function(preload, noMax) {
			var height = Math.round(this._calculatePreloadHeight(preload, noMax));
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

		/*
		 There is a problem with using the offsetHeight property of nodes to calculate height: it is not reliable.
		 At least in Chrome on a scaled display, the real height (as displayed in the UI when the element is
		 hovered in the dev tools) is not an integer. The value of offsetHeight is a rounded integer.
		 In order to get the actual average height, a better approach is to check the total height of all rows
		 and divide by the row count.
		 */
		_calcAverageRowHeight: function(rowElements) {
			if (!rowElements || !rowElements.length) {
				return 0;
			}

			var topNode = rowElements[0];
			// There should be a preload node below the last row
			var bottomNode = rowElements[rowElements.length - 1].nextSibling;
			var totalHeight = bottomNode.offsetTop - topNode.offsetTop;

			return totalHeight / rowElements.length;
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
			var topPreload = this._getHeadPreload();
			var bottomPreload = topPreload.next;
			var contentHeight = this.bodyNode.scrollHeight;

			if (topPreload) {
				contentHeight += topPreload.extraHeight || 0;

				if (bottomPreload) {
					contentHeight += bottomPreload.extraHeight || 0;
				}
			}

			return contentHeight;
		},

		_getPreloadHeight: function(preload) {
			return preload.virtualHeight || preload.node.offsetHeight;
		},

		/*
		 * Calculate top scroll position of grid.bodyNode within its total virtual height.
		 */
		_getScrollTop: function() {
			var scrollTop;
			var topPreload;
			var bottomPreload;

			// If the scrollbarNode scroller is at the bottom, the scrollTop can be more precisely calculated
			if (this.scrollbarNode.scrollTop &&
				this.scrollbarNode.scrollTop + this.scrollbarNode.offsetHeight === this.scrollbarNode.scrollHeight) {
				scrollTop = this._getContentHeight() - this.bodyNode.offsetHeight;
			}
			else {
				topPreload = this._getHeadPreload();
				bottomPreload = topPreload.next;

				// If the bottom preload has been scrolled into sight, we can't accurately calculate the scrollTop
				// simply by adding topPreload.extraHeight - we have to fall back to scaling from the scrollbarNode
				if (bottomPreload.node.offsetTop < this.bodyNode.scrollTop + this.bodyNode.offsetHeight) {
					scrollTop = this.scrollbarNode.scrollTop * this._scrollScaleFactor;
				}
				else {
					scrollTop = Math.round(this.bodyNode.scrollTop);

					if (topPreload.extraHeight) {
						scrollTop += topPreload.extraHeight;
					}
				}
			}

			// TODO: round? floor? ceil?
			return scrollTop;
		}
	});
});
