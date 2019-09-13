export default class SplitStreamFilter {
  // expects SplitStreamInputData.data as input
  constructor(inputData, options = {}) {
    this._opts = {
      ...options // overwrite default settings with user settings
    };
    this._inputData = inputData;
    this._filteredData = [];
  }

  get data() {
    return this._filteredData;
  }

  _reset() {
    this._filteredData = [...this._inputData];
  }

  maxDepth(maxDepth) {
    let traverse = node => {
      if (node.depth == maxDepth) {
        node.show;
      } else {
        if (!!node.children) for (let child of node.children) traverse(child);
      }
    };

    for (let time of this._inputData._timesteps) {
      traverse(time.tree);
    }
  }

  select(nodeId) { }
}
