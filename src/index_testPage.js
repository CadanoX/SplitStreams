import SplitStream from './SplitStream';
import TransformData from './TransformData';

import { loadJSON, getRandomColor, saveSvg, saveJson } from './functions';
import { merge } from 'd3-array';

const path = './data/tests/';
const filenames = [
  'add',
  'delete',
  'merge',
  'moveAcross',
  'moveAlong',
  'nesting',
  'parentSwap',
  'posChange',
  'split',
  'valueChange',
  'split-merge'
];

async function getData(tests) {
  for (let filename of filenames) {
    tests[filename] = await (await fetch(path + filename + '.json')).json();
  }
}

let tests = {};
getData(tests).then(() => {
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
    data = TransformData[format](data);

    let stream = new SplitStream(testResult, {
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
});
