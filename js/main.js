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
			color: {
				value: 'interpolateBlues',
				options: [
					{ value: 'random', text: 'random' },
					{ value: 'schemeCategory10', text: 'schemeCategory10' },
					/* { value: 'schemeAccent', text: 'schemeAccent' },
					{ value: 'schemeDark2', text: 'schemeDark2' },
					{ value: 'schemePaired', text: 'schemePaired' },
					{ value: 'schemePastel1', text: 'schemePastel1' },
					{ value: 'schemePastel2', text: 'schemePastel2' },
					{ value: 'schemeSet1', text: 'schemeSet1' },
					{ value: 'schemeSet2', text: 'schemeSet2' },
					{ value: 'schemeSet3', text: 'schemeSet3' }, */
					{ value: 'interpolateBlues', text: 'interpolateBlues' },
					/* { value: 'interpolateGreens', text: 'interpolateGreens' },
					{ value: 'interpolateGreys', text: 'interpolateGreys' },
					{ value: 'interpolateOranges', text: 'interpolateOranges' },
					{ value: 'interpolatePurples', text: 'interpolatePurples' },
					{ value: 'interpolateReds', text: 'interpolateReds' },
					{ value: 'interpolateViridis', text: 'interpolateViridis' }, */
					{ value: 'interpolateInferno', text: 'interpolateInferno' },
					/* { value: 'interpolateMagma', text: 'interpolateMagma' },
					{ value: 'interpolatePlasma', text: 'interpolatePlasma' },
					{ value: 'interpolateWarm', text: 'interpolateWarm' },
					{ value: 'interpolateCool', text: 'interpolateCool' },
					{ value: 'interpolateCubehelixDefault', text: 'interpolateCubehelixDefault' },
					{ value: 'interpolateBuGn', text: 'interpolateBuGn' },
					{ value: 'interpolateBuPu', text: 'interpolateBuPu' },
					{ value: 'interpolateGnBu', text: 'interpolateGnBu' },
					{ value: 'interpolateOrRd', text: 'interpolateOrRd' },
					{ value: 'interpolatePuBuGn', text: 'interpolatePuBuGn' },
					{ value: 'interpolatePuBu', text: 'interpolatePuBu' },
					{ value: 'interpolatePuRd', text: 'interpolatePuRd' },
					{ value: 'interpolateRdPu', text: 'interpolateRdPu' },
					{ value: 'interpolateYlGnBu', text: 'interpolateYlGnBu' },
					{ value: 'interpolateYlGn', text: 'interpolateYlGn' },
					{ value: 'interpolateYlOrBr', text: 'interpolateYlOrBr' },
					{ value: 'interpolateYlOrRd', text: 'interpolateYlOrRd' }, */
				]
			},
			filters: [
				[
					{ type: 'feDropShadow', dx: 0, dy: 0, stdDeviation: 0 },
					{ type: 'feDropShadow', dx: 0, dy: 0, stdDeviation: 0 }
				]
			]
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
            download: function() {
                saveSvg(document.querySelector('svg'), 'secstream');
                saveJson(generator.get(), 'data');
            },
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
				stream.nodeSizeAddX = this.unifySizePlusOne;
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
			color: {
				handler: function(color) {
					stream.colorRandom = false;
					switch (color.value) {
						case 'random':
							stream.colorRandom = true;
							break;							
						case 'schemeCategory10':
							stream.color = d3.scaleOrdinal(d3.schemeCategory10);
							break;
						case 'schemeAccent':
							stream.color = d3.scaleOrdinal(d3.schemeAccent);
							break;
						case 'schemeDark2':
							stream.color = d3.scaleOrdinal(d3.schemeDark2);
							break;
						case 'schemePaired':
							stream.color = d3.scaleOrdinal(d3.schemePaired);
							break;
						case 'schemePastel1':
							stream.color = d3.scaleOrdinal(d3.schemePastel1);
							break;
						case 'schemePastel2':
							stream.color = d3.scaleOrdinal(d3.schemePastel2);
							break;
						case 'schemeSet1':
							stream.color = d3.scaleOrdinal(d3.schemeSet1);
							break;
						case 'schemeSet2':
							stream.color = d3.scaleOrdinal(d3.schemeSet2);
							break;
						case 'schemeSet3':
							stream.color = d3.scaleOrdinal(d3.schemeSet3);
							break;
						case 'interpolateBlues':
							stream.color = d3.scaleSequential(d3.interpolateBlues);
							break;
						case 'interpolateGreens':
							stream.color = d3.scaleSequential(d3.interpolateGreens);
							break;
						case 'interpolateGreys':
							stream.color = d3.scaleSequential(d3.interpolateGreys);
							break;
						case 'interpolateOranges':
							stream.color = d3.scaleSequential(d3.interpolateOranges);
							break;
						case 'interpolatePurples':
							stream.color = d3.scaleSequential(d3.interpolatePurples);
							break;
						case 'interpolateReds':
							stream.color = d3.scaleSequential(d3.interpolateReds);
							break;
						case 'interpolateViridis':
							stream.color = d3.scaleSequential(d3.interpolateViridis);
							break;
						case 'interpolateInferno':
							stream.color = d3.scaleSequential(d3.interpolateInferno);
							break;
						case 'interpolateMagma':
							stream.color = d3.scaleSequential(d3.interpolateMagma);
							break;
						case 'interpolatePlasma':
							stream.color = d3.scaleSequential(d3.interpolatePlasma);
							break;
						case 'interpolateWarm':
							stream.color = d3.scaleSequential(d3.interpolateWarm);
							break;
						case 'interpolateCool':
							stream.color = d3.scaleSequential(d3.interpolateCool);
							break;
						case 'interpolateCubehelixDefault':
							stream.color = d3.scaleSequential(d3.interpolateCubehelixDefault);
							break;
						case 'interpolateBuGn':
							stream.color = d3.scaleSequential(d3.interpolateBuGn);
							break;
						case 'interpolateBuPu':
							stream.color = d3.scaleSequential(d3.interpolateBuPu);
							break;
						case 'interpolateGnBu':
							stream.color = d3.scaleSequential(d3.interpolateGnBu);
							break;
						case 'interpolateOrRd':
							stream.color = d3.scaleSequential(d3.interpolateOrRd);
							break;
						case 'interpolatePuBuGn':
							stream.color = d3.scaleSequential(d3.interpolatePuBuGn);
							break;
						case 'interpolatePuBu':
							stream.color = d3.scaleSequential(d3.interpolatePuBu);
							break;
						case 'interpolatePuRd':
							stream.color = d3.scaleSequential(d3.interpolatePuRd);
							break;
						case 'interpolateRdPu':
							stream.color = d3.scaleSequential(d3.interpolateRdPu);
							break;
						case 'interpolateYlGnBu':
							stream.color = d3.scaleSequential(d3.interpolateYlGnBu);
							break;
						case 'interpolateYlGn':
							stream.color = d3.scaleSequential(d3.interpolateYlGn);
							break;
						case 'interpolateYlOrBr':
							stream.color = d3.scaleSequential(d3.interpolateYlOrBr);
							break;
						case 'interpolateYlOrRd':
							stream.color = d3.scaleSequential(d3.interpolateYlOrRd);
							break;
						default:
							stream.color = d3.scaleSequential(d3.interpolateBlues);
					}
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