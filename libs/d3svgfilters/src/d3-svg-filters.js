const d3 = typeof require === 'function' ? require('d3') : window.d3;

class SVGFilter {
  constructor(spec) {}

  set id(id) {
    this._id = id;
  }
  get id() {
    return this._id;
  }
}

class SVGFilterManagerLibrary {
  constructor() {
    this._library = {}; // name : { generate: (defs) => (args) => {  appends filter to defs }, signature: (args) => key}
  }

  static GenerateID() {
    if (!this.__ID) this.__ID = 0;

    return ++this.__ID;
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
      .replace(/\)/g, 'r');
  }

  generate(defs, filterName, args) {
    const signature = this.signature(filterName, args);
    const ctx = { signature, defs };
    const theFilter = this._library[filterName].generate.call(ctx, {
      ...args,
      id: SVGFilterManagerLibrary.GenerateID()
    });

    defs.node().__filters__.push({ signature, filter: theFilter });
  }

  static Suffix() {
    if (!this._suffix) this._suffix = 0;
    return this._suffix++;
  }

  makeUnique(filterText) {
    const varNames = /result=(.+?)/g.test(filterText);
  }
}

const GenSVGFilters = (...filters) => {};

const Lib = new SVGFilterManagerLibrary();
Lib.addFilter('drop-shadow', {
  generate: function({ color, dx, dy, blur }) {
    const key = this.signature;
    const existing = this.defs.select(`#${key}`);

    if (!existing.empty()) return existing;

    const theDropShadow = this.defs.html(
      this.defs.html() +
        `
            <feDropShadow
                id='${key}'
                dx='${dx}'
                dy='${dy}'
                stdDeviation='${blur}'
                flood-color=${color} />
        `
    );

    return theDropShadow;
  },
  signature: ({ color, dx, dy, blur }) => `ds_${color}_${blur}_${dx}_${dy}`
});

Lib.addFilter('blur', {
  generate: function({ blur }) {
    const key = this.signature;
    const existing = this.defs.select(`#${key}`);

    if (!existing.empty()) return existing;

    const theBlur = this.defs
      .append('feGaussianBlur')
      .attr('stdDeviation', blur);

    return theBlur;
  },
  signature: ({ blur }) => `gbl_${blur}`
});

Lib.addFilter('inner-shadow', {
  generate: function({ id, color, dx, dy, blur }) {
    const key = this.signature;
    const existing = this.defs.select(`#${key}`);

    if (!existing.empty()) return existing;

    this.defs.html(
      this.defs.html() +
        `
            <feGaussianBlur
                in='SourceAlpha'
                stdDeviation='${blur}'
                result='blur${id}' />

            <feOffset dx=${dx} dy=${dy} />

            <feComposite
                in2='SourceAlpha'
                operator='arithmetic'
                k2=-1
                k3=1
                result='shadowDiff${id}' />

            <feFlood flood-color=${color} />

            <feComposite
                in2='shadowDiff${id}'
                operator='in' />

            <feComposite
                in2='SourceGraphic'
                operator='over'
                result='firstFilter${id}' />

            <feComposite
                in2='shadowDiff${id}'
                operator='in' />

            <feComposite
                in2='firstFilter${id}'
                operator='over' />
        `
    );
  },
  signature: ({ color, dx, dy, blur }) => `ids_${color}_${blur}_${dx}_${dy}`
});

Lib.addFilter('double-inner-shadow', {
  generate: function({ id, color, dx, dy, blur }) {
    const key = this.signature;
    const existing = this.defs.select(`#${key}`);

    if (!existing.empty()) return existing;

    this.defs.html(
      this.defs.html() +
        `
            <feComponentTransfer in=SourceAlpha result="invert${id}">
                <feFuncA type="table" tableValues="1 0" />
            </feComponentTransfer>
            <feGaussianBlur in="invert${id}" stdDeviation="${blur}" result="blur${id}"/>
            <feOffset in="blur${id}" dx="${dx}" dy="${dy}" result="offsetblur1${id}"/>
            <feOffset in="blur${id}" dy="${-dy}" result="offsetblur2${id}"/>
            <feFlood flood-color="${color}"/> 
            <feComposite in2="offsetblur1${id}" operator="in" result="offsetblur1cut${id}"/>
            <feFlood flood-color="${color}"/> 
            <feComposite in2="offsetblur2${id}" operator="in" result="offsetblur2cut${id}"/>
            <feMerge>
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="offsetblur1${id}" />
                <feMergeNode in="offsetblur2${id}" />
            </feMerge>
            <feComposite in2="SourceAlpha" operator="in" />
        `
    );
  },
  signature: ({ color, dx, dy, blur }) => `dids_${color}_${blur}_${dx}_${dy}`
});

class SVGFilterManager {
  constructor(defs) {
    this._filters = {
      boxShadow: {}
    }; // Type : filterKey : id

    this._defs = defs;
    this._ids = {};

    this._bindings = {}; // id : [DOMNode]
  }

  _bind(selection, id) {
    const bindings = this._bindings[id];

    selection.each(function(d, i) {
      bindings.push(this);
    });
  }

  _unbind(selection, id) {
    const bindings = this._bindings[id];

    const toRemove = [];
    selection.each(function(d, i) {
      toRemove.push(this);
    });

    bindings[id] = bindings.filter(node => !toRemove.includes(node));

    if (bindings[id].length === 0) this._deleteFilter(id);
  }

  _deleteFilter(id) {
    let toDelete;
    Object.entries(this._ids).forEach(([signature, theID]) => {
      if (theID === id) {
        toDelete = signature;
        return false;
      }
    });

    delete this._ids[toDelete];
    delete this._bindings[id];
    this._defs.select('#' + id).remove();
  }

  hasFilter(signature) {
    return !!this._ids[signature];
    // return !this._defs.select('#' + signature).empty();
  }

  signature(...args) {
    // ['name', arg, 'name2', arg]
    // ['', ]
    return (
      'F_' +
      args
        .map((arg, i) => (i % 2 === 0 ? '' : Lib.signature(args[i - 1], arg)))
        .filter(v => v !== '')
        .join('_')
    );
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

    const theID = (this._ids[signature] = SVGFilterManager._genID());
    this._bindings[theID] = [];

    const filterEntry = this._defs
      .append('filter')
      .attr('id', theID)
      .attr('height', '300%')
      .attr('width', '300%')
      .attr('x', '-100%')
      .attr('y', '-100%');

    filterEntry.node().__filters__ = [];

    args.forEach((arg, i) => {
      if (i % 2 === 0) return Lib.generate(filterEntry, arg, args[i + 1]);
    });

    return theID;
  }

  static _genID() {
    if (!this.__idc__) this.__idc__ = 0;
    return `FILTER_${this.__idc__++}`;
  }

  // _genID() {
  // }

  getFilterID(signature) {
    return this._ids[signature];
  }
}

d3.selection.prototype.svgFilter = function(...filters) {
  // name, args, name1, args1, ... ,nameN, argsN
  // If no defs entry, generate one at the root and set it @ the svg filter manager
  // create a new svg filter manager for that svg

  // 1. Find topmost SVG
  // let svg = d3.select(this.node().farthestViewportElement || this.node().closest('svg'));

  // // 2. Ensure the defs entry exists
  // let defs = svg.select(':scope>defs.svg-custom-filters');
  // if (defs.empty()) {
  //     defs = svg.append('defs').attr('class', 'svg-custom-filters');
  //     defs.node()._svgFilterManager = new SVGFilterManager(defs);
  // }

  const defs = this.svgFilterDefs();

  const filterManager = defs.node()._svgFilterManager;
  const filterID = filterManager.createFilter(...filters);

  this.each(function(d) {
    const sel = d3.select(this);
    if (filterID === sel.getFilterID()) return;
    sel.clearFilter();

    sel.attr('filter', `url(#${filterID})`);
    filterManager._bind(sel, filterID);
  });

  // 3. Generate a filter manager if not existing

  // TheFilterManager._defs;
  // const ids = GenSVGFilters(filters);
};

d3.selection.prototype.svgFilterDefs = function() {
  // 1. Find topmost SVG
  let svg = d3.select(
    this.node().farthestViewportElement || this.node().closest('svg')
  );

  // 2. Ensure the defs entry exists
  let defs = svg.select(':scope>defs.svg-custom-filters');
  if (defs.empty()) {
    defs = svg.append('defs').attr('class', 'svg-custom-filters');
    defs.node()._svgFilterManager = new SVGFilterManager(defs);
  }

  return defs;
};

d3.selection.prototype.getFilterID = function() {
  const filterAttr = this.attr('filter');

  let filterID;
  if (!!filterAttr) filterID = /\(\#(.+)\)/.exec(filterAttr)[1];

  return filterID;
};

d3.selection.prototype.clearFilter = function() {
  this.each(function(d, i) {
    const sel = d3.select(this);
    const filterID = sel.getFilterID();
    if (!filterID) return;

    const defs = sel.svgFilterDefs();
    const filterManager = defs.node()._svgFilterManager;

    sel.attr('filter', null);
    filterManager._unbind(sel, filterID);
  });

  return this;
};

d3.svgFilterLib = Lib;

// const originalRemove = d3.selection.prototype.remove;
// d3.selection.prototype.remove = function () { // Add in clear filter to remove fn!
//     this.selectAll('*').clearFilter();
//     originalRemove.call(this, ...arguments);
// }

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
