import SecStream from './SecStream';
import TransformData from './TransformData';

import {
  loadJSON,
  getRandomColor,
  saveSvg,
  saveJson,
} from './functions';

async function getData(tests) {
  tests.add = await (await fetch('/data/test_add.json')).json();
  tests.delete = await (await fetch('/data/test_delete.json')).json();
  tests.merge = await (await fetch('/data/test_merge.json')).json();
  tests.moveAcross = await (await fetch('/data/test_moveAcross.json')).json();
  tests.moveAlong = await (await fetch('/data/test_moveAlong.json')).json();
  tests.nesting = await (await fetch('/data/test_nesting.json')).json();
  tests.parentSwap = await (await fetch('/data/test_parentSwap.json')).json();
  tests.posChange = await (await fetch('/data/test_posChange.json')).json();
  tests.split = await (await fetch('/data/test_split.json')).json();
  tests.valueChange = await (await fetch('/data/test_valueChange.json')).json();
};

let tests = {};
getData(tests).then(() => {
  const wrapper = document.querySelector('#app');
  document.querySelector('#download').onclick = function () {
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
});
