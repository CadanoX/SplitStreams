import 'vue-resize/dist/vue-resize.css';
import '../css/style.css';

import Vue from 'vue';
import VueResize from 'vue-resize';
import * as d3 from 'd3';
import Papa from 'papaparse'

import SecStream from './SecStream';
import OntologyLoader from './OntologyLoader';
import TransformData from './TransformData';

import { loadJSON, getRandomColor, saveSvg, saveJson, addLoadingSpinner, removeLoadingSpinner } from './functions';
import { Transform } from 'stream';

Vue.use(VueResize);

var stream;
var wrapper;

var datasets = {};
const datasetList = require('../_datasets.json');

async function loadDataset(name) {
  addLoadingSpinner(wrapper);
  let entry = datasetList[name];
  if (!datasets[name]) {
    let data;
    let response;

    if (entry.format == 'ontology') {
      // case 'ontology':
      //   let ont = new OntologyLoader();
      //   ont.loadOntology(examples.ontologies.ICD9CM_2013AB);
      //   ont.loadOntology(examples.ontologies.ICD9CM_2014AB);
      //   ont.transformOntologiesToTree();
      //   datasets.ontology = ont.data;
      //   break;
    }
    else {
      try {
        response = await fetch(entry.file);
      } catch (e) {
        alert(e);
        return false;
      }

      try {
        if (entry.filetype == 'json')
          data = await response.json();
        else if (entry.filetype == 'csv')
          data = Papa.parse(await response.text(),
            { header: true }
          ).data;
        else if (entry.filetype == 'data')
          data = Papa.parse(await response.text()).data;
        else
          throw Exception('File format not supported.');

        datasets[name] = TransformData[entry.format](data);
        return true;
      } catch (e) {
        alert(e);
        return false;
      }
    }
  }
  return true;
}

document.addEventListener('DOMContentLoaded', async function (event) {
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
      shapeRendering: {
        value: 'geometricPrecision',
        options: [
          { value: 'geometricPrecision', text: 'geometricPrecision' },
          { value: 'optimizeSpeed', text: 'optimizeSpeed' },
          { value: 'crispEdges', text: 'crispEdges' }
        ]
      },
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
        options: [] // options are dynamically added from ./_datasets.json
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
      ],
      filterMode: {
        value: 'fast',
        options: [
          { value: 'fast', text: 'fast' },
          { value: 'accurate', text: 'accurate' },
        ]
      }
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
      randomizeSplits: function () {
        stream.removeSplits();
        stream.addSplitsRandomly(10);
        this.randomSplits = stream.splits;
      },
      applySplits: function (option) {
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
      download: function () {
        saveSvg(document.querySelector('svg'), 'secstream');
        saveJson(generator.get(), 'data');
      }
    },
    watch: {
      size: function () {
        this.settings.width = this.size * 1.0;
        this.settings.height =
          (this.size * window.innerHeight) / window.innerWidth;
        stream.resize(this.settings.width, this.settings.height);
      },
      ySpacing: function () {
        if (this.ySpacing == 'Fixed') stream.ySpacing = stream.ySpacingFixed;
        else if (this.ySpacing == 'Percentage')
          stream.ySpacing = stream.ySpacingPercentage;
        else if (this.ySpacing == 'Hierarchical')
          stream.ySpacing = stream.ySpacingHierarchical;
        else if (this.ySpacing == 'HierarchicalReverse')
          stream.ySpacing = stream.ySpacingHierarchicalReverse;
      },
      yMargin: function () {
        stream.yMargin = this.yMargin;
      },
      yPadding: function () {
        stream.yPadding = this.yPadding;
      },
      xSpacing: function () {
        if (this.xSpacing == 'Fixed') stream.xSpacing = stream.xSpacingFixed;
        else if (this.xSpacing == 'Hierarchical')
          stream.xSpacing = stream.xSpacingHierarchical;
        else if (this.xSpacing == 'HierarchicalReverse')
          stream.xSpacing = stream.xSpacingHierarchicalReverse;
      },
      xMargin: function () {
        stream.xMargin = this.xMargin;
      },
      sizeThreshold: function () {
        stream.minSizeThreshold = this.sizeThreshold;
      },
      proportion: function () {
        stream.proportion = this.proportion;
      },
      zoomTime: function () {
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
        handler: function (filters) {
          stream.filters(this.filters);
        },
        deep: true
      },
      filterMode: {
        handler: function () {
          stream.filterMode = this.filterMode.value;
        },
        deep: true
      },
      startEndEncoding: {
        handler: function (encoding) {
          stream.startEndEncoding = encoding.value;
          stream.startEndEncodingX = encoding.x;
          stream.startEndEncodingY = encoding.y;
        },
        deep: true
      },
      dataset: {
        handler: function (dataset) {
          loadDataset(dataset.value).then((loaded) => {
            if (loaded) {
              stream.data(datasets[dataset.value])
              stream.filters(this.filters);
              this.applySplits(this.split);
            }

            removeLoadingSpinner(wrapper);
          })
        },
        deep: true
      },
      shapeRendering: {
        handler: function (shapeRendering) {
          stream.shapeRendering = shapeRendering.value;
        },
        deep: true
      },
      offset: {
        handler: function (offset) {
          stream.offset = offset.value;
        },
        deep: true
      },
      color: {
        handler: function (color) {
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
      split: function (option) {
        this.applySplits(option);
      }
    }
  });

  wrapper = document.querySelector('#wrapper')

  // Add all datasets to the dataset selector
  let datasetListArray = Object.keys(datasetList).map((k) => datasetList[k]);
  app.dataset.options = datasetListArray;

  await loadDataset(app.dataset.value);
  stream = new SecStream(wrapper).data(datasets[app.dataset.value]);

  stream.addSplitsAtTimepoints();
});
