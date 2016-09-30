define([
	'dojo/_base/lang',
	'dojo/when'
], function (lang, when) {
	function ImaginaryStore(size) {
		this._size = size;
	}

	ImaginaryStore.prototype = {
		idProperty: 'id',

		getIdentity: function(item) {
			return item[this.idProperty];
		},

		get: function(id) {
			return when({ id: id });
		},

		fetch: function() {
			console.warn('"fetch" not supported');
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

		sort: function() {
			console.warn('"sort" not supported');
		}
	};

	return ImaginaryStore;
});
