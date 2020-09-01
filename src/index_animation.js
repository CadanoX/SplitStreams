import SplitStream from "./SplitStream";
import TransformData from "./TransformData";

var stream;

let fps = 30;
let duration = 2000;
let pause = 1000;

let animationFrames = (duration / 1000) * fps;
let dt = 1000 / fps;
let lambda = 1 / animationFrames;

async function getData(path) {
  return await (await fetch(path)).json();
}

// data is defined in data.js
// var tData = transformGumtree(data);

document.addEventListener("DOMContentLoaded", async function(event) {
  const wrapper = document.querySelector("#wrapper");
  // let data = await getData('./data/flowvis4Steps.json');
  // let tData = TransformData[data.format](data);
  // createStream(tData);
  // setTimeout(animate, 1000);

  let data = await getData("./data/explanation.json");
  let tData = TransformData["viscous"](data);
  createStream2(tData);
  // setTimeout(animate2, 1000);
  // setTimeout(animate3, 1000);

  stream.proportion = 0.5;
  stream.xMargin = 0;
  setTimeout(animate4, 1000);
});

function createStream(tData) {
  stream = new SplitStream(wrapper, {
    // drawStroke: true,
    zoomTimeFactor: 1,
    margin: { top: 5, bottom: 5, right: 5, left: 5 },
    unifySize: true,
    xMargin: 1,
    yPadding: 0.75,
    splitRoot: true
  }).data(tData);

  stream.proportion = 0;
  stream.addSplitsBetweenTimepoints();
  stream.filters([
    { type: "double-inner-shadow", dx: 0, dy: 0, stdDeviation: 0.2 },
    { type: "drop-shadow", dx: 0, dy: 0, stdDeviation: 0.6 }
  ]);

  stream.update();
  // stream.color = d3.scaleSequential(d3.interpolateViridis);
}

function createStream2(tData) {
  stream = new SplitStream(wrapper, {
    // drawStroke: true,
    zoomTimeFactor: 1,
    margin: { top: 5, bottom: 5, right: 5, left: 5 },
    xMargin: 2,
    yPadding: 0,
    splitRoot: true
  }).data(tData);

  stream.proportion = 0;
  stream.addSplitsBetweenTimepoints();
  stream.filters([
    { type: "double-inner-shadow", dx: 0, dy: 0, stdDeviation: 0.2 },
    { type: "drop-shadow", dx: 0, dy: 0, stdDeviation: 0.6 }
  ]);

  stream.update();
}

function animate() {
  let timer = 0;

  // remove xMargin
  for (let i = 1; i <= animationFrames; i++)
    setTimeout(() => (stream.xMargin = 1 - i * lambda), (timer += dt));

  // adjust splits
  setTimeout(() => {
    stream.splitRoot = false;
    stream.removeSplits();
    stream.addSplitsAtTimepoints();
  }, (timer += pause));

  // make to nested streamgraph
  for (let i = 1; i <= animationFrames; i++)
    setTimeout(() => (stream.proportion = i * lambda), (timer += dt));

  // pause
  timer += pause;

  // set proportion to 0.5
  for (let i = 1; i <= animationFrames; i++)
    setTimeout(() => (stream.proportion = 1 - 0.5 * i * lambda), (timer += dt));

  // pause
  // timer += pause;

  // add xMargin
  for (let i = 1; i <= animationFrames; i++)
    setTimeout(() => (stream.xMargin = i * lambda), (timer += dt));
}

function animate2() {
  let timer = 0;

  // make sure that the root margin is not removed
  setTimeout(
    () =>
      (stream.xSpacing = (node) => {
        if (node.depth == 0) return 0.2;
        else return stream._opts.xMargin / 10;
      }),
    timer
  );

  // remove xMargin
  for (let i = 1; i <= animationFrames; i++)
    setTimeout(() => (stream.xMargin = 2 - 2 * i * lambda), (timer += dt));

  // pause
  timer += pause;

  // make tiny
  setTimeout(() => {
    stream.automaticUpdate = false;
    stream.xSpacing = (node) => {
      if (node.depth == 0) return stream._opts.xMargin;
      else return 0;
    };
    stream.automaticUpdate = true;
  }, timer);

  for (let i = 1; i <= animationFrames; i++)
    setTimeout(() => (stream.xMargin = 0.2 + 0.75 * i * lambda), (timer += dt));
}

function animate3() {
  let timer = 0;

  stream.xSpacing = (node) => {
    if (node.depth == 0) return stream._opts.xMargin;
    else return 0;
  };
  stream.xMargin = 0.95;

  // pause
  timer += pause;

  // make bigger
  for (let i = 1; i <= animationFrames; i++)
    setTimeout(
      () => (stream.xMargin = 0.95 - 0.45 * i * lambda),
      (timer += dt)
    );
}

function animate4() {
  let timer = 0;

  // HCR 0
  for (let i = 1; i <= animationFrames; i++)
    setTimeout(
      () => (stream.proportion = 0.5 + 0.5 * i * lambda),
      (timer += dt)
    );

  // pause
  timer += pause;

  // HCR 1
  for (let i = 1; i <= animationFrames; i++)
    setTimeout(() => (stream.proportion = 1 - i * lambda), (timer += dt));

  // pause
  timer += pause;

  // treemap
  for (let i = 1; i <= animationFrames; i++)
    setTimeout(() => (stream.xMargin = i * lambda), (timer += dt));

  // pause
  timer += pause;

  // undo treemap
  for (let i = 1; i <= animationFrames; i++)
    setTimeout(() => (stream.xMargin = 1 - i * lambda), (timer += dt));

  // pause
  timer += pause;

  // HCR 0.5
  for (let i = 1; i <= animationFrames; i++)
    setTimeout(() => (stream.proportion = 0.5 * i * lambda), (timer += dt));

  // pause
  timer += pause;

  setTimeout(() => {
    stream.splitRoot = false;
    stream.removeSplits();
    stream.addSplitsAtTimepoints();
  }, timer);

  // SplitStream
  for (let i = 1; i <= animationFrames; i++)
    setTimeout(() => (stream.xMargin = i * lambda), (timer += dt));
}
