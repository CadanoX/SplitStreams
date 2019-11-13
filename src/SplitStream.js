import * as d3 from 'd3';
import '../libs/d3svgfilters/src/d3-svg-filters.js';

import SplitStreamInputData from './SplitStreamInputData.js';
import SplitStreamFilter from './SplitStreamFilter.js';
import SplitStreamData from './SplitStreamData.js';

import { getRandomColor } from './functions.js';
import '../css/SplitStream.css';

export default class SplitStream {
  constructor(container, opts = {}) {
    this._opts = {
      animDuration: 1000,
      transparentRoot: false,
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
      unifySize: false,
      unifyPosition: false,
      drawStroke: false,
      showLabels: false,
      mirror: false,
      splitRoot: false,
      shapeRendering: 'geometricPrecision',
      offset: 'silhouette', // zero, expand, silhouette,
      filterMode: 'fast',

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

    this._streamData = new SplitStreamData();
    this._minTime;
    this._maxTime;
    this._maxValue;
    this._maxDepth;
    this._indices = {};

    this._xSpacing = this.xSpacingFixed;
    this._ySpacing = this.ySpacingFixed;

    this._onMouseOver;
    this._onMouseOut;

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
  set transparentRoot(transparent) {
    this._opts.transparentRoot = transparent;
    this._render();
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
  set shapeRendering(rendering) {
    this._opts.shapeRendering = rendering;
    this.render();
  }
  set filterMode(mode) {
    if (mode != this._opts.filterMode) {
      d3.selectAll('.depthLayer').clearFilter();
      d3.selectAll('path.stream').clearFilter();
    }
    this._opts.filterMode = mode;
    this._applyFilters();
  }

  set color(colorFunction) {
    this._color = colorFunction;
    this.render();
  }
  set colorRandom(random) {
    this._colorRandom = random;
    this.render();
  }
  set proportion(value) {
    this._streamData.proportion = this._opts.proportion = +value;
    this._update();
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

  set onMouseOver(callback) {
    this._onMouseOver = callback;
    this.render();
  }

  set onMouseOut(callback) {
    this._onMouseOut = callback;
    this.render();
  }

  get splits() {
    this._streamData.splits;
  }

  // expects SplitStreamInputData as input
  _setData(d) {
    if (!(d instanceof SplitStreamInputData || d instanceof SplitStreamFilter))
      console.error(
        'Added data is not an instance of SplitStreamData or SplitStreamFilter'
      );

    this._datasetsLoaded++;
    this._data = d.data;
    this._update();
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
        let count = 0;
        let id;
        do {
          count++;
          id = node.id + '_' + count;
        } while (!!this._indices[id]);
        // console.log(`ID '${node.id}' is already in use. Use '${id}' instead.`);
        // ID is now in use
        this._indices[id] = true;
        node.streamId = id;
      }
      return true;
    }
  }

  _clearStreamIds() {
    this._streamData.clear();
    this._indices = {};
  }

  _normalizeData() {
    // we add a padding and therefore need to recalculate the aggregate of each node
    // if a node's size is bigger than its aggregate, it will use the aggregate as size
    // TODO: padding interferes with positions
    // TODO: padded aggregate can probably be calculated from the size of the subtree
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

        let padding = (node.children.length + 1) * this._opts.yPadding; // * (1 / (node.depth + 1));
        node.size += padding;
      } else
        node.size = this._opts.unifySize
          ? 1
          : node.dataSize + this._opts.yPadding;
    };

    // TODO: This version is better with positions but doesn't work properly in general
    // let checkSizes = node => {
    //   if (!!node.children) {
    //     let aggregate = 0;
    //     for (let child of node.children) {
    //       checkSizes(child);
    //       aggregate += child.size;
    //     }
    //     let dataSize = node.dataSize + this._opts.yPadding;
    //     if (aggregate > dataSize || this._opts.unifySize)
    //       node.size = aggregate + this._opts.yPadding;
    //     else node.size = dataSize;
    //   } else node.size = this._opts.unifySize ? 1 : node.dataSize;
    // };

    // if nodes don't have a set position, spread them out equally
    // positions must be unified, if sizes are unified
    let checkPositions = (node, pos = 0) => {
      if (
        this._opts.unifySize ||
        this._opts.unifyPosition ||
        !node.dataPos
        // (!!node.parent && node.parent.id == 'fakeRoot')
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

    let setOffset = root => {
      if (offset == 'zero') {
        root.y0 = 0;
        root.y1 = root.size / this._maxValue;
      } else if (offset == 'expand') {
        root.y0 = 0;
        root.y1 = 1;
      } else if (offset == 'silhouette') {
        root.y0 = 0.5 - (0.5 * root.size) / this._maxValue;
        root.y1 = 0.5 + (0.5 * root.size) / this._maxValue;
      }
    };

    let traverse = (node, childX = 0) => {
      let p = node.parent;
      if (!p) {
        node.marginX = this._opts.splitRoot ? this._xSpacing(node) : 0;
      } else {
        let space = p.y1 - p.y0 - (p.children.length + 1) * p.marginY;
        // if the parent is too small, draw children as a zero line in the center of the parent stream
        if (space <= 0) {
          node.y0 = 0.5 * (p.y0 + p.y1);
          node.y1 = 0.5 * (p.y0 + p.y1);
        } else {
          // normalize
          node.rpos = (node.pos - p.pos) / p.size;
          node.rsize = node.size / p.size;
          node.y0 = p.y0 + (childX + 1) * p.marginY + space * node.rpos;
          node.y1 = node.y0 + space * node.rsize;

          // if a node is too small, draw it as a zero line
          let size = node.y1 - node.y0;
          if (size <= minSizeThreshold) {
            node.y0 = 0.5 * (node.y0 + node.y1);
            node.y1 = 0.5 * (node.y0 + node.y1);
          }
        }

        node.marginX = p.marginX + this._xSpacing(node);
      }

      node.marginY = this._ySpacing(node);

      if (!!node.children)
        node.children.forEach((child, i) => traverse(child, i));
    };

    let time = this._data.timesteps;
    for (let i in time) {
      setOffset(time[i].tree);
      traverse(time[i].tree);
    }

    // treemaps require 0.5 space on the time axis to the left and right of each timestep
    this._streamData.xScale = d3
      .scaleLinear()
      .domain([this._minTime - 0.5, this._maxTime + 0.5])
      // .domain([
      //   this._minTime - 0.5 * (1 - this._opts.proportion),
      //   this._maxTime + 0.5 * (1 - this._opts.proportion)
      // ])
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
    let minColoredDepth = this._opts.transparentRoot ? 1 : 0;
    let color = this._colorRandom
      ? getRandomColor
      : this._color.domain([this._maxDepth, minColoredDepth]);

    let streamsByDepth = d3
      .nest()
      .key(d => d.deepestDepth)
      .entries(this._streamData.streams);

    let depthLayers = this._pathContainer
      .selectAll('g.depthLayer > g.clipLayer')
      .data(streamsByDepth, d => this._name + this._datasetsLoaded + d.key)
      .join(enter =>
        enter
          .append('g')
          .classed('depthLayer', true)
          .each(function(d) {
            this.classList.add('depth-' + d.key);
          })
          .append('g')
          .classed('clipLayer', true)
      );

    // .attr('clip-path', d => 'url(#clip' + d.key + 'wrapper)');

    depthLayers
      .selectAll('path.stream')
      .data(d => d.values, d => this._name + this._datasetsLoaded + d.id)
      .join(enter =>
        enter
          .append('path')
          .classed('stream', true)
          .on('mouseover', this._onMouseOver)
          .on('mouseout', this._onMouseOut)
          .attr('clip-path', d => 'url(#clip' + d.id + this._name + ')')
          .attr('id', d => 'stream' + d.id + this._name)
          //.attr('stroke-width', 3)
          .attr('paint-order', 'stroke')
      )
      .attr('d', d => d.path)
      .attr('shape-rendering', this._opts.shapeRendering)
      .attr(
        'fill',
        d => (!!d.data ? d.data.color : null) || color(d.deepestDepth)
        // 'white'
      )
      .attr(
        'fill-opacity',
        this._opts.transparentRoot ? d => (d.id == 'fakeRoot' ? 0 : 1) : 1
      )
      // remove empty streams (they do not include a single bezier curve)
      .filter(d => d.path.indexOf('C') == -1)
      .remove();

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

    this._applyFilters();
  }

  showLabels(show = true) {
    this._opts.showLabels = show;
    let labelData = this._opts.showLabels ? this._streamData.streams : [];

    let labels = this._textContainer
      .selectAll('text')
      .data(labelData, d => d.id);

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
    if (!this._filters) return;

    let filters = [];
    for (let filter of this._filters)
      filters.push(filter.type, {
        color: 'black',
        dx: filter.dx,
        dy: filter.dy,
        blur: filter.stdDeviation
      });

    if (this._opts.filterMode == 'fast')
      d3.selectAll('.depthLayer').svgFilter(...filters);
    else if (this._opts.filterMode == 'accurate')
      d3.selectAll('path.stream').svgFilter(...filters);
  }

  update() {
    this._update(true);
  }
  _update(manuallyTriggered = false) {
    if (!this._data) return;

    if (!this._opts.automaticUpdate) if (!manuallyTriggered) return;

    // console.log('update');
    let startTime = Date.now();

    this._normalizeData();
    this._applyOrdering();
    this._calculatePositions();

    // this._streamData.preprocess();
    this._streamData.calculatePaths();
    this.render();

    // console.log(
    //   'TIMING: ' + this._data.numNodes + ',' + (Date.now() - startTime)
    // );
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
  //     return SplitStream.extend(...args);
  // }
}
