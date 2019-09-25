import 'vue-resize/dist/vue-resize.css';
import '../css/style.css';

import Vue from 'vue';
import VueResize from 'vue-resize';
import * as d3 from 'd3';
import Papa from 'papaparse';

import SplitStream from './SplitStream';
import SplitStreamFilter from './SplitStreamFilter';
import LoaderOntology from './LoaderOntology';
import LoaderMeSH from './LoaderMeSH';
import TransformData from './TransformData';

import {
  loadJSON,
  getRandomColor,
  saveSvg,
  saveJson,
  addLoadingSpinner,
  removeLoadingSpinner
} from './functions';

Vue.use(VueResize);

var stream;
var wrapper;

var datasets = {};
const datasetList = require('../_datasets.json');

const meshList = [
  // { tree: "mtrees1997.bin", changes: 'newmnchg1997.txt' },
  // { tree: "mtrees1998.bin", changes: 'newmnchg1998.txt' },
  { tree: 'mtrees2001.bin', changes: 'newmnchg2001.txt' },
  { tree: 'mtrees2002.bin', changes: 'newmnchg2002.txt' },
  { tree: 'mtrees2003.bin', changes: 'newmnchg2003.txt' },
  { tree: 'mtrees2004.bin', changes: 'newmnchg2004.txt' },
  { tree: 'mtrees2005.bin', changes: 'newmnchg2005.txt' },
  { tree: 'mtrees2006.bin', changes: 'newmnchg2006.txt' },
  { tree: 'mtrees2007.bin', changes: 'newmnchg2007.txt' },
  { tree: 'mtrees2008.bin', changes: 'newmnchg2008.txt' },
  { tree: 'mtrees2009.bin', changes: 'newmnchg2009.txt' },
  { tree: 'mtrees2010.bin', changes: 'newmnchg2010.txt' },
  { tree: 'mtrees2011.bin', changes: 'newmnchg2011.txt' },
  { tree: 'mtrees2012.bin', changes: 'newmnchg2012.txt' },
  { tree: 'mtrees2013.bin', changes: 'newmnchg2013.txt' },
  { tree: 'mtrees2014.bin', changes: 'newmnchg2014.txt' },
  { tree: 'mtrees2015.bin', changes: 'newmnchg2015.txt' },
  { tree: 'mtrees2016.bin', changes: 'newmnchg2016.txt' },
  { tree: 'mtrees2017.bin', changes: 'newmnchg2017.txt' }
  // { tree: "mtrees2018.bin", changes: 'newmnchg2018.txt' },
  // { tree: "mtrees2019.bin", changes: 'newmnchg2019.txt' }
];

async function loadDataset(name) {
  if (datasets[name]) return true;

  addLoadingSpinner(wrapper);
  let entry = datasetList[name];
  let data;
  let response;

  if (entry.format == 'ontology') {
    let ont = new LoaderOntology();
    ont.loadOntology(examples.ontologies.ICD9CM_2013AB);
    ont.loadOntology(examples.ontologies.ICD9CM_2014AB);
    ont.transformOntologiesToTree();
    data = ont.data;
  } else if (entry.format == 'MeSH') {
    // load data
    let mesh = new LoaderMeSH();
    for (let meshEntry of meshList) {
      await mesh.loadFile('/data/MeSH/trees/' + meshEntry.tree);
    }
    mesh.transformToTree();
    // load changes
    for (let i = 0; i < meshList.length; i++) {
      if (i === 0) continue;
      await mesh.loadFileChanges(
        '/data/MeSH/changes/' + meshList[i].changes,
        i
      );
    }
    mesh.done();
    data = mesh.data;
    datasets[name] = data; //new SplitStreamFilter(data);
    return true;
  } else {
    try {
      response = await fetch(entry.file);
    } catch (e) {
      alert(e);
      return false;
    }

    try {
      if (entry.filetype == 'json') data = await response.json();
      else if (entry.filetype == 'csv')
        data = Papa.parse(await response.text(), { header: true }).data;
      else if (entry.filetype == 'data')
        data = Papa.parse(await response.text()).data;
      else throw Exception('File format not supported.');
    } catch (e) {
      alert(e);
      return false;
    }
  }

  if (entry.format == 'storyline')
    datasets[name] = TransformData[entry.format](data);
  else
    datasets[name] = new SplitStreamFilter(TransformData[entry.format](data));
  return true;
}

document.addEventListener('DOMContentLoaded', async function(event) {
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
      limitDepth: false,
      depthLimit: 2,
      selectBranch: false,
      branchSelected: 0,
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
          { value: 'accurate', text: 'accurate' }
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
      },
      render() {
        let data;
        if (datasets[this.dataset.value] instanceof SplitStreamFilter) {
          data = datasets[this.dataset.value]._reset();
          if (this.selectBranch)
            datasets[this.dataset.value].branch(this.branchSelected);
          if (this.limitDepth)
            data = datasets[this.dataset.value].maxDepth(this.depthLimit);
        } else data = datasets[this.dataset.value];

        stream.automaticUpdate = false;
        stream.data(data);
        stream.filters(this.filters);
        this.applySplits(this.split);
        stream.automaticUpdate = true;
        stream.update();
      }
    },
    watch: {
      size() {
        this.settings.width = this.size * 1.0;
        this.settings.height =
          (this.size * window.innerHeight) / window.innerWidth;
        stream.resize(this.settings.width, this.settings.height);
      },
      ySpacing() {
        if (this.ySpacing == 'Fixed') stream.ySpacing = stream.ySpacingFixed;
        else if (this.ySpacing == 'Percentage')
          stream.ySpacing = stream.ySpacingPercentage;
        else if (this.ySpacing == 'Hierarchical')
          stream.ySpacing = stream.ySpacingHierarchical;
        else if (this.ySpacing == 'HierarchicalReverse')
          stream.ySpacing = stream.ySpacingHierarchicalReverse;
      },
      yMargin() {
        stream.yMargin = this.yMargin;
      },
      yPadding() {
        stream.yPadding = this.yPadding;
      },
      xSpacing() {
        if (this.xSpacing == 'Fixed') stream.xSpacing = stream.xSpacingFixed;
        else if (this.xSpacing == 'Hierarchical')
          stream.xSpacing = stream.xSpacingHierarchical;
        else if (this.xSpacing == 'HierarchicalReverse')
          stream.xSpacing = stream.xSpacingHierarchicalReverse;
      },
      xMargin() {
        stream.xMargin = this.xMargin;
      },
      sizeThreshold() {
        stream.minSizeThreshold = this.sizeThreshold;
      },
      proportion() {
        stream.proportion = this.proportion;
      },
      zoomTime() {
        stream.zoomTime = this.zoomTime;
      },
      limitDepth() {
        this.render();
      },
      depthLimit() {
        this.render();
      },
      selectBranch() {
        this.render();
      },
      branchSelected() {
        this.render();
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
      filterMode: {
        handler: function() {
          stream.filterMode = this.filterMode.value;
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
          loadDataset(dataset.value).then(loaded => {
            if (loaded) this.render();
            removeLoadingSpinner(wrapper);
          });
        },
        deep: true
      },
      shapeRendering: {
        handler: function(shapeRendering) {
          stream.shapeRendering = shapeRendering.value;
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

  wrapper = document.querySelector('#wrapper');

  // Add all datasets to the dataset selector
  let datasetListArray = Object.keys(datasetList).map(k => datasetList[k]);
  app.dataset.options = datasetListArray;

  await loadDataset(app.dataset.value);
  stream = new SplitStream(wrapper).data(datasets[app.dataset.value]);

  stream.addSplitsAtTimepoints();
});
