define([
	'dojo/_base/lang',
	'dojo/when'
], function (lang, when) {
	function noop() {}
	function InfiniteStore(size) {
		this._size = size;
	}

	InfiniteStore.prototype = {
		idProperty: 'id',

		getIdentity: function(item) {
			return item[this.idProperty];
		},

		get: function(id) {
			return when({ id: id });
		},

		fetchRange: function(options) {
			var promise;
			var data = [];
			var i;

			for (i = options.start; i < options.end; i++) {
				data.push({ id: i });
			}

			promise = when(data);
			promise = lang.delegate(promise);
			promise.totalLength = when(this._size);

			return promise;
		},

		sort: noop
	};

	return InfiniteStore;
});
