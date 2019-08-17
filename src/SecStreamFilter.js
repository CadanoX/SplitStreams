export default class SecStreamFilter {
  // expects SecStreamInputData.data as input
  constructor(inputData, options = {}) {
    this._opts = {
      ...options // overwrite default settings with user settings
    };
    this._inputData = inputData;
    this._fitleredData = [];
  }

  get data() {
    this._filteredData.references = [...this._inputData];
    return this._filteredData;
  }

  maxDepth(maxDepth) {
    let traverse = node => {
      if (node.depth == maxDepth) {
      } else {
        if (!!node.children) for (let child of node.children) traverse(child);
      }
    };

    for (let time of this._inputData._timesteps) {
      traverse(time.tree);
    }
  }

  select(nodeId) {}
}
