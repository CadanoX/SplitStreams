var stream;

examples.viscousMin = transformViscousFormat(examples.viscousMin);
examples.viscous = transformViscousFormat(examples.viscous);
examples.gumtreeMin = transformGumtreeFormat(examples.gumtreeMin);
examples.gumtree = transformGumtreeFormat(examples.gumtree);
examples.filetree = transformViscousFormat(examples.filetree);
examples.filetree2 = transformViscousFormat(examples.filetree2);

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
	let app = new Vue({
		el: '#app',
		data: {
			selected: null,
			search: "force",
			size: window.innerWidth,
			split: 'at',
			randomSplits: [],
			separationX: 'Fixed',
			separationXValue: 0,
			separationY: 'Fixed',
			separationYValue: 0,
			sizeThreshold: 0,
			proportion: 1,
			zoomTime: 1,
			unifySize: false,
			unifySizePlusOne: true,
			unifyPosition: false,
			drawStroke: false,
			showLabels: false,
			splitRoot: false,
			mirror: false,
			startEndEncoding: {
				value: 'plug',
				x: 0.85,
				y: 0,
				options: [
					{ value: 'circle', text: "Circle"},
					{ value: 'plug', text: "Plug"},
					{ value: 'default', text: "Default"}
				]
			},
			dataset: {
				value: 'gumtree',
				options: [
					{ value: 'viscous', text: "Viscous Fingers"},
					{ value: 'viscousMin', text: "Minimal Viscous"},
					{ value: 'gumtree', text: "Source Code"},
					{ value: 'gumtreeMin', text: "Minimal Source Code"},
					{ value: 'filetree', text: "Filetree"},
					{ value: 'filetree2', text: "Filetree2"},
				]
			},
			offset: {
				value: 'silhouette',
				options: [
					{ value: 'zero', text: "Zero"},
					{ value: 'expand', text: "Expand"},
					{ value: 'silhouette', text: "Silhouette"}
					// wiggle
				]
			},
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
			disableNormSizeButton() {
				return this.dataset.value == "viscousMin";
			},
			disableNormSizePlusOneButton() {
				return !this.unifySize && !this.disableNormSizeButton;
			},
			disableNormPosButton() {
				return this.unifySize ||
					(this.dataset.value != "gumtree" && this.dataset.value != "gumtreeMin");
			},
		},
		methods: {
			randomizeSplits: function() {
				stream.removeSplits();
				stream.addSplitsRandomly(10);
				this.randomSplits = stream.getSplits();
			},
			applySplits: function(option) {
				if (option == "at") {
					stream.removeSplits();
					stream.addSplitsAtTimepoints();
				}
				else if (option == "between") {
					stream.removeSplits();
					stream.addSplitsBetweenTimepoints();
				}
				else if (option == "random") {
					if (this.randomSplits.length == 0)
						this.randomizeSplits();
					else {
						stream.removeSplits();
						stream.addSplits(this.randomSplits);
					}
				}
			},
			wrapperResize(...args) {
				stream.resize();
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
			zoomTime: function() {
				stream.setZoomTime(this.zoomTime);
			},
			unifySize() {
				stream.unifySize = this.unifySize;
			},
			unifyPosition() {
				stream.unifyPosition = this.unifyPosition;
			},
			unifySizePlusOne() {
				stream.nodeSizeAddOne = this.unifySizePlusOne;
			},
			drawStroke() {
				stream.drawStroke(this.drawStroke);
			},
			showLabels() {
				stream.showLabels(this.showLabels);
			},
			mirror() {
				stream.mirror = this.mirror;
			},
			splitRoot() {
				stream.splitRoot = this.splitRoot;
			},
			filters: {
				handler: function(filters) {
					stream.filters(filters)
				},
				deep: true
			},
			startEndEncoding: {
				handler: function(encoding) {
					stream.startEndEncoding(encoding.value);
					stream.startEndEncodingX(encoding.x);
					stream.startEndEncodingY(encoding.y);
				},
				deep: true
			},
			dataset: {
				handler: function(dataset) {
					// TODO: deactivate update. it requires normalizeData to run on .data()
					//in order to not introduce errors (like not setting correct split values)
					//stream.automaticUpdate = false;
					stream.data(examples[dataset.value]).filters(this.filters)
					this.applySplits(this.split);
					//stream.automaticUpdate = true;
					stream.update();
				},
				deep: true
			},
			offset: {
				handler: function(offset) {
					stream.offset(offset.value);
				},
				deep: true
			},
			split: function(option) {
				this.applySplits(option);
			}
		}
	});

	let div = document.querySelector('#wrapper');
	stream = d3.SecStream(div)
		.data(examples[app.dataset.value]);

	stream.addSplitsAtTimepoints();
});