import Papa from 'papaparse';
import SplitStreamInputData from '../src/SplitStreamInputData';

export default class LoaderMeSH {
  constructor() {
    this._meshData = [];
    this._meshChanges = [];
    this._data = new SplitStreamInputData();

    this._branchList = []; // only stores branches of first tree
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

    if (this._meshData.length === 1) this._storeBranchNames();
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

    // remove additions and deletes from changes, because they are automatically covered
    this._meshChanges.push([]);
    for (let change of parse.data) {
      if (change[1] != '' && change[2] != '')
        this._meshChanges[t - 1].push(change);
    }
  }

  _getParentId(id) {
    // the id looks like 1.12.5.123, where 1 is the parent of 1.12 is the parent of 1.12.5 is the parent of 1.12.5.123
    let parts = id.split('.');
    parts.pop(); // remove the last part of the id
    return parts.join('.'); // reconnect all parts into the parent's id
  }

  _storeBranchNames() {
    let currentBranch = -1;
    for (let entry of this._meshData[0]) {
      if (entry[1]) {
        let path = entry[1].split('.');
        if (path.length == 1) {
          // node has no parent --> is main branch
          this._branchList.push({ name: path[0], children: [] });
          currentBranch++;
        } else if (path.length == 2) {
          if (path[0] == this._branchList[currentBranch].name)
            this._branchList[currentBranch].children.push({ name: path[1] });
        }
      }
    }
  }

  getNumBranches(branchIndex) {
    if (typeof branchIndex === 'undefined')
      // return # main branches
      return this._branchList.length;
    else {
      let branch = this._branchList[branchIndex];
      if (branch) return branch.children.length;
      else return -1;
    }
  }

  getBranchIdFromIndex(branchIndex, subBranchIndex) {
    let branch = this._branchList[branchIndex];
    if (!branch) {
      console.error('Selected branch does not exist.');
      return;
    }
    let branchName = branch.name;

    if (!!subBranchIndex && subBranchIndex != -1) {
      let subBranch = branch.children[subBranchIndex];
      if (!subBranch) {
        console.error('Selected sub branch does not exist.');
        return;
      }
      branchName += '.' + subBranch.name;
    }

    return branchName;
  }

  // _findBranchName(branch) {
  //   let currentBranch = 0;
  //   for (let entry of this._meshData[0]) {
  //     if (entry[1]) {
  //       let path = entry[1].split('.');
  //       if (path.length == 1) {
  //         // node has no parent --> is main branch
  //         if (currentBranch == branch)
  //           return path[0];
  //         currentBranch++;
  //       }
  //     }
  //   }
  //   return undefined;
  // }

  // Branch is only a workaround before filters are accurately implemented
  transformToTree(branchId) {
    console.log(branchId);

    this._data = new SplitStreamInputData();
    let t = 0;

    for (let tree of this._meshData) {
      for (let entry of tree) {
        let name = entry[0];
        let id = entry[1];
        if (name == '') continue;

        if (id.startsWith(branchId)) {
          // add node to data
          this._data.addNode(t, id, undefined, undefined, name);

          let parentId = this._getParentId(id);
          if (parentId != '') {
            //this._data.addNode(t, parentId);
            this._data.addParent(t, id, parentId);
          }
        }
      }
      t++;
    }
  }

  applyChanges() {
    let numChanges = 0;
    for (let t = 0; t < this._meshChanges.length; t++)
      for (let change of this._meshChanges[t]) {
        let changeIsInBranch = this._data.addNext(t, change[1], change[2]);
        if (changeIsInBranch) numChanges++;
      }
    console.log(`changes: ${numChanges}`);
  }

  done() {
    this._data.connectEqualIds();
    this._data.finalize();
  }
}
