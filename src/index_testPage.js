import * as d3 from 'd3';
import SecStream from '../src/SecStream.js';

import {
  loadJSON,
  getRandomColor,
  saveSvg,
  saveJson,
  transformViscousFormat,
  transformGumtreeFormat,
  loadTitanFormat,
  loadAllenFormat
} from '../src/functions.js';

const tests = {
  add: require('../data/test_add.json'),
  delete: require('../data/test_delete.json'),
  merge: require('../data/test_merge.json'),
  moveAcross: require('../data/test_moveAcross.json'),
  moveAlong: require('../data/test_moveAlong.json'),
  nesting: require('../data/test_nesting.json'),
  parentSwap: require('../data/test_parentSwap.json'),
  posChange: require('../data/test_posChange.json'),
  split: require('../data/test_split.json'),
  valueChange: require('../data/test_valueChange.json')
};

const wrapper = document.querySelector('#app');
document.querySelector('#download').onclick = function() {
  let svgs = document.querySelectorAll('svg');
  for (let svg of svgs) saveSvg(svg, svg.parentNode.parentNode.id);
};

for (let test in tests) {
  let div = document.createElement('div');
  div.className = 'test';
  div.id = test;
  wrapper.appendChild(div);

  let testName = document.createElement('div');
  testName.innerHTML = test;
  testName.className = 'name';
  div.appendChild(testName);

  let testResult = document.createElement('div');
  testResult.className = 'result';
  testResult.id = test + 'result';
  div.appendChild(testResult);

  let data = tests[test];
  let format = data.format;
  if (format == 'gumtree') data = transformGumtreeFormat(data);
  else if (format == 'viscous') data = transformViscousFormat(data);
  else console.log('Data format "' + format + '" is not supported.');

  let stream = new SecStream(testResult, {
    drawStroke: true,
    zoomTimeFactor: 1,
    width: 200,
    height: 200,
    margin: { top: 5, bottom: 5, right: 5, left: 5 }
  }).data(data);

  if (format == 'viscous') stream.yPadding = 1;

  stream.update();
  // stream.color = d3.scaleSequential(d3.interpolateViridis);
}
