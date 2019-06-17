# D3SVGFilters

D3 SVG Filters

### Clearing filters
When `.clearFilter()` is called, the filter entry in the defs will be removed,
if it is not in use by any other elements. If a filter is unset without using
`.clearFilter()` the defs entry will never be cleared. 

### Adding filters
To add a filter, simply call `.svgFilter(name, args, ... nameM, argsN)`.
When a filter is added, it will automatically clear away old filters using
`.clearFilter()` internally.

## Example usage
```
    const rect = d3.select('rect');
    
    // Add only inner shadow
    rect.svgFilter('inner-shadow', {color: 'black', dx: -5, dy: -5, blur: 4})
    
    // Add only drop shadow
    rect.svgFilter('drop-shadow', {color: 'black', dx: -5, dy: -5, blur: 4})
    
    // Use multiple filters
    rect.svgFilter(
        'drop-shadow', {color: 'black', dx: 5, dy: 5, blur: 4},
        'drop-shadow', {color: 'black', dx: -5, dy: 5, blur: 4},
        'drop-shadow', {color: 'black', dx: 5, dy: -5, blur: 4},
        'drop-shadow', {color: 'black', dx: -5, dy: -5, blur: 4},
        
        'inner-shadow', {color: 'black', dx: 5, dy: 5, blur: 4},
        'inner-shadow', {color: 'black', dx: -5, dy: 5, blur: 4},
        'inner-shadow', {color: 'black', dx: 5, dy: -5, blur: 4},
        'inner-shadow', {color: 'black', dx: -5, dy: -5, blur: 4}
    );
    
    // Clear filter (important: use this for clearing, not .attr('filter', null)
    rect.clearFilter();
    
    // Get current filter ID of selection
    const filterID = rect.getFilterID();
    
    // Get the defs entry for the element (attached to topmost SVG)
    const defs = rect.svgFilterDefs();
```

### Adding custom filters
```
    const Lib = d3.svgFilterLib;
    
    // Example definition (inner-shadow)
    // use the .addFilter(name, args)
    Lib.addFilter('inner-shadow', {
    generate: function ({ color, dx, dy, blur }) {
        // Called to inject content into the defs entry
        // The defs entry is the <filter> tag
        const key = this.signature;
        const existing = this.defs.select(`#${key}`);

        if (!existing.empty()) return existing;

        this.defs.append('feGaussianBlur')
            .attr('in', 'SourceAlpha')
            .attr('stdDeviation', blur)
            .attr('result', 'blur');

        this.defs.append('feOffset')
            .attr('dy', dy)
            .attr('dx', dx);

        this.defs.append('feComposite')
            .attr('in2', 'SourceAlpha')
            .attr('operator', 'arithmetic')
            .attr('k2', -1)
            .attr('k3', 1)
            .attr('result', 'shadowDiff');

        this.defs.append('feFlood').attr('flood-color', color);

        this.defs.append('feComposite')
            .attr('in2', 'shadowDiff')
            .attr('operator', 'in')

        this.defs.append('feComposite')
            .attr('in2', 'SourceGraphic')
            .attr('operator', 'over')
            .attr('result', 'firstFilter')

        this.defs.append('feComposite')
            .attr('in2', 'shadowDiff')
            .attr('operator', 'in')

        this.defs.append('feComposite')
            .attr('in2', 'firstFilter')
            .attr('operator', 'over')

    },
    // Used to distinguish filters, 
    // should not conflict with other existing filters
    signature: ({ color, dx, dy, blur }) => `ids_${color}_${blur}_${dx}_${dy}`
})

```