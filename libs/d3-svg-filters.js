const d3 = (typeof require == "function") ? require('d3') : window.d3;

class SVGFilter {
    constructor(spec) {

    }

    set id(id) { this._id = id; }
    get id() { return this._id; }
}

class SVGFilterManagerLibrary {
    constructor() {
        this._library = {}; // name : { generate: (defs) => (args) => {  appends filter to defs }, signature: (args) => key}
    }

    addFilter(name, fns) {
        this._library[name] = fns;
    }


    signature(filterName, args) {
        return this._library[filterName]
            .signature(args)
            .replace(/\:|\,|\.|\;/g, '_')
            .replace(/ /g, '')
            .replace(/\#/g, 'h')
            .replace(/\(/g, 'l')
            .replace(/\)/g, 'r')
    }

    generate(defs, filterName, args) {
        const signature = this.signature(filterName, args);
        const ctx = { signature, defs };
        const theFilter = this._library[filterName].generate.call(ctx, args);

        defs.node().__filters__.push({ signature, filter: theFilter });
    }
}

const GenSVGFilters = (...filters) => {

}

const Lib = new SVGFilterManagerLibrary();
Lib.addFilter('drop-shadow', {
    generate: function ({ color='black', dx, dy, blur }) {
        const key = this.signature;
        const existing = this.defs.select(`#${key}`);

        if (!existing.empty()) return existing;

        const theDropShadow =
            this.defs
            .append('feDropShadow')
            .attr('id', key)
            .attr('dx', dx)
            .attr('dy', dy)
            .attr('stdDeviation', blur)
            .attr('flood-color', color);

        return theDropShadow;
    },
    signature: ({ color, dx, dy, blur }) => `ds_${color}_${blur}_${dx}_${dy}`,
});

Lib.addFilter('inner-shadow', {
    generate: function ({ color, dx, dy, blur }) {
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
    signature: ({ color, dx, dy, blur }) => `ids_${color}_${blur}_${dx}_${dy}`
})

class SVGFilterManager {
    constructor(defs) {
        this._filters = {
            boxShadow: {},
        }; // Type : filterKey : id

        this._defs = defs;
        this._ids = {};
    }

    hasFilter(signature) {
        return !!this._ids[signature];
        // return !this._defs.select('#' + signature).empty();
    }

    signature(...args) {
        // ['name', arg, 'name2', arg]
        // ['', ]
        return 'F_' + args
            .map((arg, i) => i % 2 === 0 ? '' : Lib.signature(args[i - 1], arg))
            .filter((v) => v !== '')
            .join('_');
    }

    /**
     * Creates a filter from the list of filters in the format
     * (filter-name-1, args1, filter-name-2, args2, ... , filter-name-N, argsN)
     *
     * @param {*} args
     * @memberof SVGFilterManager
     */
    createFilter(...args) {
        // 1. Compute signature and see if it already exists
        const signature = this.signature(...args);

        if (this.hasFilter(signature)) return this.getFilterID(signature);

        const theID = this._ids[signature] = this._genID();
        const filterEntry = this._defs
            .append('filter')
            .attr('id', theID)
            .attr('height', '300%')
            .attr('width', '300%')
            .attr('x', '-100%')
            .attr('y', '-100%')

        filterEntry.node().__filters__ = [];

        const filters = args.forEach((arg, i) => {
            if (i % 2 === 0) return Lib.generate(filterEntry, arg, args[i + 1]);
            // return false;
        });

        return theID;
    }

    _genID() {
        if (!this.__idc__) this.__idc__ = 0;
        return `FILTER_${this.__idc__++}`;
    }

    getFilterID(signature) { return this._ids[signature]; }
}

d3.selection.prototype.svgFilter = function (...filters) { // name, args, name1, args1, ... ,nameN, argsN
    // If no defs entry, generate one at the root and set it @ the svg filter manager
    // create a new svg filter manager for that svg

    // 1. Find topmost SVG
    let svg = d3.select(this.node().farthestViewportElement || this.node().closest('svg'));

    // 2. Ensure the defs entry exists
    let defs = svg.select(':scope>defs.svg-custom-filters');
    if (defs.empty()) {
        defs = svg.append('defs').attr('class', 'svg-custom-filters');
        defs.node()._svgFilterManager = new SVGFilterManager(defs);
    }

    const filterID = defs.node()._svgFilterManager.createFilter(...filters);
    this.attr('filter', `url(#${filterID})`);

    // 3. Generate a filter manager if not existing

    // TheFilterManager._defs;
    // const ids = GenSVGFilters(filters);
}

// d3.svgFilter = (name, args) => lib.filter(name)(args);

// Example usage
const selection = {};

// selection
//     .svgFilter(
//         d3.svgFilterBoxShadow({
//             dx: '5%',
//             dy: '5%',
//             blur: '25%'
//         }),
//         d3.svgFilterBoxShadowInset({
//             dx: '5%',
//             dy: '5%',
//             blur: '25%'
//         })
//     );
