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
	class Stream {
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
		constructor(timesteps) {
			this._timesteps = timesteps;
		}
	
		get streams() { return this._streams; }

		data(d) { return d == null ? this._timesteps : (this.add(d), this); }

		add(d) {
			if (!d || (typeof d !== "object")) return console.log(`ERROR: Added data "${d}" is not an object.`);
			
			if (!!d.id)
				this._addObject(d);
			else if (Array.isArray(d))
				d.forEach(n => this._addObject(n));
			else // object of objects
				for (n in d) this._addObject(n)

			this._update();
		}

		_addObject(d) {
			this._timesteps.push(d);
		}

		_update() {

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
			
			this._streamData;
			this._maxTime;
			this._maxValue;
			this._maxDepth = 0;

			this._minSizeThreshold = 0;
			this._separationXMethod = this.marginXFixed;
			this._separationXValue = 0;
			this._separationYMethod = this.marginYFixed;
			this._separationYValue = 0;
			this._minSizeThreshold = 0;
			this._proportion = 0.99;
			
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
					.attr('transform', "translate(" + margin.left + "," + margin.top + ")");

					
			this._svgFilters = d3.select('svg').append('defs');
			this._pathContainer = this._svg.append('g').classed('pathContainer', true);
        }

		_applyOrdering() {
			// change the order of siblings in the data for less edge crossings

			// TEST: RANDOM ORDER OF LEAF NODES

		}

		_normalizeData() {
			let t = this._data.timesteps;
			let maxSize = 0;
			for (let i = 0; i < t.length - 1; i++)
				maxSize = Math.max(maxSize, t[i].tree.size);
			
			this._maxTime = this._data.timesteps.length;
			this._maxValue = maxSize;
			
			let traverse = (node, depth) => {
				this._maxDepth = Math.max(this._maxDepth, depth);
				node.depth = depth++;
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

			for (let i = 0; i < t.length; i++)
				traverse(t[i].tree, 0);
		}

		_calculatePositions() {
			let t = this._data.timesteps;

			let traverse = (node, nChild = 0) => {
				if (!node.parent) {
					node.y0 = 0;
					node.y1 = node.size;
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
						if ((size / this._maxValue) <= this._minSizeThreshold) {
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
						if (0 >= (-node.marginX + node.x) - (node.prev.marginX + node.prev.x))
							stream.path = [[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
						else
							stream.path = [
								[node.prev.marginX + node.prev.x, node.prev.y0, node.prev.y1],
								[node.prev.marginX + prop * node.prev.x + (1-prop) * node.x, node.prev.y0, node.prev.y1],
								[-node.marginX + (1-prop) * node.prev.x + prop * node.x, node.y0, node.y1],
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
						let mid = (node.y0 + node.y1) /2;
						if (p.prev.y1 >= mid)
							pos = mid;
						else {
							/*let p = 0.75;
							pos = p * p.prev.y1 + (1-p) * node.parent.y1;
							pos = node.y0;
							pos = (p.prev.y1 + node.y0) /2;
							*/
							pos = p.prev.y1;
						}
						if (0 >= (-node.marginX + node.x) - (p.prev.marginX + p.prev.x))
							stream.path = [[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
						else
							stream.path = [
								[p.prev.marginX + p.prev.x, pos, pos],
								[p.prev.marginX + prop * p.prev.x + (1-prop) * node.x, pos, pos],
								[-node.marginX + (1-prop) * p.prev.x + prop * node.x, node.y0, node.y1],
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
					if (p.next.y1 >= mid)
						pos = mid;
					else {
						pos = p.next.y1;
					}
				
					if (0 >= (-p.next.marginX + p.next.x) - (node.marginX + node.x))
						stream.path = [[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
					else
						stream.path = [
							[node.marginX + node.x, node.y0, node.y1],
							[node.marginX + prop * node.x + (1-prop) * p.next.x, node.y0, node.y1],
							[-p.next.marginX + (1-prop) * node.x + prop * p.next.x, pos, pos],
							[-p.next.marginX + p.next.x, pos, pos]
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
				.domain([0, this._maxValue]).nice()
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
					.attr('d', (d,i) => area(d.path,i))
					.style('fill', d => color(d.depth))
					//.each((d) => console.log (d))

				streams.exit().remove();
			});

			let streams = d3.selectAll('path.stream')
				.attr('d', (d,i) => area(d.path,i))

			return this;
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
			this.render();
        }
        
        resize(width, height) {
			this._opts.width = width;
			this._opts.height = height;
			d3.select("svg").attr('width', width).attr('height', height);
			this.render();
		}
		
		separationY(callback, parameter) {
			this._separationYMethod = callback;
			this._separationYValue = parameter;
			this._update();
		}

		separationX(callback, parameter) {
			this._separationXMethod = callback;
			this._separationXValue = parameter;
			this._update();
		}

		marginYFixed(node) {
			return this._separationYValue / 100 * this._maxValue;
		}

		marginYPercentage(node) {
			return (node.y1-node.y0) * this._separationYValue / 100;
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
	}

	d3.SecStream = (...args) => new SecStream(...args);
}