import 'vue-resize/dist/vue-resize.css';
import '../css/style.css';

import Vue from 'vue';
import VueResize from 'vue-resize';
import * as d3 from 'd3';

import SecStream from './SecStream';
import OntologyLoader from './OntologyLoader';

import {
  loadJSON,
  getRandomColor,
  saveSvg,
  saveJson,
  transformViscousFormat,
  transformGumtreeFormat,
  loadTitanFormat,
  loadAllenFormat,
  loadStorylineFormat
} from './functions';

Vue.use(VueResize);

const examples = {
  viscous: require('../data/viscous.json'),
  viscousMin: require('../data/viscousMin.json'),
  filetree: require('../data/filetree.json'),
  filetree2: require('../data/filetree2.json'),
  explanation: require('../data/explanation.json'),
  gumtreeMin: require('../data/gumtreeMin.json'),
  gumtree: require('../data/gumtree.json'),
  gumtreeDFT: require('../data/gumtreeDFT.json'),
  TITAN: require('../data/storms.csv'),
  mouse_brain: require('../data/mouse_brain.json'),
  starwars: require('../data/starwars.json'),
  matrix: require('../data/matrix.json'),
  ontologies: {
    ICD9CM_2013AB: require('../data/ICD9CM/ICD9CM-2013AB.ttl'),
    ICD9CM_2014AB: require('../data/ICD9CM/ICD9CM-2014AB.ttl')
  }
};

var stream;

var datasets = {};
function loadDataset(name) {
  if (!datasets[name]) {
    switch (name) {
      case 'viscous':
        datasets.viscous = transformViscousFormat(examples.viscous);
        break;
      case 'viscousMin':
        datasets.viscousMin = transformViscousFormat(examples.viscousMin);
        break;
      case 'filetree':
        datasets.filetree = transformViscousFormat(examples.filetree);
        break;
      case 'filetree2':
        datasets.filetree2 = transformViscousFormat(examples.filetree2);
        break;
      case 'explanation':
        datasets.explanation = transformViscousFormat(examples.explanation);
        break;

      case 'gumtreeMin':
        datasets.gumtreeMin = transformGumtreeFormat(examples.gumtreeMin);
        break;
      case 'gumtree':
        datasets.gumtree = transformGumtreeFormat(examples.gumtree);
        break;
      case 'gumtreeDFT':
        datasets.gumtreeDFT = transformGumtreeFormat(examples.gumtreeDFT);
        break;

      case 'TITAN':
        datasets.TITAN = loadTitanFormat(examples.TITAN);
        break;
      case 'mouseBrain':
        datasets.mouseBrain = loadAllenFormat(examples.mouse_brain);
        break;

      case 'starwars':
        datasets.starwars = loadStorylineFormat(examples.starwars);
        break;
      case 'matrix':
        datasets.matrix = loadStorylineFormat(examples.matrix);
        break;

      case 'ontology':
        let ont = new OntologyLoader();
        ont.loadOntology(examples.ontologies.ICD9CM_2013AB);
        ont.loadOntology(examples.ontologies.ICD9CM_2014AB);
        ont.transformOntologiesToTree();
        datasets.ontology = ont.data;
        break;

      default:
        break;
    }
  }
}

document.addEventListener('DOMContentLoaded', function(event) {
  let app = new Vue({
    el: '#app',
    data: {
      split: 'at',
      randomSplits: [],
      xSpacing: 'Fixed',
      xMargin: 0,
      ySpacing: 'Fixed',
      yMargin: 0,
      yPadding: 0,
      sizeThreshold: 0,
      proportion: 1,
      zoomTime: 1,
      unifySize: false,
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
          { value: 'circle', text: 'Circle' },
          { value: 'plug', text: 'Plug' },
          { value: 'default', text: 'Default' }
        ]
      },
      dataset: {
        value: 'viscousMin',
        options: [
          { value: 'viscous', text: 'Viscous Fingers' },
          { value: 'viscousMin', text: 'Minimal Viscous' },
          { value: 'gumtree', text: 'Source Code' },
          { value: 'gumtreeMin', text: 'Minimal Source Code' },
          { value: 'filetree', text: 'Filetree' },
          { value: 'filetree2', text: 'Filetree2' },
          { value: 'explanation', text: 'Figure 3' },
          { value: 'gumtreeDFT', text: 'Figure 5' },
          { value: 'TITAN', text: 'TITAN' },
          { value: 'mouseBrain', text: 'Mouse Brain' },
          { value: 'starwars', text: 'Star Wars' },
          { value: 'matrix', text: 'Matrix' },
          { value: 'ontology', text: 'Ontology' }
        ]
      },
      offset: {
        value: 'silhouette',
        options: [
          { value: 'zero', text: 'Zero' },
          { value: 'expand', text: 'Expand' },
          { value: 'silhouette', text: 'Silhouette' }
          // wiggle
        ]
      },
      color: {
        value: 'interpolateBlues',
        options: [
          { value: 'random', text: 'random' },
          { value: 'schemeCategory10', text: 'schemeCategory10' },
          { value: 'schemeAccent', text: 'schemeAccent' },
          { value: 'schemeDark2', text: 'schemeDark2' },
          { value: 'schemePaired', text: 'schemePaired' },
          { value: 'schemePastel1', text: 'schemePastel1' },
          { value: 'schemePastel2', text: 'schemePastel2' },
          { value: 'schemeSet1', text: 'schemeSet1' },
          { value: 'schemeSet2', text: 'schemeSet2' },
          { value: 'schemeSet3', text: 'schemeSet3' },
          { value: 'interpolateBlues', text: 'interpolateBlues' },
          { value: 'interpolateGreens', text: 'interpolateGreens' },
          { value: 'interpolateGreys', text: 'interpolateGreys' },
          { value: 'interpolateOranges', text: 'interpolateOranges' },
          { value: 'interpolatePurples', text: 'interpolatePurples' },
          { value: 'interpolateReds', text: 'interpolateReds' },
          { value: 'interpolateViridis', text: 'interpolateViridis' },
          { value: 'interpolateInferno', text: 'interpolateInferno' },
          { value: 'interpolateMagma', text: 'interpolateMagma' },
          { value: 'interpolatePlasma', text: 'interpolatePlasma' },
          { value: 'interpolateWarm', text: 'interpolateWarm' },
          { value: 'interpolateCool', text: 'interpolateCool' },
          {
            value: 'interpolateCubehelixDefault',
            text: 'interpolateCubehelixDefault'
          },
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
          { value: 'interpolateYlOrRd', text: 'interpolateYlOrRd' }
        ]
      },
      filters: [
        { type: 'double-inner-shadow', dx: 0, dy: 0, stdDeviation: 0 },
        { type: 'drop-shadow', dx: 0, dy: 0, stdDeviation: 0 }
      ]
    },
    computed: {
      disableNormSizeButton() {
        return this.dataset.value == 'viscousMin';
      },
      disableNormPosButton() {
        return (
          this.unifySize ||
          (this.dataset.value != 'gumtree' &&
            this.dataset.value != 'gumtreeMin')
        );
      }
    },
    methods: {
      randomizeSplits: function() {
        stream.removeSplits();
        stream.addSplitsRandomly(10);
        this.randomSplits = stream.splits;
      },
      applySplits: function(option) {
        if (option == 'at') {
          stream.removeSplits();
          stream.addSplitsAtTimepoints();
        } else if (option == 'between') {
          stream.removeSplits();
          stream.addSplitsBetweenTimepoints();
        } else if (option == 'random') {
          if (this.randomSplits.length == 0) this.randomizeSplits();
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
      }
    },
    watch: {
      size: function() {
        this.settings.width = this.size * 1.0;
        this.settings.height =
          (this.size * window.innerHeight) / window.innerWidth;
        stream.resize(this.settings.width, this.settings.height);
      },
      ySpacing: function() {
        if (this.ySpacing == 'Fixed') stream.ySpacing = stream.ySpacingFixed;
        else if (this.ySpacing == 'Percentage')
          stream.ySpacing = stream.ySpacingPercentage;
        else if (this.ySpacing == 'Hierarchical')
          stream.ySpacing = stream.ySpacingHierarchical;
        else if (this.ySpacing == 'HierarchicalReverse')
          stream.ySpacing = stream.ySpacingHierarchicalReverse;
      },
      yMargin: function() {
        stream.yMargin = this.yMargin;
      },
      yPadding: function() {
        stream.yPadding = this.yPadding;
      },
      xSpacing: function() {
        if (this.xSpacing == 'Fixed') stream.xSpacing = stream.xSpacingFixed;
        else if (this.xSpacing == 'Hierarchical')
          stream.xSpacing = stream.xSpacingHierarchical;
        else if (this.xSpacing == 'HierarchicalReverse')
          stream.xSpacing = stream.xSpacingHierarchicalReverse;
      },
      xMargin: function() {
        stream.xMargin = this.xMargin;
      },
      sizeThreshold: function() {
        stream.minSizeThreshold = this.sizeThreshold;
      },
      proportion: function() {
        stream.proportion = this.proportion;
      },
      zoomTime: function() {
        stream.zoomTime = this.zoomTime;
      },
      unifySize() {
        stream.unifySize = this.unifySize;
      },
      unifyPosition() {
        stream.unifyPosition = this.unifyPosition;
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
          stream.filters(this.filters);
        },
        deep: true
      },
      startEndEncoding: {
        handler: function(encoding) {
          stream.startEndEncoding = encoding.value;
          stream.startEndEncodingX = encoding.x;
          stream.startEndEncodingY = encoding.y;
        },
        deep: true
      },
      dataset: {
        handler: function(dataset) {
          loadDataset(dataset.value);
          stream.data(datasets[dataset.value]).filters(this.filters);
          this.applySplits(this.split);
        },
        deep: true
      },
      offset: {
        handler: function(offset) {
          stream.offset = offset.value;
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
  loadDataset(app.dataset.value);
  stream = new SecStream(div).data(datasets[app.dataset.value]);

  stream.addSplitsAtTimepoints();
});
