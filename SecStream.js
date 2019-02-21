class svgPath {
	constructor() {
		this._path = "";
	}

	get() { return this._path; }

	move(x,y) {
		this._path += "M " + x + " " + y + " ";
	}
	
	moveD(dx,dy) {
		this._path += "m " + dx + " " + dy + " ";
	}

	line(x,y) {
		this._path += "L " + x + " " + y + " ";
	}

	lineD(dx,dy) {
		this._path += "l " + dx + " " + dy + " ";
	}

	horizontal(x) {
		this._path += "H " + x + " ";
	}

	horizontalD(dx) {
		this._path += "h " + dx + " ";
	}

	vertical(y) {
		this._path += "V " + y + " ";
	}

	verticalD(dy) {
		this._path += "v " + dy + " ";
	}

	bezier(x1, y1, x2, y2, x, y) {
		this._path += "C " + x1 + " " + y1 + ", " + x2 + " " + y2 + ", " + x + " " + y + " ";
	}

	bezierD(dx1, dy1, dx2, dy2, dx, dy) {
		this._path += "c " + dx1 + " " + dy1 + ", " + dx2 + " " + dy2 + ", " + dx + " " + dy + " ";
	}

	arc(rx, ry, rot, largeArcFlag, sweepFlag, x, y) {
		this._path += "A "  + rx + " "  + ry + " "  + rot + " "  + largeArcFlag + " "  + sweepFlag + " "  + x + " "  + y + " ";
	}

	close() {
		this._path += "Z"
	}
}

class SecStreamData {
	/*
	// drawing order
	streamdata = [
		// layer0:
			[
				// stream0:
				{ 
					uid,
					path: [
						// x, y0, y1
						[0, 0, 20],
						[1, 0, 25]
					]
				}
			],
		// layer1 :
			[
				{ uid, t: 0, y0: [5,7], y1: [3,15] }
			]
		}
	]
	
	*/
}

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
	
	class StreamData {
		// array of streams
		// every stream has a unique ID
		// every stream contains references to all nodes which belong to that stream


		// if parent never changes, draw stream after parent
		// if parent changes, draw after both parents.
		// if special case, split path in 2 and draw before and after
		constructor() {
			this._streamNodes = [];
			this._streams = [];
			this._xScale = d => d;
			this._yScale = d => d;

			this._xCurve = "bezier";
			this._startEnd = {
				encoding: "plug", // circle, plug, default
				x: 0.85,
				y: 0
			};
		}
	
		get streams() { return this._streams; }

		set xScale(callback) {
			this._xScale = callback;
		}

		set yScale(callback) {
			this._yScale = callback;
		}

		set startEndEncoding(encoding) {
			this._startEnd.encoding = encoding;
		}
		set startEndEncodingX(x) {
			this._startEnd.x = x;
		}
		set startEndEncodingY(y) {
			this._startEnd.y = y;
		}

		add(node) {
			this._streamNodes.push(node);
		}

		clear() {
			this._streamNodes = [];
			this._streams = [];
		}

		_checkForNullStreams() {
			for (let i = 0; i < this._streamNodes.length; i++) {
				let isNull = true;

				let traverse = (node) => {
					if ((node.y1 - node.y0) > 0) {
						isNull = false;
						return;
					}

					for(let child of node.next)
						traverse(child);
				}

				traverse(this._streamNodes[i]);

				if (isNull)
					delete this._streamNodes[i];//delete stream;
			}
		}

		calculatePaths() {
			//this._checkForNullStreams();

			let x = this._xScale;
			let y = this._yScale;

			for(let stream of this._streamNodes) {
				let queue = [];
				let d = new svgPath();

				let drawStart = (node) => {
					if (this._startEnd.encoding == "circle")
						return drawStartCircle(node);

					if (this._startEnd.encoding == "plug")
						return drawStartPlug(node);

					return drawStartDefault(node);
				}

				let drawEnd = (node) => {
					if (this._startEnd.encoding == "circle")
						return drawEndCircle(node);

					if (this._startEnd.encoding == "plug")
						return drawEndPlug(node);
					
					return drawEndDefault(node);
				}


				let drawStartDefault = (node) => { // insert node
					// find position to insert node
					let pos;
					// find an ancestor who existed in the previous timestep
					let p = node;
					while(!!p && !p.prev)
						p = p.parent;

					if (!p || !p.prev)
						return false;

					// try to use the center of the stream as beginning
					// if the previous node was not big enough to have this mid point, use the outside of the previous node
					let mid = 0.5 * (p.y0 + p.y1);
					if ((p.prev[0].y0 <= mid) && (p.prev[p.prev.length-1].y1 >= mid))
						pos = mid;
					else {
						/*let p = 0.75;
						pos = p * p.prev[0].y1 + (1-p) * node.parent.y1;
						pos = node.y0;
						pos = (p.prev[0].y1 + node.y0) /2;
						*/

						// choose closest side of the ancestor
						if ((p.prev[p.prev.length-1].y1 - mid) < Math.abs(p.prev[0].y0 - mid))
							pos = p.prev[p.prev.length-1].y1;
						else
							pos = p.prev[0].y0;
					}

					d.move(x(node.x), y(node.y1));
					if (this._xCurve == "linear") {
						d.line(x(p.prev[0].x), y(pos));
						d.line(x(node.x), y(node.y0))
					}
					else if (this._xCurve == "bezier") {
						d.bezier(x(0.5 * (p.prev[0].x + node.x)), y(node.y1),
								x(0.5 * (p.prev[0].x + node.x)), y(pos),
								x(p.prev[0].x), y(pos));
						d.bezier(x(0.5 * (p.prev[0].x + node.x)), y(pos),
								x(0.5 * (p.prev[0].x + node.x)), y(node.y0),
								x(node.x), y(node.y0));
					}
					return true;
				};

				let drawEndDefault = (node) => {
					// find position to delete node to
					let pos;
					// find an ancestor who exists in the next timestep
					let p = node;
					while(!!p && !p.next)
						p = p.parent;

					if (!p || !p.next) {
						d.line(x(node.x), y(node.y1))
						return;
					}

					// try to use the center of the stream as ending
					// if the previous node was not big enough to have this mid point, use the outside of the previous node
					let mid = 0.5 * (p.y0 + p.y1);
					if ((p.next[0].y0 <= mid) && (p.next[p.next.length-1].y1 >= mid))
						pos = mid;
					else {
						// choose closest side of the ancestor
						if ((p.next[p.next.length-1].y1 - mid) < Math.abs(p.next[0].y0 - mid))
							pos = p.next[p.next.length-1].y1;
						else
							pos = p.next[0].y0;
					}

					d.move(x(node.x), y(node.y1));
					if (this._xCurve == "linear") {
						d.line(x(p.next[0].x), y(pos));
						d.line(x(node.x), y(node.y0))
					}
					else if (this._xCurve == "bezier") {
						d.bezier(x(0.5 * (p.next[0].x + node.x)), y(node.y1),
								x(0.5 * (p.next[0].x + node.x)), y(pos),
								x(p.next[0].x), y(pos));
						d.bezier(x(0.5 * (p.next[0].x + node.x)), y(pos),
								x(0.5 * (p.next[0].x + node.x)), y(node.y0),
								x(node.x), y(node.y0));
					}
				};

				let drawStartCircle = (node) => {
					let height = node.y1 - node.y0;
					d.move(x(node.x), y(node.y1));
					//d.arc(Math.log(height), 1, 0, 0, 0, x(node.x), y(node.y0));
					d.arc(1, 1, 0, 0, 0, x(node.x), y(node.y0));

					return true;
				};

				let drawEndCircle = (node) => {
					let height = node.y1 - node.y0;
					//d.arc(Math.log(height), 1, 0, 0, 0, x(node.x), y(node.y1));
					d.arc(1, 1, 0, 0, 0, x(node.x), y(node.y1));

					return true;
				};

				let drawStartPlug = (node) => {
					d.move(x(node.x), y(node.y1));
					let height = node.y1 - node.y0;
					d.bezier(x(node.x - this._startEnd.x * height), y(node.y1 + this._startEnd.y * height),
							 x(node.x - this._startEnd.x * height), y(node.y0 - this._startEnd.y * height), 
							 x(node.x), y(node.y0));
					return true;
				};

				let drawEndPlug = (node) => {
					let height = node.y1 - node.y0;
					d.bezier(x(node.x + this._startEnd.x * height), y(node.y0 - this._startEnd.y * height),
							 x(node.x + this._startEnd.x * height), y(node.y1 + this._startEnd.y * height), 
							 x(node.x), y(node.y1));
					return true;
				};

				let traverse = (node, branch = 0) => {
					// draw bottom line (forwards)
					if (!!node.prev) {
						if (this._xCurve == "linear")
							d.line(x(node.x), y(node.y0))
						else if (this._xCurve == "bezier") {
								d.bezier(x(0.5 * (node.prev[0].x + node.x)), y(node.prev[0].y0),
										x(0.5 * (node.prev[0].x + node.x)), y(node.y0),
										x(node.x), y(node.y0));
						}
					}

					if (!!node.next) {
						// traverse through children
						for (let i = 0; i < node.next.length; i++) {
							traverse(node.next[i], branch + i);
						}
						// draw top line (backwards)
						if (this._xCurve == "linear")
							d.line(x(node.x), y(node.y1))
						else if (this._xCurve == "bezier") {
							let lastChild = node.next[node.next.length-1];
							d.bezier(x(0.5 * (lastChild.x + node.x)), y(lastChild.y1),
								x(0.5 * (lastChild.x + node.x)), y(node.y1),
								x(node.x), y(node.y1));
						}
					}
					else // end stream
						drawEnd(node);
				};

				if (!drawStart(stream))
					d.move(x(stream.x), y(stream.y0));
				traverse(stream);

				//d.close();
				//console.log(d.get());

				this._streams.push({
					path: d.get(),
					depth: stream.depth
				});
			}

			this._streams.sort((a,b) => (a.depth < b.depth) ? -1 : 1)
		}
	}

	class SecStream {
		constructor(container, opts = {})
        {
			this._opts = {
				animDuration: 1000,
				margin: { top: 20, right: 20, bottom: 20, left: 20 },
				height: 600,
				width: 1000
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
			
			this._newStreamData = new StreamData();
			this._streamData;
			this._maxTime;
			this._maxValue;
			this._maxDepth = 0;
			this._indices = {};
			this._maxIndex = 0;

			this._minSizeThreshold = 0;
			this._separationXMethod = this.marginXFixed;
			this._separationXValue = 0;
			this._separationYMethod = this.marginYFixed;
			this._separationYValue = 0;
			this._minSizeThreshold = 0;
			this._proportion = 0.99;
			
			this._offset = "zero"; // zero, expand
			
			this._streamline = d3.area()
				.x(d => d[0])
				.y0(d => d[1])
				.y1(d => d[2]);

            this._init();
        }
        
        static get a(){}

        data(d) { return d == null ? this._data : (this._setData(d), this); }
		
		filters(d) { return d == null ? this._filters : (this._setFilters(d), this); }

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
                //.on("contextmenu", () => d3.event.preventDefault());
                .append('g')
					.attr('id', 'svg-drawn')
					//.attr('transform', "translate(" + margin.left + "," + margin.top + ")");

					
			this._svgFilters = d3.select('svg').append('defs');
			this._pathContainer = this._svg.append('g').classed('pathContainer', true);
        }

		_applyOrdering() {
			// change the order of siblings in the data for less edge crossings

			// TEST: RANDOM ORDER OF LEAF NODES

		}

		// returns if node builds a new stream
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

		_normalizeData() {
			this._newStreamData.clear();
			let t = this._data.timesteps;
			let maxValue = 0;
			for (let i = 0; i < t.length; i++)
				maxValue = Math.max(maxValue, t[i].tree.size);
			
			this._maxTime = this._data.timesteps.length - 1;
			this._maxValue = maxValue;
			
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
				
				node.children.forEach( (child) => traverse(child, depth));
			}

			for (let i = 0; i < t.length; i++) {
				traverse(t[i].tree, 0);
			}
		}

		_calculatePositions() {
			let t = this._data.timesteps;

			let traverse = (node, nChild = 0) => {
				if (!node.parent) {
					node.y0 = 0;

					if (this._offset == "zero")
						node.y1 = node.size / this._maxValue;
					else if (this._offset == "expand")
						node.y1 = 1;

					node.marginX = 0;
					node.marginY = this._separationYMethod(node);
				}
				else {
					node.x = node.parent.x;
					let pSize = node.parent.y1 - node.parent.y0 - 2*node.parent.marginY;
					if (pSize <= 0) {
						node.y0 = 0.5 * (node.parent.y0 + node.parent.y1);
						node.y1 = 0.5 * (node.parent.y0 + node.parent.y1);
					} else {
						node.y0 = node.parent.y0 + node.parent.marginY + pSize * node.rpos;
						node.y1 = node.y0 + pSize * node.rsize;

						let size = node.y1 - node.y0;
						if ((size) <= this._minSizeThreshold) {
							node.y0 = 0.5 * (node.parent.y0 + node.parent.y1);
							node.y1 = 0.5 * (node.parent.y0 + node.parent.y1);
						}
					}

					node.marginX = node.parent.marginX + this._separationXMethod(node);
					node.marginY = this._separationYMethod(node);
				}

				node.children.forEach( (child) => traverse(child, nChild++));
			}

			for (let i = 0; i < t.length; i++)
			{
				t[i].tree.x = i;
				traverse(t[i].tree);
			}

			this._newStreamData.xScale = d3.scaleLinear()
				.domain([0, this._maxTime]).nice()
				.range([this._opts.margin.left, this._opts.width - this._opts.margin.right]);

			this._newStreamData.yScale = d3.scaleLinear()
				.domain([0, 1]).nice()
				.range([this._opts.height - this._opts.margin.bottom, this._opts.margin.top]);
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
			
			let streams = this._pathContainer.selectAll('path.stream')
				.data(this._newStreamData.streams, d => d.streamId);

			streams.enter().append('path')
				.classed('stream', true)
				.style('fill', d => color(d.depth))
			
			streams.exit().remove();

			d3.selectAll('path.stream')
				.attr('d', d => d.path);
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
		
        _update() {
			this._normalizeData();
			this._applyOrdering();
			this._calculatePositions();

			this._calculateStreamData();
			//this.render();

			this._newStreamData.calculatePaths();
			this.render2();
        }
        
        resize(width, height) {
			this._opts.width = width;
			this._opts.height = height;
			d3.select("svg").attr('width', width).attr('height', height);
			this.render2();
		}
		
		separationY(callback, parameter) {
			this._separationYMethod = callback;
			this._separationYValue = parameter / 2;
			this._update();
		}

		separationX(callback, parameter) {
			this._separationXMethod = callback;
			this._separationXValue = parameter;
			this._update();
		}

		marginYFixed(node) {
			return this._separationYValue;
		}

		marginYPercentage(node) {
			return (node.y1-node.y0) * this._separationYValue;
		}

		marginYHierarchical(node) {
			return (node.depth + 1) * this._separationYValue;
		}

		marginYHierarchicalReverse(node) {
			return 1 / (node.depth + 1) * this._separationYValue;
		}

		marginXFixed(node) {
			return this._separationXValue / 100;
		}

		marginXHierarchical(node) {
			return (node.depth + 1) / this._maxDepth * this._separationXValue / 100;
		}

		marginXHierarchicalReverse(node) {
			return 1 / (node.depth + 1) * this._separationXValue / 100;
		}

		setMinSizeThreshold(value) {
			this._minSizeThreshold = value / 100;
			this._update();
		}

		setProportion(value) {
			this._proportion = (value / 2) + 0.5; // map from 0-1 to 0.5-1
			this._update();
		}

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
			this._offset = offset;
			this._update();
		}
	}

	d3.SecStream = (...args) => new SecStream(...args);
}