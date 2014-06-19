define([
	"dojo/mouse",
	"dojo/on",
	"dojo/query"
], function (mouse, on) {
	return {
		// Provide enter/leave events for rows, cells, and header cells.
		// (Header row is trivial since there's only one.)
		enterRow: on.selector(".dgrid-content .dgrid-row", mouse.enter),
		enterCell: on.selector(".dgrid-content .dgrid-cell", mouse.enter),
		enterHeaderCell: on.selector(".dgrid-header .dgrid-cell", mouse.enter),
		leaveRow: on.selector(".dgrid-content .dgrid-row", mouse.leave),
		leaveCell: on.selector(".dgrid-content .dgrid-cell", mouse.leave),
		leaveHeaderCell: on.selector(".dgrid-header .dgrid-cell", mouse.leave)
	};
});
