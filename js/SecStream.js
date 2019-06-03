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
				proportion: 1,
				unifySize: false,
				unifyPosition: false,
				nodeSizeAddX: 1,
				drawStroke: false,
				showLabels: false,
                mirror: false,
                splitRoot: false,
                offset: "silhouette", // zero, expand, silhouette
                
                ...opts // overwrite default settings with user settings
            };

            this._name = container.id
			this._container = container;
            this._id = "id";
            this._layout;
			this._data;
			this._pathContainer;
			this._textContainer;
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
            this._treemapSpace;

			this._separationXMethod = this.marginXFixed;
			this._separationYMethod = this.marginYFixed;

			this._color = d3.scaleSequential(d3.interpolateBlues);
			this._colorRandom = false;

            this._init();
        }
        
        static get a(){}

        data(d) { return d == null ? this._data : (this._setData(d), this); }
		
		filters(d) { return d == null ? this._filters : (this._setFilters(d), this); }

		options(opts) { Object.assign(this._opts, opts); }
		
		set automaticUpdate(auto) { this._opts.automaticUpdate = auto; }
		set unifySize(unify) { this._opts.unifySize = unify; this._update() }
		set nodeSizeAddX(x) { this._opts.nodeSizeAddX = x; this._update() }
		set unifyPosition(unify) { this._opts.unifyPosition = unify; this._update() }
		set mirror(mirror) { this._opts.mirror = mirror; this._update() }
		set splitRoot(splitRoot) { this._opts.splitRoot = splitRoot; this._update() }
		set color(colorFunction) { this._color = colorFunction; this.render() }
		set colorRandom(random) { this._colorRandom = random; this.render() }

        _setData(d) {
			if (!d || (typeof d !== "object")) return console.log(`ERROR: Added data "${d}" is not an object.`);
			this._data = d;

			let initSizesAndPositions = (node) => {
				node.dataSize = +node.size;
				node.dataPos = +node.pos;
				if (!!node.children)
					node.children.forEach(initSizesAndPositions);
			}

			this._data.timesteps.forEach((d) => {
				initSizesAndPositions(d.tree);
				this._checkData(d.tree);
			})
			
			this._pathContainer.selectAll('path.stream')
				.data([]).exit().remove();
			this._textContainer.selectAll('text')
				.data([]).exit().remove();

			this._update();
		}

		_checkData(node) {
			// check if size of parent elements is bigger than the aggregate of the sizes of its children
			let aggregate = 0;
			let pos = 0;
			if (!!node.children) {
				for (let child of node.children) {
					this._checkData(child);
					aggregate = child.size;
					if (child.pos >= 0) {
						if(pos > child.pos) {
							console.log("Error: Children positions overlap each other.")
							console.log(node);
						}
						pos = child.pos + child.size;
					}
				}
			}
			
			if (!!node.size && node.size < aggregate) {
				console.log("Error: Node has a smaller size than its children.")
				console.log(node);
			}
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
					this._textContainer.attr('transform', d3.event.transform);
				}));
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
		}

		_normalizeData() {
			// if node does not have a size, set it's size to the sum of the sizes of its children
			// if a node does not have a size and does not have children, give it size 1


			let checkSizes = (node) => {
				if (!!node.children && node.children.length > 0) {
					node.aggregate = 0;
					for (let child of node.children) {
						checkSizes(child);
						node.aggregate += child.size;
					}
					if (this._opts.unifySize || Number.isNaN(node.dataSize))
						node.size = node.aggregate + this._opts.nodeSizeAddX;
					else
						node.size = node.dataSize;				
				}
				else {
					if (this._opts.unifySize || Number.isNaN(node.dataSize))
						node.size = 1;
					else
						node.size = node.dataSize;
				}
			}

			// positions must be unified, if sizes are unified
			let checkPositions = (node, pos = 0) => {
                if (this._opts.unifySize || this._opts.unifyPosition
                    || Number.isNaN(node.dataPos)
                    || (!!node.parent && node.parent.id == 'fakeRoot'))
					node.pos = pos;
				else
					node.pos = node.dataPos;
					
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
				minTime = Math.min(minTime, +i);
				maxTime = Math.max(maxTime, +i);
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

					if (this._opts.splitRoot)
						node.marginX = this._separationXMethod(node);
					else
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
                        // normalize
                        node.rpos = (node.pos - node.parent.pos) / node.parent.size;
                        node.rsize = node.size / node.parent.size;
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
				time[i].tree.x = +i;
				traverse(time[i].tree);
			}

			this._newStreamData.xScale = d3.scaleLinear()
				.domain([this._minTime - 0.5, this._maxTime + 0.5])
				//.domain([this._minTime - 0.5*(1-this._opts.proportion), this._maxTime + 0.5*(1-this._opts.proportion)])
				.range([margin.left, width * this._opts.zoomTimeFactor - margin.right]);

			let domain = this._opts.mirror ? [1, 0] : [0, 1];
			this._newStreamData.yScale = d3.scaleLinear()
				.domain(domain).nice()
				.range([height - margin.bottom, margin.top]);
				//.range(margin.top, height - margin.bottom);
		}

		render() {
			let color = this._colorRandom ? getRandomColor : this._color.domain([this._maxDepth, 0]);
			
			let onMouseOver = (d) => {
				console.log("id: " + d.id);
				console.log(d.data);
			}
			let onMouseOut = (d) => {
				//console.log("mouse out")
            }
            
            let streamsByDepth = d3.nest().key(d => d.depth).entries(this._newStreamData.streams);

            let depthLayers = this._pathContainer.selectAll('g.depthLayer')
                .data(streamsByDepth);

            depthLayers.exit().remove();

            depthLayers.enter().append('g')
                .classed('depthLayer', true)
                .each(function(d) {
                    this.classList.add('depth-' + d.key);
                });


            let streams = depthLayers.selectAll('path.stream')
                .data(d => d.values, d => d.id);


			//let streams = this._pathContainer.selectAll('path.stream')
			//	.data(this._newStreamData.streams, d => d.id);

			streams.enter().append('path')
				.classed('stream', true)
				.on("mouseover", onMouseOver)
				.on("mouseout", onMouseOut)
				.attr('clip-path', d => 'url(#clip' + d.id + this._name +')')
				.attr('id', d => 'stream' + d.id + this._name)
				//.attr('shape-rendering', 'geometricPrecision')
				//.attr('shape-rendering', 'optimizeSpeed')
				//.attr('paint-order', 'stroke')
				//.attr('stroke-width', 3)
				.merge(streams)
					.attr('d', d => d.path)
					.style('fill', d => color(d.deepestDepth))
			
			streams.exit().remove();

			this.showLabels(this._opts.showLabels);
			this.drawStroke(this._opts.drawStroke);

			let splitData = this._svgFilters.selectAll("clipPath")
				.data(this._newStreamData.clipPaths, function(d) { return d.id });

			splitData.enter().append("clipPath")
				.attr('id', d => "clip" + d.id + this._name)
				.merge(splitData)
					.html(d => "<path d=\"" + d.path + "\">")
				
			splitData.exit().remove();
		}

		showLabels(show = true) {
			this._opts.showLabels = show;
			let labelData = this._opts.showLabels ? this._newStreamData.streams : [];

			let labels = this._textContainer.selectAll('text')
				.data(labelData, function(d) { return d.id });

			labels.enter().append('text')
				.text(d => !!d.data ? d.data.typeLabel : d.id)
				.merge(labels)
					.attr('x', d => d.textPos.x)
					.attr('y', d => d.textPos.y)
			
			labels.exit().remove();
		}
		
		drawStroke(draw = true) {
			this._opts.drawStroke = draw;
			let color = this._opts.drawStroke ? 'black' : null;
			this._pathContainer.style('stroke', color)
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

			this._pathContainer.selectAll('g.depthLayer').attr("filter", "url(#filter_0)");
		}
		
		update() { this._update(true) }
        _update(manuallyTriggered = false) {
            if (!this._data)
                return;

			if (!this._opts.automaticUpdate)
				if (!manuallyTriggered)
					return;

			this._normalizeData();
			this._applyOrdering();
			this._calculatePositions();

			this._newStreamData.calculatePaths();
			this.render();
        }
        
        resize(width = this._container.clientWidth, height = this._container.clientHeight) {
			this._opts.width = width;
			this._opts.height = height;
			this._svg.attr('width', width).attr('height', height);

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
			return this._opts.separationXValue / 10;
		}

        // TODO: use the max depth at that timepoint instead
		marginXHierarchical(node) {
			return (node.depth+1) / this._maxDepth * this._opts.separationXValue;
		}

		marginXHierarchicalReverse(node) {
			return 1 / (node.depth+1) * this._opts.separationXValue;
		}

		setMinSizeThreshold(value) {
			this._opts.minSizeThreshold = value / 100;
			this._update();
		}

		setProportion(value) {
			this._opts.proportion = +value;
			this._newStreamData.proportion = +value
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