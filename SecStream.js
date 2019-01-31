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
            this._layout = this._myTreeLayout;
			this._data;
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