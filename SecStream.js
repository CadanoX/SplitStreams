class SecStreamData {
	/*
	// drawing order
	layers = [
		{
			shape0,
			shape1,
			shape2
		},
		{
			shape3,
			shape4
		}
	]

	shapes = [
		{
			x0, x1, y0, y1;
			id: idx
		}
	]
	
	*/
}

//const d3 = require('d3');
{
	class SecStream {
		constructor(
            container,
			opts = {
				animDuration: 1000,
				margin: { top: 20, right: 20, bottom: 20, left: 20 }
            })
        {
			this._container = container;
            this._id = "id";
            this._layout;
			this._data;
			this._streamData;
            this._opts = opts;
            this._pathContainer;
            this._svg;

            this._init();
        }
        
        static get a(){}

        data(d) { return d == null ? this._data : (this._setData(d), this); }
        

		render() {
			const { animDuration } = this._opts;

			return this;
        }
        
        _setData(d) {
			if (!d || (typeof d !== "object")) return console.log(`ERROR: Added data "${d}" is not an object.`);
			this._data = d;
			this._applyOrdering();
			this._calculatePositions();
			this._calculateStreamData();
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
			/* layers
				{
					[
						{ uid, t_start: 0, y0: [0,0], y: [20,25] }
					],
					[
						{ uid, t_start: 0, y0: [5,7], y: [3,15] }
					]
				}
			*/
			this._streamData = {};
			let t = this._data.timesteps;
			for (let i = 1; i < t.length; i++) { // for all timesteps
				for (let n in t[i].references) { // for all nodes build stream to origin of node
					let node = t[i].references[n];
					if (!this._streamData[node.depth])
						this._streamData[node.depth] = [];
					this._streamData[node.depth].push({
						t: i-1,
						y0: [ !!node.origin ? node.origin.y0 : 0, !!node ? node.y0 : 0],
						y1: [ !!node.origin ? node.origin.y1 : 0, !!node ? node.y1 : 0],
					});
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
            d3.select("svg").attr('width', width).attr('height', height);
        }
	}

	d3.SecStream = (...args) => new SecStream(...args);
}