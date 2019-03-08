//const d3 = require('d3');
{
	class StreamPaths {
		constructor({
			// x-aligned, same amount of vertices on top and bottom
			// Time steps for cutting MUST be between two int indices
			// (Have sensible number of vertices to not cause index rounding problems)
			// Any number between 0 and (N timesteps - 1) must "nicely land" on valid indices
			// of the array.
			vertices
		}) {
			this._vertices = vertices;
			this._splitVertices = []; // Array of areas + metadata
	
			this._splits = {}; // index : is split
		}
	
		_calculate() {
			// calculate _splitVertices
			// x-align indices etc
	
		}
	
		unsplit(timestepIndex) {
			this._splits[timestepIndex] = false;
			return this;
		}
	
		split(timeStepIndex) {
			// apply the split to vertices
			this._splits[timestepIndex] = true;
			return this;
		}
	}	

	class SecStream {
		constructor(container, opts = {})
        {
			this._opts = {
				animDuration: 1000,
				margin: { top: 20, right: 20, bottom: 20, left: 20 },
				height: container.clientHeight,
				width: container.clientWidth,
				automaticUpdate: true,
				minSizeThreshold: 0,
				//separationXMethod: "",
				separationXValue: 0,
				//separationYMethod: "",
				separationYValue: 0,
				zoomTimeFactor: 1,
				proportion: 0.99,
				offset: "silhouette" // zero, expand, silhouette
            }
			Object.assign(this._opts, opts);

			this._container = container;
            this._id = "id";
            this._layout;
			this._data;
            this._pathContainer;
			this._svg;
			this._svgFilters;
			this._filters;
			this._clipPaths;
			
			this._newStreamData = d3.SecStreamData();

			this._streamData;
			this._minTime;
			this._maxTime;
			this._maxValue;
			this._maxDepth;
			this._indices = {};
			this._maxIndex = 0;

			this._separationXMethod = this.marginXFixed;
			this._separationYMethod = this.marginYFixed;

            this._init();
        }
        
        static get a(){}

        data(d) { return d == null ? this._data : (this._setData(d), this); }
		
		filters(d) { return d == null ? this._filters : (this._setFilters(d), this); }

		options(opts) { Object.assign(this._opts, opts); }
		
        _setData(d) {
			if (!d || (typeof d !== "object")) return console.log(`ERROR: Added data "${d}" is not an object.`);
			this._data = d;
			this._update();
		}

		_setFilters(d) {
			if (!d || (typeof d !== "object")) return console.log(`ERROR: Added data "${d}" is not an object.`);
			this._filters = d;
			this._applyFilters();
		}

		_init() {
			const { margin } = this._opts;
			this._svg = d3.select(this._container)
				.append('svg')
				.classed('secstream', 'true')
				.attr('height', this._container.clientHeight)
				.attr('width', this._container.clientWidth)
				.call(d3.zoom().on('zoom', () => {
					this._pathContainer.attr('transform', d3.event.transform);
				}));
                //.on("contextmenu", () => d3.event.preventDefault());
                //.append('g')
				//	.attr('id', 'svg-drawn')
					//.attr('transform', "translate(" + margin.left + "," + margin.top + ")");

					
			this._svgFilters = d3.select('svg').append('defs');
			this._pathContainer = this._svg.append('g').classed('pathContainer', true);
        }

		_applyOrdering() {
			// change the order of siblings in the data for less edge crossings

			// TEST: RANDOM ORDER OF LEAF NODES

		}

		// returns if node builds a new stream
		//*
		_findStreamId(node) {
			if (!node.prev) { // new node
				// check if id is already in use
				if (!this._indices[node.id]) {
					// if not, use this id for the stream
					this._indices[node.id] = true;
					node.streamId = node.id;
				}
				else {
					// find a new ID
					do { this._maxIndex++; }
					while(!!this._indices[this._maxIndex])
					// ID is now in use
					this._indices[this._maxIndex] = true;
					node.streamId = this._maxIndex;
				}
				return true;
			}
			else {
				// use id of prev node
				node.streamId = node.prev[0].streamId;
				return false;
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
			this._newStreamData.clear();
			this._indices = {};
			this._maxIndex = 0;

			
			let streams = this._pathContainer.selectAll('path.stream')
				.data([]).exit().remove();
		}

		_normalizeData() {
			// if node does not have a size, set it's size to the sum of the sizes of its children
			// if a node does not have a size and does not have children, give it size 1
			let checkSizes = function(node) {
				if (!node.size) {
					if (!!node.children) {
						let aggregate = 0;
						for (let child of node.children) {
							checkSizes(child);
							aggregate += child.size;
						}
						node.size = aggregate + 1;
					}
					else {
						node.size = 1;
					}
				}
			}

			let checkPositions = function(node, pos = 0) {
				if (!node.pos) {
					node.pos = pos;

					if (!!node.children) {
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
				}
			}

			this._clearStreamIds();
			let time = this._data.timesteps;
			let maxValue = 0;
			let maxTime = 0;
			let minTime = Infinity;
			for (let i in time) {
				checkSizes(time[i].tree);
				checkPositions(time[i].tree);
				maxValue = Math.max(maxValue, time[i].tree.size);
				minTime = Math.min(minTime, Number(i));
				maxTime = Math.max(maxTime, Number(i));
			}
			
			this._maxTime = maxTime;
			this._minTime = minTime;
			this._maxValue = maxValue;
			this._maxDepth = 0;
			
			let traverse = (node, depth) => {
				this._maxDepth = Math.max(this._maxDepth, depth);
				node.depth = depth++;
				let isNew = this._findStreamId(node);
				if (isNew)
					this._newStreamData.add(node)

				if (!node.parent) {
					node.rpos = 0;
					node.rsize = 1;
				}
				else {
					node.rpos = (node.pos - node.parent.pos) / node.parent.size;
					node.rsize = node.size / node.parent.size;
				}
				
				if (!!node.children)
					node.children.forEach( (child) => traverse(child, depth));
			}

			for (let i in time) {
				traverse(time[i].tree, 0);
			}
		}

		_calculatePositions() {
			let {
				height,
				width,
				margin,
				minSizeThreshold,
				separationXValue,
				separationYValue,
				proportion,
				offset
			 } = this._opts;

			let traverse = (node, childX = 0) => {
				let p = node.parent;
				if (!p) {

					if (offset == "zero") {
						node.y0 = 0;
						node.y1 = node.size / this._maxValue;
					}
					else if (offset == "expand") {
						node.y0 = 0;
						node.y1 = 1;
					}
					else if (offset == "silhouette") {
						node.y0 = 0.5 - 0.5 * node.size / this._maxValue;
						node.y1 = 0.5 + 0.5 * node.size / this._maxValue;
					}

					node.marginX = 0;
					node.marginY = this._separationYMethod(node);
				}
				else {
					node.x = p.x;
					let numMargins = p.children.length + 1;
					let pSize = p.y1 - p.y0 - numMargins * p.marginY;
					if (pSize <= 0) {
						node.y0 = 0.5 * (p.y0 + p.y1);
						node.y1 = 0.5 * (p.y0 + p.y1);
					} else {
						node.y0 = p.y0 + (childX+1) * p.marginY + pSize * node.rpos;
						node.y1 = node.y0 + pSize * node.rsize;

						let size = node.y1 - node.y0;
						if ((size) <= minSizeThreshold) {
							node.y0 = 0.5 * (node.y0 + node.y1);
							node.y1 = 0.5 * (node.y0 + node.y1);
						}
					}

					node.marginX = p.marginX + this._separationXMethod(node);
					node.marginY = this._separationYMethod(node);
				}

				if (!!node.children)
					node.children.forEach( (child, i) => traverse(child, i));
			}

			let time = this._data.timesteps;
			for (let i in time)
			{
				time[i].tree.x = Number(i);
				traverse(time[i].tree);
			}

			this._newStreamData.xScale = d3.scaleLinear()
				.domain([this._minTime - 0.5, this._maxTime + 0.5]).nice()
				.range([margin.left, width * this._opts.zoomTimeFactor - margin.right]);

			this._newStreamData.yScale = d3.scaleLinear()
				.domain([0, 1]).nice()
				.range([height - margin.bottom, margin.top]);
		}

		_calculateStreamData() {
			this._streamData = [];
			let t = this._data.timesteps;
			let prop = this._proportion;
			for (let i = 1; i < t.length; i++) { // for all timesteps
				for (let n in t[i].references) { // for all nodes build stream to prev of node
					let node = t[i].references[n];
					let stream = {};
					stream.depth = node.depth;

					//console.log(i + " " + node.id + " " + node.depth)
					if (!!node.prev) // move
					{
						if (0 >= (-node.marginX + node.x) - (node.prev[0].marginX + node.prev[0].x))
							stream.path = [[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
						else
							stream.path = [
								[node.prev[0].marginX + node.prev[0].x, node.prev[0].y0, node.prev[0].y1],
								[node.prev[0].marginX + prop * node.prev[0].x + (1-prop) * node.x, node.prev[0].y0, node.prev[0].y1],
								[-node.marginX + (1-prop) * node.prev[0].x + prop * node.x, node.y0, node.y1],
								[-node.marginX + node.x, node.y0, node.y1]
							];
					}
					else { // insert
						let pos;
						// find an ancestor who existed in the previous timestep
						let p = node;
						while(!p.prev)
							p = p.parent;

						// try to use the center of the stream as beginning
						// if the previous node was not big enough to have this mid point, use the outside of the previous node
						let mid = 0.5 * (node.y0 + node.y1);
						if ((p.prev[0].y0 <= mid) && (p.prev[0].y1 >= mid))
							pos = mid;
						else {
							/*let p = 0.75;
							pos = p * p.prev[0].y1 + (1-p) * node.parent.y1;
							pos = node.y0;
							pos = (p.prev[0].y1 + node.y0) /2;
							*/
							pos = p.prev[0].y1;
						}
						if (0 >= (-node.marginX + node.x) - (p.prev[0].marginX + p.prev[0].x))
							stream.path = [[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
						else
							stream.path = [
								[p.prev[0].marginX + p.prev[0].x, pos, pos],
								[p.prev[0].marginX + prop * p.prev[0].x + (1-prop) * node.x, pos, pos],
								[-node.marginX + (1-prop) * p.prev[0].x + prop * node.x, node.y0, node.y1],
								[-node.marginX + node.x, node.y0, node.y1]
							];
					}

					if (!this._streamData[node.depth])
						this._streamData[node.depth] = [];
					this._streamData[node.depth].push(stream);
				}

				// make deleted nodes 0
				for (let n in t[i].deleted) {
					let node = t[i].deleted[n];
					let stream = {};
					stream.depth = node.depth;
					let p = node;
					do { p = p.parent }
					while(!p.next);

					let pos;
					let mid = (node.y0 + node.y1) /2;
					if (p.next[0].y1 >= mid)
						pos = mid;
					else {
						pos = p.next[0].y1;
					}
				
					if (0 >= (-p.next[0].marginX + p.next[0].x) - (node.marginX + node.x))
						stream.path = [[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
					else
						stream.path = [
							[node.marginX + node.x, node.y0, node.y1],
							[node.marginX + prop * node.x + (1-prop) * p.next[0].x, node.y0, node.y1],
							[-p.next[0].marginX + (1-prop) * node.x + prop * p.next[0].x, pos, pos],
							[-p.next[0].marginX + p.next[0].x, pos, pos]
						];

					// TODO: actually this depth should always exist, but it doesn't
					if (!this._streamData[node.depth])
						this._streamData[node.depth] = [];
					this._streamData[node.depth].push(stream);
				}
			}
		}

		render() {
			const { animDuration } = this._opts;

			let xScale = d3.scaleLinear()
				.domain([0, this._maxTime]).nice()
				.range([this._opts.margin.left, this._opts.width - this._opts.margin.right]);

			let yScale = d3.scaleLinear()
				.domain([0, 1]).nice()
				.range([this._opts.height - this._opts.margin.bottom, this._opts.margin.top]);
				
			//let color = d3.scaleOrdinal(d3.schemePaired);
			let color = d3.scaleSequential(d3.interpolateBlues).domain([this._maxDepth, 0]);
			//let color = d3.scaleSequential(d3.interpolateCubehelixDefault).domain([0, this._maxDepth]);

				/*
				d3.curveLinear,
    {"			d3.curveStep,
    {"			d3.curveStepBefore,
    {"			d3.curveStepAfter,
    {"			d3.curveBasis,
    {"			d3.curveCardinal.tension(0.5),
    {"			d3.curveMonotoneX,
    {"			d3.curveCatmullRomOpen.alpha(0.5)
				*/
			let area = d3.area()
				.x(d => xScale(d[0]))
				.y0(d => yScale(d[1]))
				.y1(d => yScale(d[2]))
				.curve(d3.curveMonotoneX)
			
			// insert new layers
			this._pathContainer.selectAll('g')
				.data(this._streamData)
				.enter().append('g')
					.classed('layer', true);

			let layers = this._pathContainer.selectAll('g')

			layers.each(function (layer, i)  {
				//console.log("Layer " + i);
				let streams = d3.select(this).selectAll('path.stream')
					.data(layer);
				streams.enter().append('path')
					.classed('stream', true)
					//.attr('d', (d,i) => area(d.path,i))
					.style('fill', d => color(d.depth))
					//.each((d) => console.log (d))

				streams.exit().remove();
			});

			let streams = d3.selectAll('path.stream')
				.attr('d', (d,i) => area(d.path,i))

			return this;
		}

		render2() {
			let color = d3.scaleSequential(d3.interpolateBlues).domain([this._maxDepth, 0]);
			
			let onMouseOver = (d) => {
				console.log("id: " + d.id);
				console.log(d.data);
			}
			let onMouseOut = (d) => {
				//console.log("mouse out")
			}
			let streams = this._pathContainer.selectAll('path.stream')
				.data(this._newStreamData.streams, function(d) { return d.id });

			streams.enter().append('path')
				.classed('stream', true)
				.style('fill', d => color(d.depth))
				.on("mouseover", onMouseOver)
				.on("mouseout", onMouseOut)
				.attr('clip-path', d => 'url(#clip' + d.id + ')')
			
			streams.exit().remove();

			d3.selectAll('path.stream')
				.attr('d', d => d.path);

			/*
			let splitData = this._svgFilters.selectAll("clipPath")
				.data(this._newStreamData.clipPaths, function(d) { return d.id });

			splitData.enter().append("clipPath")
				.attr('id', d => d.id)
				.append('path')
				
			splitData.exit().remove();
			this._svgFilters.selectAll("clipPath > path")
				.attr('d', d => d.path)
			*/
			let splitData = this._svgFilters.selectAll("clipPath")
				.data(this._newStreamData.clipPaths, function(d) { return d.id });
				// .data(this._newStreamData.clipPaths);

			splitData.enter().append("clipPath")
				.attr('id', d => "clip" + d.id)
				
			splitData.exit().remove();

			this._svgFilters.selectAll("clipPath")
				.html(d => "<path d=\"" + d.path + "\">")

		}

		_applyFilters() {
			// remove existing filter
			let filtersData = this._svgFilters.selectAll("filter")
				.data(this._filters);

			filtersData.enter().append("filter")
					.attr("id", (d, i) => "filter_" + i)
					.attr('width', '1000%')
					.attr('height', '1000%')
					.attr('x', '-500%')
					.attr('y', '-500%')

			filtersData.exit().remove();
			
			this._svgFilters.selectAll("filter").each(function (effects, i) {
				let html = "";
				for (let i = 0; i < effects.length; i++) {
					let d = effects[i];
					html += "<" + d.type + " dx='" + d.dx + "' dy='" + d.dy + "' stdDeviation='" + d.stdDeviation + "'/>";
				}
				this.innerHTML = html;
			});

			d3.selectAll('path.stream').attr("filter", "url(#filter_0)");
		}
		
		update() { this._update(true) }
        _update(manuallyTriggered = false) {
			if (!this._opts.automaticUpdate)
				if (!manuallyTriggered)
					return;

			this._normalizeData();
			this._applyOrdering();
			this._calculatePositions();

			//this._calculateStreamData();
			//this.render();

			this._newStreamData.calculatePaths();
			this.render2();
        }
        
        resize(width = this._container.clientWidth, height = this._container.clientHeight) {
			this._opts.width = width;
			this._opts.height = height;
			d3.select("svg").attr('width', width).attr('height', height);
			//this._svg.attr('width', width).attr('height', height);

			this._update();
		}
		
		separationY(callback, parameter) {
			this._separationYMethod = callback;
			this._opts.separationYValue = parameter / 2;
			this._update();
		}

		separationX(callback, parameter) {
			this._separationXMethod = callback;
			this._opts.separationXValue = parameter;
			this._update();
		}

		marginYFixed(node) {
			return this._opts.separationYValue;
		}

		marginYPercentage(node) {
			return (node.y1-node.y0) * this._opts.separationYValue;
		}

		marginYHierarchical(node) {
			return (node.depth + 1) * this._opts.separationYValue;
		}

		marginYHierarchicalReverse(node) {
			return 1 / (node.depth + 1) * this._opts.separationYValue;
		}

		marginXFixed(node) {
			return this._opts.separationXValue / 100;
		}

		marginXHierarchical(node) {
			return (node.depth + 1) / this._maxDepth * this._opts.separationXValue / 100;
		}

		marginXHierarchicalReverse(node) {
			return 1 / (node.depth + 1) * this._opts.separationXValue / 100;
		}

		setMinSizeThreshold(value) {
			this._opts.minSizeThreshold = value / 100;
			this._update();
		}

		setProportion(value) {
			this._opts.proportion = (value / 2) + 0.5; // map from 0-1 to 0.5-1
			this._newStreamData.proportion = value
			this._update();
		}

		setZoomTime(factor) {
			this._opts.zoomTimeFactor = factor;
			this._update();
		};

		startEndEncoding(encoding) {
			this._newStreamData.startEndEncoding = encoding;
			this._update();
		}

		startEndEncodingX(x) {
			this._newStreamData.startEndEncodingX = x;
			this._update();
		}

		startEndEncodingY(y) {
			this._newStreamData.startEndEncodingY = y;
			this._update();
		}

		offset(offset) {
			this._opts.offset = offset;
			this._update();
		}

		addSplits(splits) {
			this._newStreamData.addSplits(splits);
			this._update();
		}

		addSplitsAtTimepoints() {
			let splits = []
			for (let i = this._minTime; i <= this._maxTime; i++)
				splits.push(i);
			this.addSplits(splits);
		}

		addSplitsBetweenTimepoints() {
			let splits = []
			for (let i = this._minTime - 1; i <= this._maxTime; i++)
				splits.push(i + 0.5);
			this.addSplits(splits);
		}

		addSplitsRandomly(num = 1) {
			let t0 = this._minTime - 1;
			let t1 = this._maxTime + 1;
			let splits = [];
			for (let i = 0; i < num; i++) {
				let r = t0 + Math.random() * (t1-t0)
				splits.push(r.toString());
				splits.sort()
			}
			this.addSplits(splits);
		}

		removeSplits(splits) {
			this._newStreamData.removeSplits(splits);
			this._update();
		}

		getSplits() {
			return this._newStreamData.splits;
		}
	}

	d3.SecStream = (...args) => new SecStream(...args);
}