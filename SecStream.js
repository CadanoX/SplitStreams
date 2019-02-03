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
			
			this._streamData;
			this._maxTime;
			this._maxValue;
			
			
			this._streamline = d3.area()
				.x(d => d[0])
				.y0(d => d[1])
				.y1(d => d[2]);

            this._init();
        }
        
        static get a(){}

        data(d) { return d == null ? this._data : (this._setData(d), this); }
        

		render() {
			const { animDuration } = this._opts;
			let t = 0;
			let allStreams = [];

			
			
			let xScale = d3.scaleLinear()
				.domain([0, this._maxTime]).nice()
				.range([this._opts.margin.left, this._opts.width - this._opts.margin.right]);

			let yScale = d3.scaleLinear()
				.domain([0, 1]).nice()
				.range([this._opts.height - this._opts.margin.bottom, this._opts.margin.top]);
				
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
				.curve(d3.curveCatmullRomOpen)
			
			// insert new layers
			this._pathContainer.selectAll('g')
				.data(this._streamData)
				.enter().append('g')
					.classed('layer', true);

			let layers = this._pathContainer.selectAll('g')

			layers.each(function (layer, i)  {
				//console.log("Layer " + i);
				d3.select(this).selectAll('path.stream')
				.data(layer)
				.enter().append('path')
					.classed('stream', true)
					.attr('d', area)
					.style('fill', getRandomColor())
					//.each((d) => console.log (d))
			});

			let streams = d3.selectAll('path.stream')
			.attr('d', area)

			return this;
        }
        
        _setData(d) {
			if (!d || (typeof d !== "object")) return console.log(`ERROR: Added data "${d}" is not an object.`);
			this._data = d;
			this._applyOrdering();
			this._calculatePositions();
			this._calculateStreamData();
			this.render();

			this._update();
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

			this._pathContainer = this._svg.append('g').classed('pathContainer', true);
        }

		_applyOrdering() {
			// change the order of siblings in the data for less edge crossings
		}

		_traversePreOrder (node, callback, depth = 0) {
			callback(node, depth);
			node.children.forEach( (child) => this._traversePreOrder(child, callback, ++depth));
		}

		_calculatePositions() {
			let t = this._data.timesteps;
			let maxSize = 0;
			for (let i = 0; i < t.length - 1; i++)
				maxSize = Math.max(maxSize, t[i].tree.size);

			this._maxTime = this._data.timesteps.length;
			this._maxValue = maxSize;

			let margin = 0 / maxSize;

			for (let i = 0; i < t.length; i++) {
				this._traversePreOrder(t[i].tree, (node, depth) => {
					node.depth = depth;
					if (!node.parent) {
						node.y0 = 0;
						node.y1 = node.size / maxSize;
						node.margin = margin;
					}
					else {
						node.y0 = /* node.parent.y0 + */ node.pos / maxSize;
						let size = node.size / maxSize - node.parent.margin;
						if (size < 0) size = 0;
						node.y1 = node.y0 + size;
						node.margin = margin;
					}
				});
			}
		}

		_calculateStreamData() {
			this._streamData = [];
			let t = this._data.timesteps;
			for (let i = 1; i < t.length; i++) { // for all timesteps
				for (let n in t[i].references) { // for all nodes build stream to origin of node
					let node = t[i].references[n];
					let stream;
					//*
					if (!!node.origin) // move
						stream = [
							[i-2, node.origin.y0, node.origin.y1],
							[i-1, node.origin.y0, node.origin.y1],
							[i, node.y0, node.y1],
							[i+1, node.y0, node.y1]
						];
					else { // insert
						let pos;
						// if parent didnt exist in last step, use parents startpos
						// else if my center existed in the last step, use it, otherwise use parents origin y0/y1
						let p = node;
						do { p = p.parent }
						while(!p.origin);

						let o = p.origin;
						let mid = (node.y0 + node.y1) /2;
						if (o.y1 >= mid)
							pos = mid;
						else {
							let p = 0.75;
							pos = p * o.y1 + (1-p) * node.parent.y1;
							pos = node.y0;
							pos = (o.y1 + node.y0) /2;
							pos = o.y1;
						}
					
						stream = [
							[i-2, pos, pos],
							[i-1, pos, pos],
							[i, node.y0, node.y1],
							[i+1, node.y0, node.y1]
						];
					}

					if (!this._streamData[node.depth])
						this._streamData[node.depth] = [];
					this._streamData[node.depth].push(stream);
				}

				// make deleted nodes 0
				for (let n in t[i].deleted) {
					let node = t[i].deleted[n];
					let p = node;
					do { p = p.parent }
					while(!p.future);

					let pos;
					let f = p.future;
					let mid = (node.y0 + node.y1) /2;
					if (f.y1 >= mid)
						pos = mid;
					else {
						pos = f.y1;
					}
				
					let stream = [
						[i-2, node.y0, node.y1],
						[i-1, node.y0, node.y1],
						[i, pos, pos],
						[i+1, pos, pos]
					];

					// TODO: actually this depth should always exist, but it doesn't
					if (!this._streamData[node.depth])
						this._streamData[node.depth] = [];
					this._streamData[node.depth].push(stream);
				}
			}
		}

        _update() {
			
        }
        
        _myStreamLayout(d) {
            return d;
        }
        
        resize(width, height) {
			this._opts.width = width;
			this._opts.height = height;
			d3.select("svg").attr('width', width).attr('height', height);
			this.render();
        }
	}

	d3.SecStream = (...args) => new SecStream(...args);
}