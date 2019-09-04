import * as d3 from 'd3';

import SecStreamFilter from './SecStreamFilter.js';
import SecStreamData from './SecStreamData.js';
import '../libs/d3svgfilters/src/d3-svg-filters.js';

import { getRandomColor } from './functions.js';

export default class SecStream {
  constructor(container, opts = {}) {
    this._opts = {
      animDuration: 1000,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      height: container.clientHeight,
      width: container.clientWidth,
      automaticUpdate: true,
      minSizeThreshold: 0,
      //separationXMethod: "",
      xMargin: 0,
      //separationYMethod: "",
      yMargin: 0,
      yPadding: 0,
      zoomTimeFactor: 1,
      proportion: 1,
      unifySize: false,
      unifyPosition: false,
      drawStroke: false,
      showLabels: false,
      mirror: false,
      splitRoot: false,
      offset: 'silhouette', // zero, expand, silhouette

      ...opts // overwrite default settings with user settings
    };

    this._name = container.id;
    this._container = container;
    this._data;
    this._pathContainer;
    this._textContainer;
    this._svg;
    this._svgFilters;
    this._filters;
    this._datasetsLoaded = 0;

    this._streamData = new SecStreamData();
    this._minTime;
    this._maxTime;
    this._maxValue;
    this._maxDepth;
    this._indices = {};
    this._maxIndex = 0;

    this._xSpacing = this.xSpacingFixed;
    this._ySpacing = this.ySpacingFixed;

    this._color = d3.scaleSequential(d3.interpolateBlues);
    this._colorRandom = false;

    this._init();
  }

  static get a() {}

  data(d) {
    return d == null ? this._data : (this._setData(d), this);
  }

  filters(d) {
    return d == null ? this._filters : (this._setFilters(d), this);
  }

  options(opts) {
    Object.assign(this._opts, opts);
  }

  set automaticUpdate(auto) {
    this._opts.automaticUpdate = auto;
  }
  set unifySize(unify) {
    this._opts.unifySize = unify;
    this._update();
  }
  set yPadding(value) {
    this._opts.yPadding = +value;
    this._update();
  }
  set unifyPosition(unify) {
    this._opts.unifyPosition = unify;
    this._update();
  }
  set mirror(mirror) {
    this._opts.mirror = mirror;
    this._update();
  }
  set splitRoot(splitRoot) {
    this._opts.splitRoot = splitRoot;
    this._update();
  }
  set minSizeThreshold(threshold) {
    this._opts.minSizeThreshold = +threshold / 100;
    this._update();
  }
  set proportion(value) {
    this._opts.proportion = this._streamData.proportion = +value;
    this._update();
  }
  set zoomTime(factor) {
    this._opts.zoomTimeFactor = +factor;
    this._update();
  }
  set offset(offset) {
    this._opts.offset = offset;
    this._update();
  }
  set xMargin(value) {
    this._opts.xMargin = +value;
    this._update();
  }
  set yMargin(value) {
    this._opts.yMargin = +value;
    this._update();
  }

  set color(colorFunction) {
    this._color = colorFunction;
    this.render();
  }
  set colorRandom(random) {
    this._colorRandom = random;
    this.render();
  }
  set startEndEncoding(encoding) {
    this._streamData.startEndEncoding = encoding;
    this._update();
  }
  set startEndEncodingX(x) {
    this._streamData.startEndEncodingX = x;
    this._update();
  }
  set startEndEncodingY(y) {
    this._streamData.startEndEncodingY = y;
    this._update();
  }
  set xSpacing(callback) {
    this._xSpacing = callback;
    this._update();
  }
  set ySpacing(callback) {
    this._ySpacing = callback;
    this._update();
  }

  get splits() {
    this._streamData.splits;
  }

  // expects SecStreamInputData as input
  _setData(d) {
    this._datasetsLoaded++;

    if (!d || typeof d !== 'object')
      return console.log(`ERROR: Added data "${d}" is not an object.`);
    this._data = d;
    this._normalizeData();
    this.update(); // TODO: for some reason, streams won't include any data if update is not called twice. that's why we call it here
  }

  _setFilters(d) {
    if (!d || typeof d !== 'object')
      return console.log(`ERROR: Added data "${d}" is not an object.`);
    this._filters = d;
    this._applyFilters();
  }

  _init() {
    const { margin } = this._opts;
    this._svg = d3
      .select(this._container)
      .append('svg')
      .classed('secstream', 'true')
      .attr('height', this._container.clientHeight)
      .attr('width', this._container.clientWidth)
      .call(
        d3.zoom().on('zoom', () => {
          this._pathContainer.attr('transform', d3.event.transform);
          this._textContainer.attr('transform', d3.event.transform);
        })
      );
    //.on("contextmenu", () => d3.event.preventDefault());
    //.append('g')
    //	.attr('id', 'svg-drawn')
    //.attr('transform', "translate(" + margin.left + "," + margin.top + ")");

    this._svgFilters = this._svg.append('defs');
    this._pathContainer = this._svg.append('g').classed('pathContainer', true);
    this._textContainer = this._svg.append('g').classed('textContainer', true);
  }

  _applyOrdering() {
    // change the order of siblings in the data for less edge crossings
    // TEST: RANDOM ORDER OF LEAF NODES
  }

  // returns true if node id did not exist before
  _findStreamId(node) {
    if (!!node.prev) {
      // use id of prev node
      node.streamId = node.prev[0].streamId;
      return false;
    } else {
      // new node
      // check if id is already in use
      if (!this._indices[node.id]) {
        // if not, use this id for the stream
        this._indices[node.id] = true;
        node.streamId = node.id;
      } else {
        // find a new ID
        do this._maxIndex++;
        while (!!this._indices[this._maxIndex]);
        console.log(
          `ID '${node.id}' is already in use. Use '${this._maxIndex}' instead.`
        );
        // ID is now in use
        this._indices[this._maxIndex] = true;
        node.streamId = this._maxIndex;
      }
      return true;
    }
  }
  //*/
  /*
  _findStreamId(node) {
    if (!node.prev) { // new node
      // find a new ID
      do { this._maxIndex++; }
      while(!!this._indices[this._maxIndex.toString()])
      // ID is now in use
      this._indices[this._maxIndex.toString()] = true;
      node.streamId = this._maxIndex.toString();
      return true;
    }
    else {
      // use id of prev node
      node.streamId = node.prev[0].streamId;
      return false;
    }
  }*/

  _clearStreamIds() {
    this._streamData.clear();
    this._indices = {};
    this._maxIndex = 0;
  }

  _normalizeData() {
    // if node does not have a size, set it's size to the sum of the sizes of its children
    // if a node does not have a size and does not have children, give it size 1

    let checkSizes = node => {
      if (!!node.children) {
        let aggregate = 0;
        for (let child of node.children) {
          checkSizes(child);
          aggregate += child.size;
        }
        if (aggregate > node.dataSize || this._opts.unifySize)
          node.size = aggregate;
        else node.size = node.dataSize;
        node.size += this._opts.yPadding * node.children.length;
      } else node.size = this._opts.unifySize ? 1 : node.dataSize;
    };

    // positions must be unified, if sizes are unified
    let checkPositions = (node, pos = 0) => {
      if (
        this._opts.unifySize ||
        this._opts.unifyPosition ||
        Number.isNaN(node.dataPos) ||
        (!!node.parent && node.parent.id == 'fakeRoot')
      )
        node.pos = pos;
      else node.pos = node.dataPos;

      if (!!node.children && node.children.length > 0) {
        let aggregate = 0;
        for (let child of node.children) {
          aggregate += child.size;
        }
        let spacing = (node.size - aggregate) / (node.children.length + 1);

        for (let [i, child] of node.children.entries()) {
          pos += spacing;
          checkPositions(child, pos);
          pos += child.size;
        }
      }
    };

    this._clearStreamIds();
    let time = this._data.timesteps;
    this._maxValue = 0;
    this._maxTime = 0;
    this._minTime = Infinity;
    for (let t in time) {
      checkSizes(time[t].tree);
      checkPositions(time[t].tree);
      this._maxValue = Math.max(this._maxValue, time[t].tree.size);
      this._minTime = Math.min(this._minTime, +t);
      this._maxTime = Math.max(this._maxTime, +t);
    }

    this._maxDepth = 0;
    let traverse = (node, depth) => {
      this._maxDepth = Math.max(this._maxDepth, depth);
      node.depth = depth++;
      let isNew = this._findStreamId(node);
      if (isNew) this._streamData.add(node);

      if (!!node.children)
        node.children.forEach(child => traverse(child, depth));
    };

    for (let i in time) traverse(time[i].tree, 0);
  }

  _calculatePositions() {
    let { height, width, margin, minSizeThreshold, offset } = this._opts;

    let traverse = (node, childX = 0) => {
      let p = node.parent;
      if (!p) {
        if (offset == 'zero') {
          node.y0 = 0;
          node.y1 = node.size / this._maxValue;
        } else if (offset == 'expand') {
          node.y0 = 0;
          node.y1 = 1;
        } else if (offset == 'silhouette') {
          node.y0 = 0.5 - (0.5 * node.size) / this._maxValue;
          node.y1 = 0.5 + (0.5 * node.size) / this._maxValue;
        }

        if (this._opts.splitRoot) node.marginX = this._xSpacing(node);
        // this._xSpacing().call(this, )
        else node.marginX = 0;
        node.marginY = this._ySpacing(node);
      } else {
        node.x = p.x;
        let numMargins = p.children.length + 1;
        let pSize = p.y1 - p.y0 - numMargins * p.marginY;
        if (pSize <= 0) {
          node.y0 = 0.5 * (p.y0 + p.y1);
          node.y1 = 0.5 * (p.y0 + p.y1);
        } else {
          // normalize
          node.rpos = (node.pos - node.parent.pos) / node.parent.size;
          node.rsize = node.size / node.parent.size;
          node.y0 = p.y0 + (childX + 1) * p.marginY + pSize * node.rpos;
          node.y1 = node.y0 + pSize * node.rsize;

          let size = node.y1 - node.y0;
          if (size <= minSizeThreshold) {
            node.y0 = 0.5 * (node.y0 + node.y1);
            node.y1 = 0.5 * (node.y0 + node.y1);
          }
        }

        node.marginX = p.marginX + this._xSpacing(node);
        node.marginY = this._ySpacing(node);
      }

      if (!!node.children)
        node.children.forEach((child, i) => traverse(child, i));
    };

    let time = this._data.timesteps;
    for (let i in time) {
      time[i].tree.x = +i;
      traverse(time[i].tree);
    }

    this._streamData.xScale = d3
      .scaleLinear()
      .domain([this._minTime - 0.5, this._maxTime + 0.5])
      //.domain([this._minTime - 0.5*(1-this._opts.proportion), this._maxTime + 0.5*(1-this._opts.proportion)])
      .range([margin.left, width * this._opts.zoomTimeFactor - margin.right]);

    let domain = this._opts.mirror ? [1, 0] : [0, 1];
    this._streamData.yScale = d3
      .scaleLinear()
      .domain(domain)
      .nice()
      .range([height - margin.bottom, margin.top]);
    //.range(margin.top, height - margin.bottom);
  }

  setRootNodeById(Id) {
    let root = this._streamData.streams.find(d => d.id == id);
  }

  render() {
    let color = this._colorRandom
      ? getRandomColor
      : this._color.domain([this._maxDepth, 0]);

    let onMouseOver = d => {
      console.log('id: ' + d.id);
      console.log(d.data);
    };
    let onMouseOut = d => {
      //console.log("mouse out")
    };

    let streamsByDepth = d3
      .nest()
      .key(d => d.depth)
      .entries(this._streamData.streams);

    let depthLayers = this._pathContainer
      .selectAll('g.depthLayer > g.clipLayer')
      .data(streamsByDepth, d => this._name + this._datasetsLoaded + d.key);

    depthLayers.exit().remove();
    // this._pathContainer.selectAll('.depthLayer:empty').remove()

    depthLayers
      .enter()
      .append('g')
      .classed('depthLayer', true)
      .each(function(d) {
        this.classList.add('depth-' + d.key);
      })
      .append('g')
      .classed('clipLayer', true);
    // .attr('clip-path', d => 'url(#clip' + d.key + 'wrapper)');

    let streams = depthLayers.selectAll('path.stream').data(
      function(d) {
        return d.values;
      },
      d => this._name + this._datasetsLoaded + d.id
    );

    streams
      .enter()
      .append('path')
      .classed('stream', true)
      .on('mouseover', onMouseOver)
      .on('mouseout', onMouseOut)
      .attr('clip-path', d => 'url(#clip' + d.id + this._name + ')')
      .attr('id', d => 'stream' + d.id + this._name)
      .attr('shape-rendering', 'geometricPrecision')
      //.attr('shape-rendering', 'optimizeSpeed')
      .attr('paint-order', 'stroke')
      //.attr('stroke-width', 3)
      .merge(streams)
      .attr('d', d => d.path)
      .style(
        'fill',
        d => (!!d.data ? d.data.color : null) || color(d.deepestDepth)
      )
      // remove empty streams (they do not include a single bezier curve)
      .filter(d => d.path.indexOf('C') == -1)
      .remove();

    streams.exit().remove();

    this.showLabels(this._opts.showLabels);
    this.drawStroke(this._opts.drawStroke);

    let splitData = this._svgFilters
      .selectAll('clipPath')
      .data(
        this._streamData.clipPaths,
        d => this._name + this._datasetsLoaded + d.id
      );

    splitData
      .enter()
      .append('clipPath')
      .attr('id', d => 'clip' + d.id + this._name)
      .merge(splitData)
      .html(d => '<path d="' + d.path + '">');

    splitData.exit().remove();
  }

  showLabels(show = true) {
    this._opts.showLabels = show;
    let labelData = this._opts.showLabels ? this._streamData.streams : [];

    let labels = this._textContainer
      .selectAll('text')
      .data(labelData, function(d) {
        return d.id;
      });

    labels
      .enter()
      .append('text')
      .text(d => (!!d.data ? d.data.typeLabel : d.id))
      .merge(labels)
      .attr('x', d => d.textPos.x)
      .attr('y', d => d.textPos.y);

    labels.exit().remove();
  }

  drawStroke(draw = true) {
    this._opts.drawStroke = draw;
    let color = this._opts.drawStroke ? 'black' : null;
    this._pathContainer.attr('stroke', color);
    this._pathContainer.attr('stroke-width', 3);
    // d3.selectAll('path').attr('stroke-width', 0.001)
  }

  _applyFilters() {
    let filters = [];
    for (let filter of this._filters)
      filters.push(filter.type, {
        color: 'black',
        dx: filter.dx,
        dy: filter.dy,
        blur: filter.stdDeviation
      });

    d3.selectAll('.depthLayer').svgFilter(...filters);
  }

  update() {
    this._update(true);
  }
  _update(manuallyTriggered = false) {
    if (!this._data) return;

    if (!this._opts.automaticUpdate) if (!manuallyTriggered) return;

    console.log('update');

    this._normalizeData();
    this._applyOrdering();
    this._calculatePositions();

    // this._streamData.preprocess();
    this._streamData.calculatePaths();
    this.render();
  }

  resize(
    width = this._container.clientWidth,
    height = this._container.clientHeight
  ) {
    this._opts.width = width;
    this._opts.height = height;
    this._svg.attr('width', width).attr('height', height);

    this._update();
  }

  ySpacingFixed(node) {
    return this._opts.yMargin / 4;
  }

  ySpacingPercentage(node) {
    return ((node.y1 - node.y0) * this._opts.yMargin) / 2;
  }

  ySpacingHierarchical(node) {
    return ((node.depth + 1) * this._opts.yMargin) / 4;
  }

  ySpacingHierarchicalReverse(node) {
    return ((1 / (node.depth + 1)) * this._opts.yMargin) / 4;
  }

  xSpacingFixed(node) {
    return this._opts.xMargin / 10;
  }

  // TODO: use the max depth at that timepoint instead
  xSpacingHierarchical(node) {
    return ((node.depth + 1) / this._maxDepth) * this._opts.xMargin;
  }

  xSpacingHierarchicalReverse(node) {
    return (1 / (node.depth + 1)) * this._opts.xMargin;
  }

  addSplits(splits) {
    this._streamData.addSplits(splits);
    this._update();
  }

  addSplitsAtTimepoints() {
    let splits = [];
    for (let i = this._minTime; i <= this._maxTime; i++) splits.push(i);
    this.addSplits(splits);
  }

  addSplitsBetweenTimepoints() {
    let splits = [];
    for (let i = this._minTime - 1; i <= this._maxTime; i++)
      splits.push(i + 0.5);
    this.addSplits(splits);
  }

  addSplitsRandomly(num = 1) {
    let t0 = this._minTime - 1;
    let t1 = this._maxTime + 1;
    let splits = [];
    for (let i = 0; i < num; i++) {
      let r = t0 + Math.random() * (t1 - t0);
      splits.push(r.toString());
      splits.sort();
    }
    this.addSplits(splits);
  }

  removeSplits(splits) {
    this._streamData.removeSplits(splits);
    this._update();
  }

  // static extend(...args) {
  //     this.myNewFunction
  // }
  // extend(...args) {
  //     return SecStream.extend(...args);
  // }
}
