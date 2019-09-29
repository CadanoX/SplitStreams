import Papa from 'papaparse';

import SplitStreamInputData from '../src/SplitStreamInputData';

export default class LoaderMeSH {
  constructor() {
    this._meshData = [];
    this._meshChanges = {};
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

    this._meshChanges[t] = parse.data;
  }

  applyChanges() {
    for (let t in this._meshChanges) {
      let changes = this._meshChanges[t];
      for (let change of changes) {
        let oldId = change[1];
        let newId = change[2];
        if (oldId != '' || newId != '')
          // move
          this._data.addNext(t - 1, oldId, newId);
      }
    }
  }

  // Branch is only a workaround before filters are accurately implemented
  transformToTree(branch) {
    this._data = new SplitStreamInputData();
    let t = 0;
    let currentBranch = 0;
    let branchName = '';

    // find name of the branch
    for (let entry of this._meshData[0]) {
      if (entry[1]) {
        let path = entry[1].split('.');
        if (path.length == 1) {
          // node has no parent --> is main branch
          if (currentBranch == branch) {
            branchName = path[0];
            break;
          }
          currentBranch++;
        }
      }
    }

    if (branchName == '') {
      console.error('Selected branch does not exist.');
      return;
    }

    console.log(branchName);

    for (let tree of this._meshData) {
      for (let entry of tree) {
        let name = entry[0];
        let id = entry[1];
        if (name == '') continue;

        // the id looks like 1.12.5.123, where 1 is the parent of 1.12 is the parent of 1.12.5 is the parent of 1.12.5.123
        let parts = id.split('.');
        let currentBranchName = parts[0];
        parts.pop(); // remove the last part of the id
        let parentId = parts.join('.'); // reconnect all parts into the parent's id

        if (currentBranchName == branchName) {
          // add node to data
          this._data.addNode(t, id, undefined, undefined, name);

          if (parentId != '') {
            //this._data.addNode(t, parentId);
            this._data.addParent(t, id, parentId);
          }
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
