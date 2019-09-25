import { parse, stringify } from 'flatted/esm';
import SplitStreamInputData from './SplitStreamInputData.js';

export default class SplitStreamFilter {
  // expects SplitStreamInputData.data as input
  constructor(inputData, options = {}) {
    this._opts = {
      ...options // overwrite default settings with user settings
    };
    if (!inputData instanceof SplitStreamInputData)
      throw Exeption('Added data is not an instance of SplitStreamData');
    this.__inputData = inputData;
    this._filteredData;
    this._lastMaxDepth = 0;
    this._reset();
  }

  get data() {
    return this._filteredData;
  }

  _reset() {
    let json = stringify(this.__inputData.data);
    this._filteredData = parse(json);
    this._filteredData.timesteps = this._filteredData.timesteps.filter(d => d);
    return this;
  }

  maxDepth(maxDepth) {
    // if (maxDepth > this._lastMaxDepth) this._reset();

    let traverse = node => {
      if (node.depth >= maxDepth) {
        node.children = [];
      } else {
        if (!!node.children) for (let child of node.children) traverse(child);
      }
    };

    for (let time of this._filteredData.timesteps) {
      if (!!time)
        // TODO: Check why some entries are empty
        traverse(time.tree);
    }
    return this;
  }

  branch(branchNr) {
    branchNr = +branchNr;
    // this._reset();
    for (let time of this._filteredData.timesteps) {
      if (!!time) {
        // TODO: Check why some entries are empty
        let branches = time.tree.children;
        // remove branches after branchNr
        if (branchNr < branches.length - 1) branches.splice(branchNr + 1);
        // remove branches before branchNr
        if (branchNr > 0) branches.splice(0, branchNr);
      }
    }
    return this;
  }

  select(nodeId) {}
}
