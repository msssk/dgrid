/*
 * ASSUMPTION: there are only two preload nodes, the top and the bottom
 * ASSUMPTION: all pre-existing scroll logic will relate to content node (grid.bodyNode)
 * 		Only this module will listen to scrolling on grid.scrollbarNode
 * 		All other modules will listen continue to listen to scrolling on grid.bodyNode
 */

define([
	'dojo/_base/declare',
	'dojo/dom-construct',
	'dojo/on',
	'../util/misc'
], function(declare, domConstruct, on, miscUtil) {
	function isPreloadNode(node) {
		return node && node.className.indexOf('dgrid-preload') >= 0;
	}

	// TODO: what is the optimal preload height? It should be high enough to prevent the user from quickly scrolling
	// to the beginning or end before the scrollbarNode has had a chance to sync.
	var BOTTOM_PRELOAD_HEIGHT = 4;
	var TOP_PRELOAD_HEIGHT = 4;
	// TODO: what is the optimal height? It should be high enough for good fidelity; small enough for performance.
	// It needs to be high enough that the scroll handle has shrunk to minimum size.
	var SCROLLBAR_MAX_HEIGHT = 20000;

	// for debugging
	function assert(condition) {
		if (!condition) {
			console.warn.apply(console, Array.prototype.slice.call(arguments, 1));
		}
	}

	return declare(null, {
		// The last node to emit a scroll event - should be either bodyNode or scrollbarNode
		_lastScrolledNode: null,

		// This is the value of the total virtual height of the content (grid.contentNode)
		// divided by the height of the scrollbar node.
		// It should always be greater than or equal to 1, as the scrollbar height will be clamped at
		// a maximum height, but will shrink to below that to match the contentNode.
		_scrollScaleFactor: 1,

		buildRendering: function buildRendering() {
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

		postCreate: function postCreate() {
			this.inherited(arguments);

			var self = this;
			var bodyNode = this.bodyNode;
			var scrollbarNode = this.scrollbarNode;
			var isBodyScrollDisabled = false;
			var isScrollbarScrollDisabled = false;

			/*
			 * Some reliable way of disabling one scroll handler when the other is active is needed.
			 * One might think it is a simple matter of setting a flag in one handler, to be checked and toggled by
			 * the other handler. In practice, the opposing handler sometimes runs multiple times, with the first run
			 * clearing the flag and subsequent runs that should be disabled running as normal.
			 * So how about a counter? Increment a counter each time, and have the opposing handler decrement it. Once
			 * again, insanity is the norm - sometimes the opposing handler is never run, so the flag gets incremented
			 * multiple times (without getting the expecting decrements). Then later when the handler *should* run
			 * it is disabled from stale increments to the flag that disables it.
			 * Setting a flag and running a debounced re-enable function seems reasonably accurate, but what if
			 * the handler takes more than the debounced delay? Either handler might trigger _processScroll, which
			 * might trigger a data fetch, which could take a long time.
			 */
			var enableBodyScrollHandler = miscUtil.debounce(function enableBodyScrollHandler() {
				isBodyScrollDisabled = false;
			}, window, 150);

			var enableScrollbarScrollHandler = miscUtil.debounce(function enableScrollbarScrollHandler() {
				isScrollbarScrollDisabled = false;
			}, window, 150);

			this.ignoreBodyScroll = function ignoreBodyScroll(duration) {
				if (duration === undefined) {
					duration = 50;
				}

				isBodyScrollDisabled = true;

				setTimeout(function() {
					isBodyScrollDisabled = false;
				}, duration);
			};

			on(bodyNode, 'scroll', function handleBodyScroll() {
				if (isBodyScrollDisabled) {
					console.warn(self.formatLog('skip body scroll'));
					return;
				}
				console.group(self.formatLog('handleBodyScroll'));

				// scrollTop is sometimes not a whole number, so round it
				var newScrollTop = Math.round(bodyNode.scrollTop);
				var topPreload = self.topPreload;
				var bottomPreload;

				self._lastScrolledNode = bodyNode;


				(function() {
					var topNode = document.elementFromPoint(928, 94);
					var topRow = self.row(topNode);
					var rows = self.bodyNode.querySelectorAll('.dgrid-row');
					var info = [];
					//console.log(self.formatLog('bodyNode scroll; top visible: ' + (topRow && topRow.id) || velem.id));
					info[self.formatLog('body scroll')] = {
						'top row': (topRow && topRow.id) || topNode.id,
						scrollTop: bodyNode.scrollTop,
						scrollHeight: self.bodyNode.scrollHeight,
						rows: rows[0].rowIndex + ' - ' + rows[rows.length - 1].rowIndex,
						rowsHeight: rows[rows.length - 1].offsetTop - rows[0].offsetTop + rows[rows.length - 1].offsetHeight,
						topPreloadHeight: self.topPreload.virtualHeight
					};
					console.table(info);
				})();


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

						// If the bottomPreload has no extra height, then the scroll position is at the very bottom
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
					isScrollbarScrollDisabled = true;
					console.log(self.formatLog('body scroll set scrollbar'));
					scrollbarNode.scrollTop = newScrollTop;
					enableScrollbarScrollHandler();
				}

				// Sometimes setting node.scrollTop causes the node to emit a scroll event, sometimes not!
				// Since we don't know, always ensure the grid's scroll handler is called (it's debounced, so we
				// don't need to worry about running it too much)
				self._scrollHandler({
					target: bodyNode
				});
				console.groupEnd();
			});

			on(scrollbarNode, 'scroll', function handleScrollbarScroll() {
				if (isScrollbarScrollDisabled) {
					console.warn(self.formatLog('skip scrollbar scroll'));
					return;
				}

				self._lastScrolledNode = scrollbarNode;

				// scrollTop is sometimes not a whole number, so round it
				var newScrollTop = Math.round(scrollbarNode.scrollTop);

				if (newScrollTop) {
					assert(newScrollTop + scrollbarNode.offsetHeight <= scrollbarNode.scrollHeight,
						'scrollbarNode scrollTop + offsetHeight exceeds scrollHeight'
					);
					// If the scrollbarNode is at the bottom (scrollTop + offsetHeight === scrollHeight),
					// don't do any calculation, just set the bodyNode to its bottom as well.
					if (newScrollTop + scrollbarNode.offsetHeight === scrollbarNode.scrollHeight) {
						newScrollTop = bodyNode.scrollHeight - bodyNode.offsetHeight;

						if (bodyNode.scrollTop !== newScrollTop) {
							isBodyScrollDisabled = true;
							console.log(self.formatLog('scrollbar scroll set body'));
							bodyNode.scrollTop = newScrollTop;
							enableBodyScrollHandler();
						}

						return;
					}
					else {
						newScrollTop = Math.round(newScrollTop * self._scrollScaleFactor);
					}
				}

				if (self._getScrollTopFromBody() !== newScrollTop) {
					isBodyScrollDisabled = true;
					console.log(self.formatLog('scrollbar scroll set body'));
					self.scrollTo({ y: newScrollTop });
					enableBodyScrollHandler();
				}
			});
		},

		getScrollPosition: function getScrollPosition() {
			return {
				x: this.scrollNode.scrollLeft,
				y: this._getScrollTop()
			};
		},

		refresh: function refresh() {
			var self = this;

			return this.inherited(arguments).then(function updateScrollbarHeight(results) {
				var contentHeight = self._getContentHeight();
				var clampedHeight = Math.min(SCROLLBAR_MAX_HEIGHT, contentHeight);

				self.scrollbarNode.firstChild.style.height = clampedHeight + 'px';
				self._updateScrollScaleFactor(contentHeight);

				return results;
			});
		},

		zrenderArray: function renderArray() {
			var rows = this.inherited(arguments);
			var bottomNode;
			var rowsHeight;

			// If rows have been rendered, and content is scrolled below the top, the insertion of rows
			// will shift the visible rows down. Adjust the scroll position so that the previously visible
			// rows remain visible.
			if (rows.length && this.bodyNode.scrollTop) {
				if (isPreloadNode(rows[0].previousElementSibling)) {
					// NOTE: assumes presence of preload node after rows
					bottomNode = rows[rows.length - 1].nextElementSibling;
					rowsHeight = bottomNode.offsetTop - rows[0].offsetTop;
					this.ignoreBodyScroll(10);
					this.bodyNode.scrollTop = this.bodyNode.scrollTop + rowsHeight;
				}
			}

			return rows;
		},

		/**
		 * Scroll to the specified offset(s).
		 * @param [options.x] {number} The x-offset to scroll to
		 * @param [options.y] {number} The y-offset to scroll to
		 * The y-value should be appropriate for the grid's full (virtual) height.
		 */
		scrollTo: function scrollTo(options) {
			console.warn(this.formatLog('scrollTo[' + scrollTo.caller.nom + ']: ' + options.x + ', ' + options.y));
			var topPreload;
			var newScrollTop;

			if (options.x !== undefined) {
				this.bodyNode.scrollLeft = options.x;
			}

			if (options.y !== undefined) {
				newScrollTop = options.y;
				topPreload = this.topPreload;

				if (topPreload) {
					if (topPreload.extraHeight !== undefined) {
						newScrollTop -= topPreload.extraHeight;
					}
				}

				this.bodyNode.scrollTop = newScrollTop;
			}
		},

		_updateScrollScaleFactor: function _updateScrollScaleFactor(contentHeight) {
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

		_adjustPreloadHeight: function _adjustPreloadHeight(preload, noMax) {
//			console.group('_adjustPreloadHeight');
			// console.table([{
			// 	topPreloadHeight: preload.next ? preload.node.offsetHeight : preload.previous.node.offsetHeight,
			// 	bottomPreloadHeight: preload.previous ? preload.node.offsetHeight : preload.next.node.offsetHeight,
			// 	rowCount: this.bodyNode.querySelectorAll('.dgrid-row').length,
			// 	rowHeight: Array.prototype.reduce.call(this.bodyNode.querySelectorAll('.dgrid-row'), function(a, b) {
			// 		return a + b.offsetHeight;
			// 	}, 0),
			// 	totalHeight: this.bodyNode.scrollHeight,
			// 	virtualHeight: this._getContentHeight()
			// }]);
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
//			console.groupEnd();
		},

		/*
		 There is a problem with using the offsetHeight property of nodes to calculate height: it is not reliable.
		 At least in Chrome on a scaled display, the real height (as displayed in the UI when the element is
		 hovered in the dev tools) is not an integer. The value of offsetHeight is a rounded integer.
		 In order to get the actual average height, a better approach is to check the total height of all rows
		 and divide by the row count.
		 */
		_calcAverageRowHeight: function _calcAverageRowHeight(rowElements) {
			if (!rowElements || !rowElements.length) {
				return 0;
			}

			var topNode = rowElements[0];
			// There should be a preload node below the last row
			var bottomNode = rowElements[rowElements.length - 1].nextSibling;
			var totalHeight = bottomNode.offsetTop - topNode.offsetTop;

			return totalHeight / rowElements.length;
		},

		_getContentChildOffsetTop: function _getContentChildOffsetTop(node) {
			var offset = node.offsetTop;
			var topPreload;

			// If offset is zero, then it's the top node and we don't need to add the preload height
			if (offset) {
				topPreload = this.topPreload;
				assert(topPreload.extraHeight !== undefined, 'Top preload extraHeight is undefined');
				offset += topPreload.extraHeight;
			}

			return offset;
		},

		/**
		 * Calculate the total virtual height of grid.bodyNode.
		 */
		_getContentHeight: function _getContentHeight() {
			var topPreload = this.topPreload;
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

		_getPreloadHeight: function _getPreloadHeight(preload) {
			return preload.virtualHeight || preload.node.offsetHeight;
		},

		/*
		 * Calculate top scroll position of grid.bodyNode within its total virtual height.
		 */
		_getScrollTop: function _getScrollTop() {
			var scrollTop;

			if (this._lastScrolledNode === null || this._lastScrolledNode === this.bodyNode) {
				scrollTop = this._getScrollTopFromBody();
			}
			else {
				scrollTop = this._getScrollTopFromScrollbar();
			}

			// TODO: round? floor? ceil?
			return scrollTop;
		},

		// Calculate the top scroll position within the full virtual height based on the bodyNode's scroll position
		// This should give the most accurate value. Small scroll changes in bodyNode might not result in any change
		// in scrollbarNode.scrollTop.
		// It should be used when the most recent scroll activity was within the bodyNode.
		_getScrollTopFromBody: function _getScrollTopFromBody() {
			var scrollTop;
			var topPreload = this.topPreload;
			var bottomPreload = topPreload.next;

			// If the bottom preload has been scrolled into sight, we can't accurately calculate the scrollTop
			// simply by adding topPreload.extraHeight - we have to fall back to scaling from the scrollbarNode
			if (bottomPreload.node.offsetTop < this.bodyNode.scrollTop + this.bodyNode.offsetHeight) {
				scrollTop = this._getScrollTopFromScrollbar();
			}
			else {
				scrollTop = Math.round(this.bodyNode.scrollTop);

				if (topPreload.extraHeight) {
					scrollTop += topPreload.extraHeight;
				}
			}

			return scrollTop;
		},

		// Calculate the top scroll position within the full virtual height based on the scrollbarNode's scroll position
		// It should be used when the scrollbarNode has been scrolled, but the bodyNode's scroll has not been synced, or
		// the grid content has not been updated (prune/render rows, adjust preload heights)
		_getScrollTopFromScrollbar: function _getScrollTopFromScrollbar() {
			var scrollTop = this.scrollbarNode.scrollTop;

			if (scrollTop) {
				// If the scrollbarNode scroller is at the bottom, calculate the precise scrollTop value that puts
				// the bodyNode at the very bottom
				if (scrollTop + this.scrollbarNode.offsetHeight === this.scrollbarNode.scrollHeight) {
					scrollTop = this._getContentHeight() - this.bodyNode.offsetHeight;
				}
				else {
					scrollTop *= this._scrollScaleFactor;
				}
			}

			return scrollTop;
		},

		// TODO: this is a bit of a hack; probably better to update ODL to keep preload refs
		_insertPreload: function _insertPreload(newTopPreload) {
			this.topPreload = newTopPreload;
			this.bottomPreload = newTopPreload.next;

			this.inherited(arguments);
		},

		_ZrestoreScroll: function _restoreScroll(node, offset, renderedRows) {
			var scrollPosition = this.getScrollPosition();
			var nodeOffsetTop = this._getContentChildOffsetTop(node);
			var extraHeight = 0;
			var firstRow;
			var lastRow;
			var newScrollTop;

			if (renderedRows) {
				firstRow = renderedRows[0];
				lastRow = renderedRows[renderedRows.length - 1].nextSibling;
				extraHeight = lastRow.offsetTop - firstRow.offsetTop;
				extraHeight += lastRow.offsetHeight;
			}

			newScrollTop = nodeOffsetTop + offset;// + extraHeight;
			console.table([{
				scrollPositionY: scrollPosition.y,
				bodyNodeScrollTop: this.bodyNode.scrollTop,
				nodeOffsetTop: nodeOffsetTop,
				'node.offsetTop': node.offsetTop,
				rowsHeight: extraHeight
			}]);
			if (scrollPosition.y !== newScrollTop) {
				this.scrollTo({
					y: newScrollTop
				});
			}
		}
	});
});
