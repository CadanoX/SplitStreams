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
    return this._fitleredData;
  }

  select(nodeId) {}
}
