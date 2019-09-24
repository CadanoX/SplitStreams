import Papa from "papaparse";

import SplitStreamInputData from '../src/SplitStreamInputData';

export default class LoaderMeSH {
  constructor() {
    this._meshData = [];
    this._data = new SplitStreamInputData();
  }

  get data() {
    return this._data.data;
  }

  loadFile(filename) {
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

  loadFileChanges(filename, year) {
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


  }

  transformToTree() {
    let t = 0;
    for (let tree of this._meshData) {
      console.log("start timestep " + t);

      for (let entry of tree) {
        let name = entry[0];
        let id = entry[1];
        if (name == "") continue;

        // add node to data
        format.addNode(t, id);

        // the id looks like 1.12.5.123, where 1 is the parent of 1.12 is the parent of 1.12.5 is the parent of 1.12.5.123
        let parts = id.split(".");
        parts.pop(); // remove the last part of the id
        let parentId = parts.join("."); // reconnect all parts into the parent's id

        if (parentId != "") {
          //format.addNode(t, parentId);
          format.addParent(t, id, parentId);
        }
      }
      t++;
    }
    this._data._buildTimeConnections();
    this._data.finalize();
  }
}
