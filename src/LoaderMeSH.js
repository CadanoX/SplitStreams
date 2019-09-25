import Papa from 'papaparse';

import SplitStreamInputData from '../src/SplitStreamInputData';

export default class LoaderMeSH {
  constructor() {
    this._meshData = [];
    this._data = new SplitStreamInputData();
  }

  get data() {
    return this._data;
  }

  async loadFile(filename) {
    let parse;
    try {
      // fetch file from server
      let response = await fetch(filename);
      let text = await response.text();
      // parse data
      parse = Papa.parse(text);
    } catch (e) {
      console.error(e);
      return false;
    }

    this._meshData.push(parse.data);
  }

  async loadFileChanges(filename, t) {
    let parse;
    try {
      // fetch file from server
      let response = await fetch(filename);
      let text = await response.text();
      // parse data
      parse = Papa.parse(text);
    } catch (e) {
      console.error(e);
      return false;
    }

    for (let change of parse.data) {
      let name = change[0];
      let oldId = change[1];
      let newId = change[2];
      if (oldId != '' || newId != '') {
        // move
        this._data.addNext(t - 1, oldId, newId);
      }
    }
  }

  transformToTree() {
    let t = 0;
    for (let tree of this._meshData) {
      console.log('start timestep ' + t);

      for (let entry of tree) {
        let name = entry[0];
        let id = entry[1];
        if (name == '') continue;

        // add node to data
        this._data.addNode(t, id);

        // the id looks like 1.12.5.123, where 1 is the parent of 1.12 is the parent of 1.12.5 is the parent of 1.12.5.123
        let parts = id.split('.');
        parts.pop(); // remove the last part of the id
        let parentId = parts.join('.'); // reconnect all parts into the parent's id

        if (parentId != '') {
          //this._data.addNode(t, parentId);
          this._data.addParent(t, id, parentId);
        }
      }
      t++;
    }
  }

  done() {
    this._data._buildTimeConnections();
    this._data.finalize();
  }
}
