# util/mouse

The `util/mouse` module has been removed from dgrid 0.4. The module was introduced to compensate for deficiencies
in Dojo's `dojo/mouse` module's handling of event bubbling. The `dojo/mouse` module was improved in Dojo 1.8 so
the same functionality can now be achieved using `dojo/mouse` and `dgrid/util/mouse` is unnecessary.

The `dgrid/util/mouse` module provided the following synthetic events for handling mouse movement in and out of dgrid
rows and cells:

* `enterRow`: fires when the mouse moves into a row within the body of a list
  or grid.
* `leaveRow`: fires when the mouse moves out of a row within the body of a list
  or grid.
* `enterCell`: fires when the mouse moves into a cell within the body of a grid.
* `leaveCell`: fires when the mouse moves out of a cell within the body of a
  grid.
* `enterHeaderCell`: fires when the mouse moves into a cell within the header of
  a grid.
* `leaveHeaderCell`: fires when the mouse moves out of a cell within the header
  of a grid.

Equivalent functionality can be achieved using the `dojo/on` (with `dojo/query` loaded for event delegation) and
`dojo/mouse` modules:

| Event | `dojo/on` extension event |
| - | - |
| `enterRow` | on.selector('.dgrid-content .dgrid-row', mouse.enter) |
| `leaveRow` | on.selector('.dgrid-content .dgrid-row', mouse.leave) |
| `enterCell` | on.selector('.dgrid-content .dgrid-cell', mouse.enter) |
| `leaveCell` | on.selector('.dgrid-content .dgrid-cell', mouse.leave) |
| `enterHeaderCell` | on.selector('.dgrid-header .dgrid-cell', mouse.enter) |
| `leaveHeaderCell` | on.selector('.dgrid-header .dgrid-cell', mouse.leave) |

The `util/mouse` module defines a number of extension events which are useful in
situations which require the mouse moving into and/or out of rows or cells.
These scenarios warrant extension events due to the often-problematic bubbling
nature of the `mouseover` and `mouseout` DOM events.

```js
require([
	'dojo/mouse',
	'dojo/on',
	'dojo/query'
], function (mouse, on) {
    // Assume we have a Grid instance in the variable `grid`...
    grid.on(on.selector('.dgrid-content .dgrid-row', mouse.enter), function (event) {
        var row = grid.row(event);
        // Do something with `row` here in reaction to when the mouse enters
    });
});
```

These extension events can be used as indicated in the example above, further
described in the respective section of the
[`dojo/on` Reference Guide](http://dojotoolkit.org/reference-guide/dojo/on.html#extension-events).
