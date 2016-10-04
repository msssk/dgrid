define([
	'dojo/_base/declare',
	'dojo/dom-construct',
	'dojo/on'
], function(declare, domConstruct, on) {
	return declare(null, {
		_scrollScaleFactor: 1,
		_scrollContentMaxHeight: 10000,
		_virtualScrollbarMaxHeight: 10000,

		buildRendering: function() {
			this.inherited(arguments);

			// TODO: if 0, set to 7 (8?) for Safari (scrollbar is hidden by default)
			// Add 1 pixel: some browsers (IE, FF) don't make the scrollbar active if it doesn't have visible content
			var scrollbarWidth = this.bodyNode.offsetWidth - this.bodyNode.clientWidth + 1;

			this.scrollbarNode = domConstruct.create('div', {
				className: 'dgrid-virtual-scrollbar'
			}, this.bodyNode, 'before');

			this.scrollbarNode.style.width = scrollbarWidth + 'px';
			domConstruct.create('div', null, this.scrollbarNode);
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

		refresh: function() {
			var self = this;

			return this.inherited(arguments).then(function(results) {
				var contentHeight = self._calculateContentHeight();
				var clampedHeight = Math.min(self._virtualScrollbarMaxHeight, contentHeight);

				if (contentHeight > self._virtualScrollbarMaxHeight) {
					self._scrollScaleFactor = contentHeight / clampedHeight;
				}

				self.scrollbarNode.firstChild.style.height = clampedHeight + 'px';

				return results;
			});
		},

		_calculateContentHeight: function() {
			// grid._total: total number of currently rendered rows
			// preload.count: number of rows the preload is holding space for
			// preload.rowHeight: average height of sibling rows

			var topPreload = this.preload;
			var bottomPreload = topPreload.next;

			return (topPreload.virtualHeight || topPreload.node.offsetHeight) +
				(this._total * topPreload.rowHeight) +
				(bottomPreload.virtualHeight || bottomPreload.node.offsetHeight);
		},

		_calculateScrollTop: function() {
			return this.scrollbarNode.scrollTop * this._scrollScaleFactor;
		},

		getScrollPosition: function() {
			return {
				x: this.bodyNode.scrollLeft,
				y: this._calculateScrollTop()
			};
		},

		_adjustPreloadHeight: function(preload, noMax) {
			var height = this._calculatePreloadHeight(preload, noMax);
			var clampedHeight = Math.min(this._scrollContentMaxHeight - this.bodyNode.scrollHeight + preload.node.offsetHeight, height);

			if (clampedHeight === height) {
				preload.clampedHeight = 0;
				preload.virtualHeight = 0;
			} else {
				preload.clampedHeight = clampedHeight;
				preload.virtualHeight = height;
			}

			if (preload.next) {
				preload.node.style.height = clampedHeight + 'px';
			} else {
				preload.node.style.height = '1000px';
			}
		}
	});
});
