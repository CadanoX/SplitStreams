export default class SecStreamInputData {
  constructor(options = {}) {
    this._opts = {
      forceFakeRoot: false,
      ...options // overwrite default settings with user settings
    };
    // hold a tree (root node) for each timestep
    // hold a reference array which includes all nodes present in a single timestep
    this._timesteps = [];
  }

  get data() {
    return { timesteps: this._timesteps };
  }

  addNode(t, id, size = undefined, pos = undefined, data = undefined) {
    if (!this._timesteps[t]) this._createTimestep(t);

    if (!this._timesteps[t].references[id]) {
      let dataSize = +size;
      let dataPos = +pos;
      id = String(id);
      // size = +size;
      // pos = +pos;
      this._timesteps[t].references[id] = {
        id,
        dataSize,
        dataPos,
        size,
        pos,
        data
      };
    } else
      console.log(
        // `Warning AddNode: Node ${id} at timestep ${t} exists already.`
      );
  }

  addParent(t, id, pId) {
    if (!pId) return;
    let nodes = this._timesteps[t].references;
    let node = nodes[id];
    let parent = nodes[pId];
    if (!node) {
      // console.log(`Error 'addParent': Node '${id}' does not exist.`);
      return;
    }
    if (!parent) {
      // console.log(`Error 'addParent': Parent node '${pId}' does not exist.`);
      return;
    }
    node.parent = parent;
    if (!parent.children) parent.children = [];
    parent.children.push(node);
  }

  addNext(t, id, nextId) {
    if (!this._timesteps[+t + 1]) {
      // console.log(`Error 'addNext': Timestep '${+t + 1}' does not exist.`);
      return;
    }
    let node = this._timesteps[t].references[id];
    if (!node) {
      // console.log(`Error 'addNext': Node '${id}' does not exist.`);
      return;
    }
    let nextNode = this._timesteps[+t + 1].references[nextId];
    if (!nextNode)
      ;// console.log(`Error 'addNext': Next node  '${nextId}' does not exist.`);
    else {
      if (!node.next) node.next = [];
      node.next.push(nextNode);
      if (!nextNode.prev) nextNode.prev = [];
      nextNode.prev.push(node);
    }
  }

  finalize() {
    this._checkParents();

    this.__forEachNodeDepthFirst(node => {
      this._setSizeAndAggregate(node);
      this._checkSize(node);
      this._checkPositions(node);
    });
  }

  // check if all nodes except the root have a parent
  // if multiple roots exist, create a fake root
  _checkParents() {
    let nodesWithoutParents = {};
    for (let t in this._timesteps) {
      let nodes = this._timesteps[t].references;
      for (let id in nodes) {
        let node = nodes[id];
        if (!node.parent) {
          if (!nodesWithoutParents[t]) nodesWithoutParents[t] = [];
          nodesWithoutParents[t].push(node);
        }
      }
    }

    let fakeRootNeeded = false;
    for (let t in nodesWithoutParents) {
      if (nodesWithoutParents[t].length > 1) {
        fakeRootNeeded = true;
        break;
      }
    }

    if (fakeRootNeeded || this._opts.forceFakeRoot) {
      let prevT;
      for (let t in nodesWithoutParents) {
        this.addNode(t, 'fakeRoot');
        nodesWithoutParents[t].forEach(node => {
          this.addParent(t, node.id, 'fakeRoot');
          this._timesteps[t].tree = this._timesteps[t].references['fakeRoot'];
        });
        // connect fake roots
        if (!!prevT) {
          this.addNext(prevT, 'fakeRoot', 'fakeRoot');
        }
        prevT = t;
      }
    } else {
      // every timepoint has a single root node
      for (let t in nodesWithoutParents) {
        this._timesteps[t].tree = nodesWithoutParents[t][0];
      }
    }
  }

  _setSizeAndAggregate(node) {
    if (!!node.children) {
      node.aggregate = 0;
      for (let child of node.children) node.aggregate += child.dataSize;
      if (Number.isNaN(node.dataSize)) node.dataSize = node.aggregate;
    } else {
      if (Number.isNaN(node.dataSize)) node.dataSize = 1;
      node.aggregate = node.dataSize;
    }
  }

  _checkSize(node) {
    if (node.dataSize < node.aggregate) {
      // console.log('Error: Node has a smaller size than its children.');
      // console.log(node);
    }
  }

  // check if size of parent elements is bigger than the aggregate of the sizes of its children
  _checkPositions(node) {
    if (!!node.children) {
      let minPos = 0;
      for (let child of node.children) {
        if (child.pos >= 0) {
          if (minPos > child.pos) {
            // console.log('Error: Children positions overlap each other.');
            // console.log(node);
          }
          minPos = child.pos + child.dataSize;
        }
      }
    }
  }

  __forEachNodeDepthFirst(callback) {
    let traverse = function (node) {
      if (!!node.children) node.children.forEach(traverse);
      callback(node);
    };

    for (let t in this._timesteps) traverse(this._timesteps[t].tree);
  }

  _createTimestep(t) {
    this._timesteps[t] = {
      references: {},
      tree: null
    };
  }

  _buildTimeConnections() {
    for (let t in this._timesteps) {
      if (!!this._timesteps[+t + 1]) {
        let nodes = this._timesteps[t].references;
        let nodes2 = this._timesteps[+t + 1].references;
        for (let id in nodes) {
          if (!!nodes2[id]) {
            nodes[id].next = [nodes2[id]];
            nodes2[id].prev = [nodes[id]];
          }
        }
      }
    }
  }
}
