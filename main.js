var stream;

function changeSeparationY(func, value) {
	if (func == "Fixed")
		stream.separationY(stream.marginYFixed, value);
	else if (func == "Percentage")
		stream.separationY(stream.marginYPercentage, value);
	else if (func == "Hierarchical")
		stream.separationY(stream.marginYHierarchical, value);
	else if (func == "HierarchicalReverse")
		stream.separationY(stream.marginYHierarchicalReverse, value);
}

function changeSeparationX(func, value) {
	if (func == "Fixed")
		stream.separationX(stream.marginXFixed, value);
	else if (func == "Hierarchical")
		stream.separationX(stream.marginXHierarchical, value);
	else if (func == "HierarchicalReverse")
		stream.separationX(stream.marginXHierarchicalReverse, value);
}

document.addEventListener("DOMContentLoaded", function(event)
{
	//transformVisciousIntoFormat(examples.Viscous);
	let data = transformGumtreeFormat(examples.gumtree);

	let app = new Vue({
		el: '#app',
		data: {
			selected: null,
			search: "force",
			size: window.innerWidth,
			separationX: 'Fixed',
			separationXValue: 0,
			separationY: 'Fixed',
			separationYValue: 0,
			sizeThreshold: 0,
			proportion: 0.99,
			filters: [
				[
					{ type: 'feDropShadow', dx: 0, dy: 0, stdDeviation: 0 },
					{ type: 'feDropShadow', dx: 0, dy: 0, stdDeviation: 0 }
				]
			],
			settings: {
				bgColor: '#757575',
				width: window.innerWidth,
				height: window.innerHeight
			},
			test: 1
		},
		computed: {
		},
		methods: {
			add: function () {
				this.csv.push({
					id: "flare.physics.Dummy",
					value: 0
				})
			},
			select: function(index, node) {
				this.selected = index;
			}
		},
		watch: {
			size: function() {
				this.settings.width = this.size * 1.0;
				this.settings.height = this.size * window.innerHeight/window.innerWidth;
				stream.resize(this.settings.width, this.settings.height);
			},
			separationY: function() {
				changeSeparationY(this.separationY, this.separationYValue)
			},
			separationYValue: function() {
				changeSeparationY(this.separationY, this.separationYValue)
			},
			separationX: function() {
				changeSeparationX(this.separationX, this.separationXValue)
			},
			separationXValue: function() {
				changeSeparationX(this.separationX, this.separationXValue)
			},
			sizeThreshold: function() {
				stream.setMinSizeThreshold(this.sizeThreshold)
			},
			proportion: function() {
				stream.setProportion(this.proportion)
			},
			filters: {
				handler: function(filters) {
					stream.filters(filters)
				},
				deep: true
			}
		}
	});

	let div = document.querySelector('#wrapper');
	stream = d3.SecStream(div)
		.data(data);
});