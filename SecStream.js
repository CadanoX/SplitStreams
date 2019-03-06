class svgPath {
	constructor() {
		this._path = "";
		this._x;
		this._y;
	}

	_pathWillChange(x, y) {
		if (Number.isNaN(x) || Number.isNaN(y))
			;//debugger;
		if (x !== this._x || y !== this._y) {
			this._x = x;
			this._y = y;
			return true;
		}
		return false;
	}

	get() { return this._path; }

	move(x,y) {
		if (this._pathWillChange(x, y))
			this._path += "M " + x + " " + y + " ";
	}
	
	moveD(dx,dy) {
		if (this._pathWillChange(this._x + dx, this._y + dy))
			this._path += "m " + dx + " " + dy + " ";
	}

	line(x,y) {
		if (this._pathWillChange(x, y))
			this._path += "L " + x + " " + y + " ";
	}

	lineD(dx,dy) {
		if (this._pathWillChange(this._x + dx, this._y + dy))
			this._path += "l " + dx + " " + dy + " ";
	}

	horizontal(x) {
		if (this._pathWillChange(x, this._y))
			this._path += "H " + x + " ";
	}

	horizontalD(dx) {
		if (this._pathWillChange(this._x + dx, this._y))
			this._path += "h " + dx + " ";
	}

	vertical(y) {
		if (this._pathWillChange(this._x, y))
			this._path += "V " + y + " ";
	}

	verticalD(dy) {
		if (this._pathWillChange(this._x, this._y + dy))
			this._path += "v " + dy + " ";
	}

	bezier(x1, y1, x2, y2, x, y) {
		if (this._pathWillChange(x, y))
			this._path += "C " + x1 + " " + y1 + ", " + x2 + " " + y2 + ", " + x + " " + y + " ";
	}

	bezierD(dx1, dy1, dx2, dy2, dx, dy) {
		if (this._pathWillChange(this._x + dx, this._y + dy))
			this._path += "c " + dx1 + " " + dy1 + ", " + dx2 + " " + dy2 + ", " + dx + " " + dy + " ";
	
	}

	arc(rx, ry, rot, largeArcFlag, sweepFlag, x, y) {
		if (this._pathWillChange(x, y))
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
			this._splits = {};
			this._xScale = d => d;
			this._yScale = d => d;
			this._proportion = 1;

			this._xCurve = "bezier"; // linear, bezier
			this._startEnd = {
				encoding: "plug", // circle, plug, default
				x: 0.85,
				y: 0
			};
		}
	
		get streams() { return this._streams; }
		get clipPaths() { return this._clipPaths; }
		get splits() { return  Object.keys(this._splits); }

		set xScale(callback) { this._xScale = callback; }
		set yScale(callback) { this._yScale = callback; }
		set startEndEncoding(encoding) { this._startEnd.encoding = encoding; }
		set startEndEncodingX(x) { this._startEnd.x = x; }
		set startEndEncodingY(y) { this._startEnd.y = y; }
		set proportion(p) { this._proportion = p; }

		add(node) {
			this._streamNodes.push(node);
		}

		addSplits(splits) {
			if(Array.isArray(splits))
				splits.forEach((d) => {
					this._splits[d] = true;
				})
			else
				this._splits[d] = true;
		}

		removeSplits(splits) {
			if (!splits)
				this._splits = {};
			else
				splits.forEach((d) => {
					this._splits[d].remove();
				})
		}

		//TODO: find more elaborate solution
		_findSplits(t0, t1) {
			let splits = [];
			for (let split in this._splits) {
				if (split >= t0 && split <= t1)
					splits.push(split);
			}
			return splits;
		}

		clear() {
			console.log('clear');
			this._streamNodes = [];
			this._streams = [];
			this._clipPaths = [];
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
					// extend to left
					d.move(x(node.x), y(node.y1));
					let t = node.x - 0.5*(1-prop);
					d.horizontal(x(t));

					// connect top and bottom
					let root = node;
					while(!!root.parent)
						root = root.parent
					if (!root.prev) {
						d.vertical(y(node.y0));
					}
					else {
						if (this._startEnd.encoding == "circle")
							drawStartCircle(node);
						else if (this._startEnd.encoding == "plug")
							drawStartPlug(node);
						else
							drawStartDefault(node);
					}

					// connect back
					d.horizontal(x(node.x));
				}

				let drawEnd = (node) => {
					// extend to right
					let t = node.x + 0.5*(1-prop);
					d.horizontal(x(t));

					// connect bottom and top
					let root = node;
					while(!!root.parent)
						root = root.parent
					if (!root.next) {
						d.vertical(y(node.y1));
					}
					else {
						if (this._startEnd.encoding == "circle")
							drawEndCircle(node);
						else if (this._startEnd.encoding == "plug")
							drawEndPlug(node);
						else
							drawEndDefault(node);
					}
					
					// connect back
					d.horizontal(x(node.x));
				}


				let drawStartDefault = (node) => { // insert node
					// find position to insert node
					let pos;
					// find the oldest parent of node, which does not exist in the previous step
					let parentNoPrev = node;
					while(!!parentNoPrev.parent && !parentNoPrev.parent.prev)
						parentNoPrev = parentNoPrev.parent;

					// p is an ancestor who existed in the previous timestep
					let p = parentNoPrev.parent;
					if (!p) {
						d.vertical(y(node.y0))
					}
					else {
						// use the center of the stream as reference point
						let mid = 0.5 * (parentNoPrev.y0 + parentNoPrev.y1);
						
						// if the nodes parent has multiple previous nodes, find the one closest to mid
						let refPrevId = -1;
						for (let n = 0; n < p.prev.length && refPrevId == -1; n++) {
							let prev = p.prev[n];
							// if mid lies within a prev node
							if (prev.y0 <= mid && prev.y1 >= mid) {
								// if node has children
								if (!!prev.children && prev.children.length > 0) {
									let refChildId = -1;// find two children to put the mid in between
									for (let i = 0; i < prev.children.length && refChildId == -1; i++) {
										let child = prev.children[i];
										if (mid <= 0.5 * (child.y0 + child.y1))
											refChildId = i; // setting ID breaks the loop
									}
									if (refChildId == 0) // before first child
										pos = 0.5 * (prev.y0 + prev.children[0].y0);
									else if (refChildId == -1) // after last child
										pos = 0.5 * (prev.y1 + prev.children[prev.children.length-1].y1);
									else
										pos = 0.5 * (prev.children[refChildId-1].y1 + prev.children[refChildId].y0);
								}
								else // node has no children
									pos = 0.5 * (prev.y0 + prev.y1);
								refPrevId = -2; // setting ID breaks the loop
							}
							// if it lies outside, find two nodes to put it inbetween
							else {
								if (mid <= 0.5 * (prev.y0 + prev.y1))
									refPrevId = i; // setting ID breaks the loop
							}
						}

						if (refPrevId != -2) { // if -2, then pos was already set
							let node; // define the node to draw inside
							let first; // boolean to define if it should be drawn before the first or after the last child
							if (refPrevId == 0) { // before first child
								node = p.prev[0];
								first = true;
							}
							else if (refPrevId == -1) { // after last child
								node = p.prev[p.prev.length-1];
								first = false;
							}
							else {
								// find which node is closer
								if (Math.abs(p.prev[refPrevId].y0 - mid) < Math.abs(p.prev[refPrevId-1].y1)) {
									node = p.prev[refPrevId];
									first = true;
								}
								else {
									node = p.prev[refPrevId-1];
									first = false;
								}
							}

							if (!!node.children && node.children.length > 0) {
								if (first)
									pos = 0.5 * (node.y0 + node.children[0].y0);
								else
									pos = 0.5 * (node.y1 + node.children[node.children.length-1].y1);
							}
							else
								pos = 0.5 * (node.y0 + node.y1);
						}

						let tdiff = node.x - p.prev[0].x;
						let t0 = node.x - 0.5 * (1-prop) * tdiff;
						let t1 = t0 - 0.5 * prop * tdiff;

						if (this._xCurve == "linear") {
							d.line(x(p.prev[0].x), y(pos));
							d.line(x(t0), y(node.y0))
						}
						else if (this._xCurve == "bezier") {
							d.bezier(x(t1), y(node.y1),
									x(t1), y(pos),
									x(p.prev[0].x), y(pos));
							d.bezier(x(t1), y(pos),
									x(t1), y(node.y0),
									x(t0), y(node.y0));
						}
					}
				};

				let drawEndDefault = (node) => {
					// find position to delete node to
					let pos;
					// find the oldest parent of node, which does not exist in the next step
					let parentNoNext = node;
					while(!!parentNoNext.parent && !parentNoNext.parent.next)
						parentNoNext = parentNoNext.parent; // p is the oldest parent of node, which does not exist in the next step

					// p is an ancestor who exists in the next timestep
					let p = parentNoNext.parent;
					if (!p) {
						d.vertical(y(node.y1))
					}
					else {
						// use the center of the stream as reference point
						let mid = 0.5 * (parentNoNext.y0 + parentNoNext.y1);
						// if the nodes parent has multiple next nodes, find the one closest to mid
						let refNextId = -1;
						for (let n = 0; n < p.next.length && refNextId == -1; n++) {
							let next = p.next[n];
							// if mid lies within a next node
							if (next.y0 <= mid && next.y1 >= mid) {
								// if node has children
								if (!!next.children && next.children.length > 0) {
									let refChildId = -1;// find two children to put the mid in between
									for (let i = 0; i < next.children.length && refChildId == -1; i++) {
										let child = next.children[i];
										if (mid <= 0.5 * (child.y0 + child.y1))
											refChildId = i; // setting ID breaks the loop
									}
									if (refChildId == 0) // before first child
										pos = 0.5 * (next.y0 + next.children[0].y0);
									else if (refChildId == -1) // after last child
										pos = 0.5 * (next.y1 + next.children[next.children.length-1].y1);
									else
										pos = 0.5 * (prev.children[refChildId-1].y1 + prev.children[refChildId].y0);
								}
								else // node has no children
									pos = 0.5 * (next.y0 + next.y1);
								refNextId = -2; // setting ID breaks the loop
							}
							// if it lies outside, find two nodes to put it inbetween
							else {
								if (mid <= 0.5 * (next.y0 + next.y1))
									refNextId = i; // setting ID breaks the loop
							}
						}

						if (refNextId != -2) { // if -2, then pos was already set
							let node; // define the node to draw inside
							let first; // boolean to define if it should be drawn before the first or after the last child
							if (refNextId == 0) { // before first child
								node = p.next[0];
								first = true;
							}
							else if (refNextId == -1) { // after last child
								node = p.next[p.next.length-1];
								first = false;
							}
							else {
								// find which node is closer
								if (Math.abs(p.next[refNextId].y0 - mid) < Math.abs(p.next[refNextId-1].y1)) {
									node = p.next[refNextId];
									first = true;
								}
								else {
									node = p.next[refNextId-1];
									first = false;
								}
							}

							if (!!node.children && node.children.length > 0) {
								if (first)
									pos = 0.5 * (node.y0 + node.children[0].y0);
								else
									pos = 0.5 * (node.y1 + node.children[node.children.length-1].y1);
							}
							else
								pos = 0.5 * (node.y0 + node.y1);
								
						}

						let tdiff = p.next[0].x - node.x;
						let t0 = node.x + 0.5 * (1-prop) * tdiff;
						let t1 = t0 + 0.5 * prop * tdiff;

						if (this._xCurve == "linear") {
							d.line(x(p.next[0].x), y(pos));
							d.line(x(t0), y(node.y1))
						}
						else if (this._xCurve == "bezier") {
							d.bezier(x(t1), y(node.y0),
									x(t1), y(pos),
									x(p.next[0].x), y(pos));
							d.bezier(x(t1), y(pos),
									x(t1), y(node.y1),
									x(t0), y(node.y1));
						}
					}
				};

				let drawStartCircle = (node) => {
					let height = node.y1 - node.y0;
					let t = node.x - 0.5*(1-prop);	
					d.move(x(t), y(node.y1));
					//d.arc(Math.log(height), 1, 0, 0, 0, x(node.x), y(node.y0));
					d.arc(prop, 1, 0, 0, 0, x(t), y(node.y0));
				};

				let drawEndCircle = (node) => {
					let height = node.y1 - node.y0;
					let t = node.x + 0.5*(1-prop);
					//d.arc(Math.log(height), 1, 0, 0, 0, x(node.x), y(node.y1));
					d.arc(prop, 1, 0, 0, 0, x(t), y(node.y1));
				};

				let drawStartPlug = (node) => {	
					let t = node.x - 0.5*(1-prop);				
					let height = node.y1 - node.y0;
					d.bezier(x(t - prop * this._startEnd.x * Math.sqrt(height)), y(node.y1 + this._startEnd.y * height),
							 x(t - prop * this._startEnd.x * Math.sqrt(height)), y(node.y0 - this._startEnd.y * height), 
							 x(t), y(node.y0));
				};

				let drawEndPlug = (node) => {
					let t = node.x + 0.5*(1-prop);
					let height = node.y1 - node.y0;
					d.bezier(x(t + prop * this._startEnd.x * Math.sqrt(height)), y(node.y0 - this._startEnd.y * height),
							 x(t + prop * this._startEnd.x * Math.sqrt(height)), y(node.y1 + this._startEnd.y * height), 
							 x(t), y(node.y1));
				};

				let prop = this._proportion;
				let lastTimepoint = 0;
				let traverse = (node) => {
					if (node.x > lastTimepoint)
						lastTimepoint = node.x;

					if (!!node.next) {
						let dt = node.next[0].x - node.x;
						let t0 = x(node.x);
						let t1 = x(node.x + 0.5 * (1-prop) * dt);
						let t2 = x(node.next[0].x - 0.5 * (1-prop) * dt);
						let t3 = x(node.next[0].x);
						let t12 = 0.5 * (t1 + t2) // mid between t0 and t1

						for (let i = 0; i < node.next.length; i++) {
							//let y0 = node.y0 + i * (node.y1 - node.y0) / node.next.length;
							//let y1 = node.y0 + (i+1) * (node.y1 - node.y0) / node.next.length;
							let y0 = node.y0;
							let y1 = node.y1;
							let dest = node.next[i];

							// draw bottom line (forwards)
							d.horizontal(t1);
							if (this._xCurve == "linear") {
								d.line(t2, y(dest.y0))
							}
							else if (this._xCurve == "bezier") {
								d.bezier(t12, y(y0),
											t12, y(node.next[i].y0),
											t2, y(node.next[i].y0));
							}
							d.horizontal(t3);

							// traverse
							traverse(dest);

							// draw top line (backwards)
							d.horizontal(t2);
							if (this._xCurve == "linear")
								d.line(t1, y(y1))
							else if (this._xCurve == "bezier") {
								d.bezier(t12, y(node.next[i].y1),
										t12, y(y1),
										t1, y(y1));
							}
							d.horizontal(t0);
						}
					}
					else // end stream
						drawEnd(node);
				};

				drawStart(stream)
				traverse(stream);

				// add splits

				//d.close();
				//console.log(d.get());


				let clipPath = new svgPath();
				let splits = this._findSplits(stream.x - 0.5, lastTimepoint + 0.5);

				let lastX = x(-1);
				for (let split of splits) {
					let x0 = x(Number(split) - 0.5 * stream.marginX);
					let x1 = x(Number(split) + 0.5 * stream.marginX);
					if (x0 - lastX > 0) {
						clipPath.move(lastX, y(0));
						clipPath.horizontal(x0);
						clipPath.vertical(y(1));
						clipPath.horizontal(lastX);
						clipPath.vertical(y(0));
					}
					lastX = x1;
				}
				clipPath.move(lastX, y(0));
				clipPath.horizontal(x(lastTimepoint+1));
				clipPath.vertical(y(1));
				clipPath.horizontal(lastX);
				clipPath.vertical(y(0));

				this._clipPaths[stream.streamId] = {
					id: stream.streamId,
					path: clipPath.get()
				}

				this._streams.push({
					path: d.get(),
					depth: stream.depth,
					id: stream.streamId,
					data: stream.data,
					clipPath: clipPath.get()
				});

			}
			this._clipPaths = this._streams.map(({id, clipPath}) => ({id, path: clipPath}));

			// TODO: apply an order in which children are drawn right
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
				width: 1000,
				automaticUpdate: true
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
			
			this._newStreamData = new StreamData();

			this._streamData;
			this._minTime;
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
			let checkSizes = function(node) {
				if (!node.size) {
					if (!!node.children) {
						let aggregate = 0;
						for (let child of node.children) {
							checkSizes(child);
							aggregate += child.size;
						}
						node.size = aggregate;
					}
					else {
						node.size = 1;
					}
				}
			}

			let checkPositions = function(node, pos = 0) {
				if (!!node.pos) {
					console.log("node positions are defined");
					return;
				}

				node.pos = pos;
				if (!!node.children) {
					for (let child of node.children) {
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
			let traverse = (node, childX = 0) => {
				let p = node.parent;
				if (!p) {
					node.y0 = 0;

					if (this._offset == "zero")
						node.y1 = node.size / this._maxValue;
					else if (this._offset == "expand")
						node.y1 = 1;

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
						if ((size) <= this._minSizeThreshold) {
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
			
			let onMouseOver = (d) => {
				console.log("id: " + d.id + " - ")
				console.log(d.data)
			}
			let onMouseOut = (d) => {
				console.log("mouse out")
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
			this._newStreamData.proportion = value
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