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
				
			let area = d3.area()
				.x(d => xScale(d[0]))
				.y0(d => yScale(d[1]))
				.y1(d => yScale(d[2]));
			
			// insert new layers
			this._pathContainer.selectAll('g')
				.data(this._streamData)
				.enter().append('g')
					.classed('layer', true);

			let layers = this._pathContainer.selectAll('g')

			layers.each(function (layer)  {
				d3.select(this).selectAll('path.stream')
				.data(layer)
				.enter().append('path')
					.classed('stream', true)
					.attr('d', area)
					.style('fill', getRandomColor())
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
						node.y0 = node.parent.y0 + node.pos / maxSize;
						let size = (node.size / maxSize - node.parent.margin)
						node.y1 = (size > 0) ? node.y0 + size : node.y0;
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
					if (!this._streamData[node.depth])
						this._streamData[node.depth] = [];
						
					if (!!node.origin)
						stream = [
							[i-1, node.origin.y0, node.origin.y1],
							[i, node.y0, node.y1]
						];
					else
						stream = [
							[i-1, 0, 0],
							[i-1, node.y0, node.y1]
						];
						/*
					if (node.origin)
						stream = {
							path: [
								[i-1, node.origin.y0, node.origin.y1],
								[i, node.y0, node.y1]
							]
						};
					else
						stream = {
							path: [
								[i-1, 0, 0],
								[i-1, node.y0, node.y1]
							]
						};
						*/

					/*
					if (node.origin)
						stream = {
							t: i-1,
							y0: [ node.origin.y0, node.y0 ],
							y1: [ node.origin.y1, node.y1 ]
						};
					else
						stream = {
							t: i-1,
							y0: [ 0, node.y0 ],
							y1: [ 0, node.y1 ]
						};
						*/

					this._streamData[node.depth].push(stream);
				}
				// TODO: handle deleted nodes (make them 0)
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