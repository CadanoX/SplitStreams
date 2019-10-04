export default class SplitStreamInputData {
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
      console
        .log
        // `Warning AddNode: Node ${id} at timestep ${t} exists already.`
        ();
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
    let time1 = this._timesteps[t];
    let time2 = this._timesteps[+t + 1];
    if (!time1 || !time2) {
      // console.log(`Error 'addNext': Timestep '${+t + 1}' does not exist.`);
      return false;
    }

    let node = time1.references[id];
    let nextNode = time2.references[nextId];
    if (!node || !nextNode) {
      // console.log(`Error 'addNext': Node '${id}' does not exist.`);
      return false;
    }

    // console.log(`Change timestep ${t}: ${id} to ${nextId}`);
    if (!node.next) node.next = [];
    node.next.push(nextNode);
    if (!nextNode.prev) nextNode.prev = [];
    nextNode.prev.push(node);
    return true;
  }

  finalize() {
    this._checkParents();

    this.__forEachNodeDepthFirst((node, depth) => {
      this._setSizeAndAggregate(node);
      node.depth = depth;
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
    let traverse = function(node, depth) {
      if (!!node.children)
        node.children.forEach(child => traverse(child, depth + 1));
      callback(node, depth);
    };

    for (let t in this._timesteps) traverse(this._timesteps[t].tree, 0);
  }

  _createTimestep(t) {
    this._timesteps[t] = {
      references: {},
      tree: null
    };
  }

  // connect nodes which have the same ID in consecutive timesteps
  _buildTimeConnections() {
    for (let t in this._timesteps) {
      if (!!this._timesteps[+t + 1]) {
        let nodes = this._timesteps[t].references;
        let nodes2 = this._timesteps[+t + 1].references;
        for (let id in nodes) {
          if (!!nodes2[id]) {
            // do not build connections if the nodes next elements were manually set
            if (!nodes[id].next) nodes[id].next = [nodes2[id]];
            if (!nodes2[id].prev) nodes2[id].prev = [nodes[id]];
          }
        }
      }
    }
  }
}
