import Vue from 'vue';
import VueResize from 'vue-resize';
import * as d3 from 'd3';

import DataGenerator from './DataGenerator';
import SplitStream from './SplitStream';
import TransformData from './TransformData';

import { loadJSON, getRandomColor, saveSvg, saveJson } from './functions';

import 'vue-resize/dist/vue-resize.css';
import '../css/style.css';

Vue.use(VueResize);

var stream;
var treemap;
var secstream;

const generator = new DataGenerator();

document.addEventListener('DOMContentLoaded', function(event) {
  let app = new Vue({
    el: '#app',
    data: {
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
          { value: 'interpolateBlues', text: 'interpolateBlues' }
          /* { value: 'interpolateGreens', text: 'interpolateGreens' },
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
      secstreamSplits: false,

      timesteps: 5,
      numStreams: 10,
      maxDepth: 0,
      maxChildren: 0,
      numMerges: 0,
      numSplits: 0,
      numMoveAcross: 1,
      numMoveAlong: 0,
      numAdds: 3,
      numDeletes: 3,
      maxValue: 1
    },
    watch: {
      timesteps: function(val) {
        generator.options({ timesteps: val });
        if (val == 1) {
          stream.proportion = 0.6;
          secstream.proportion = 0.6;
        } else {
          stream.proportion = 1;
          secstream.proportion = 1;
        }
        this.draw();
        this.applySplits(this.secstreamSplits);
      },
      numStreams: function(val) {
        generator.options({ numStreams: val });
        this.draw();
      },
      maxDepth: function(val) {
        generator.options({ maxDepth: val });
        this.draw();
      },
      maxChildren: function(val) {
        generator.options({ maxChildren: val });
        this.draw();
      },
      numMerges: function(val) {
        generator.options({ numMerges: val });
        this.draw();
      },
      numSplits: function(val) {
        generator.options({ numSplits: val });
        this.draw();
      },
      numMoveAcross: function(val) {
        generator.options({ numMoveAcross: val });
        this.draw();
      },
      numMoveAlong: function(val) {
        generator.options({ numMoveAlong: val });
        this.draw();
      },
      numgenerators: function(val) {
        generator.options({ numStreams: val });
        this.draw();
      },
      numAdds: function(val) {
        generator.options({ numAdds: val });
        this.draw();
      },
      numDeletes: function(val) {
        generator.options({ numDeletes: val });
        this.draw();
      },
      maxValue: function(val) {
        generator.options({ maxValue: val });
        treemap.yPadding = Number(this.maxValue);
        stream.yPadding = Number(this.maxValue);
        secstream.yPadding = Number(this.maxValue);
        this.draw();
      },
      color: {
        handler: function(color) {
          stream.colorRandom = false;
          treemap.colorRandom = false;
          secstream.colorRandom = false;
          switch (color.value) {
            case 'random':
              stream.colorRandom = true;
              treemap.colorRandom = true;
              secstream.colorRandom = true;
              break;
            case 'schemeCategory10':
              this.applyColor(d3.scaleOrdinal(d3.schemeCategory10));
              break;
            case 'schemeAccent':
              this.applyColor(d3.scaleOrdinal(d3.schemeAccent));
              break;
            case 'schemeDark2':
              this.applyColor(d3.scaleOrdinal(d3.schemeDark2));
              break;
            case 'schemePaired':
              this.applyColor(d3.scaleOrdinal(d3.schemePaired));
              break;
            case 'schemePastel1':
              this.applyColor(d3.scaleOrdinal(d3.schemePastel1));
              break;
            case 'schemePastel2':
              this.applyColor(d3.scaleOrdinal(d3.schemePastel2));
              break;
            case 'schemeSet1':
              this.applyColor(d3.scaleOrdinal(d3.schemeSet1));
              break;
            case 'schemeSet2':
              this.applyColor(d3.scaleOrdinal(d3.schemeSet2));
              break;
            case 'schemeSet3':
              this.applyColor(d3.scaleOrdinal(d3.schemeSet3));
              break;
            case 'interpolateBlues':
              this.applyColor(d3.scaleSequential(d3.interpolateBlues));
              break;
            case 'interpolateGreens':
              this.applyColor(d3.scaleSequential(d3.interpolateGreens));
              break;
            case 'interpolateGreys':
              this.applyColor(d3.scaleSequential(d3.interpolateGreys));
              break;
            case 'interpolateOranges':
              this.applyColor(d3.scaleSequential(d3.interpolateOranges));
              break;
            case 'interpolatePurples':
              this.applyColor(d3.scaleSequential(d3.interpolatePurples));
              break;
            case 'interpolateReds':
              this.applyColor(d3.scaleSequential(d3.interpolateReds));
              break;
            case 'interpolateViridis':
              this.applyColor(d3.scaleSequential(d3.interpolateViridis));
              break;
            case 'interpolateInferno':
              this.applyColor(d3.scaleSequential(d3.interpolateInferno));
              break;
            case 'interpolateMagma':
              this.applyColor(d3.scaleSequential(d3.interpolateMagma));
              break;
            case 'interpolatePlasma':
              this.applyColor(d3.scaleSequential(d3.interpolatePlasma));
              break;
            case 'interpolateWarm':
              this.applyColor(d3.scaleSequential(d3.interpolateWarm));
              break;
            case 'interpolateCool':
              this.applyColor(d3.scaleSequential(d3.interpolateCool));
              break;
            case 'interpolateCubehelixDefault':
              this.applyColor(
                d3.scaleSequential(d3.interpolateCubehelixDefault)
              );
              break;
            case 'interpolateBuGn':
              this.applyColor(d3.scaleSequential(d3.interpolateBuGn));
              break;
            case 'interpolateBuPu':
              this.applyColor(d3.scaleSequential(d3.interpolateBuPu));
              break;
            case 'interpolateGnBu':
              this.applyColor(d3.scaleSequential(d3.interpolateGnBu));
              break;
            case 'interpolateOrRd':
              this.applyColor(d3.scaleSequential(d3.interpolateOrRd));
              break;
            case 'interpolatePuBuGn':
              this.applyColor(d3.scaleSequential(d3.interpolatePuBuGn));
              break;
            case 'interpolatePuBu':
              this.applyColor(d3.scaleSequential(d3.interpolatePuBu));
              break;
            case 'interpolatePuRd':
              this.applyColor(d3.scaleSequential(d3.interpolatePuRd));
              break;
            case 'interpolateRdPu':
              this.applyColor(d3.scaleSequential(d3.interpolateRdPu));
              break;
            case 'interpolateYlGnBu':
              this.applyColor(d3.scaleSequential(d3.interpolateYlGnBu));
              break;
            case 'interpolateYlGn':
              this.applyColor(d3.scaleSequential(d3.interpolateYlGn));
              break;
            case 'interpolateYlOrBr':
              this.applyColor(d3.scaleSequential(d3.interpolateYlOrBr));
              break;
            case 'interpolateYlOrRd':
              this.applyColor(d3.scaleSequential(d3.interpolateYlOrRd));
              break;
            default:
              this.applyColor(d3.scaleSequential(d3.interpolateBlues));
          }
        },
        deep: true
      },
      secstreamSplits: function(between) {
        this.applySplits(between);
      }
    },
    methods: {
      applySplits: function(between) {
        secstream.removeSplits();
        if (between) secstream.addSplitsBetweenTimepoints();
        else secstream.addSplitsAtTimepoints();

        secstream.update();
      },
      applyColor: function(colorFunction) {
        stream.color = colorFunction;
        treemap.color = colorFunction;
        secstream.color = colorFunction;
      },
      generate: function() {
        generator.options({
          timesteps: this.timesteps,
          numStreams: this.numStreams,
          maxDepth: this.maxDepth,
          maxChildren: this.maxChildren,
          numMerges: this.numMerges,
          numSplits: this.numSplits,
          numMoveAcross: this.numMoveAcross,
          numMoveAlong: this.numMoveAlong,
          numAdds: this.numAdds,
          numDeletes: this.numDeletes
        });
        this.draw();
      },
      draw: function() {
        generator.generate();
        // need individual objects
        let data1 = TransformData['viscous'](
          JSON.parse(JSON.stringify(generator.get()))
        );
        let data2 = TransformData['viscous'](
          JSON.parse(JSON.stringify(generator.get()))
        );
        let data3 = TransformData['viscous'](
          JSON.parse(JSON.stringify(generator.get()))
        );

        treemap.data(data1);
        treemap.addSplitsBetweenTimepoints();

        stream.data(data2);
        stream.update();

        secstream.data(data3);
        this.applySplits(this.secstreamSplits);
      },
      download: function() {
        saveSvg(document.querySelector('#treemap > svg'), 'treemap');
        saveSvg(document.querySelector('#stream > svg'), 'stream');
        saveSvg(document.querySelector('#secstream > svg'), 'secstream');
        saveJson(generator.get(), 'data');
      },
      wrapperResize(...args) {
        if (stream && treemap && secstream) {
          stream.resize();
          treemap.resize();
          secstream.resize();
        }
      }
    }
  });

  treemap = new SplitStream(document.querySelector('#treemap'));
  treemap.proportion = 0;
  treemap.xSpacing = treemap.xSpacingFixed;
  treemap.xMargin = 1;
  treemap.splitRoot = true;

  stream = new SplitStream(document.querySelector('#stream'));
  //stream.showLabels(this.showLabels);

  secstream = new SplitStream(document.querySelector('#secstream'));
  secstream.proportion = 1;
  secstream.xSpacing = secstream.xSpacingFixed;
  secstream.xMargin = 1;

  document.querySelector('#generate').click();
});
