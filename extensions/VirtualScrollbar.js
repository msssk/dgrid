define([
	'dojo/_base/declare',
	'dojo/dom-construct',
	'dojo/on'
], function(declare, domConstruct, on) {
	return declare(null, {
		buildRendering: function() {
			this.inherited(arguments);

			// TODO: add 1px for IE because the scrollbar wont' display if it has no visible content
			// TODO: if 0, set to 7 (8?) for Safari (scrollbar is hidden by default)
			var scrollbarWidth = this.bodyNode.offsetWidth - this.bodyNode.clientWidth;

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
			this.inherited(arguments);

			this.scrollbarNode.firstChild.style.height = this.contentNode.scrollHeight + 'px';
		}
	});
});
