export default class SplitStreamInputData {
  constructor(options = {}) {
    this._opts = {
      forceFakeRoot: false,
      order: 'minimizeEdgeCrossings',
      ...options // overwrite default settings with user settings
    };
    // hold a tree (root node) for each timestep
    // hold a reference array which includes all nodes present in a single timestep
    // TODO: if timesteps do not start with 0, for ... of loops give back undefined until the first timestep is reached
    // TODO: The problem is that an array does contain all inbetween values, but a for ... in loop in an object converts numbers to strings again
    // maybe prove a nextTimestep function for convenience
    // or store the keys for timesteps in an individual array and use integer indices from 0 to n internally
    // also requires convenience function to not write +t + 1 every time
    this._timesteps = {};
    this._numNodes = 0;
  }

  get data() {
    return { timesteps: this._timesteps, numNodes: this._numNodes };
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
      this._numNodes++;
    } else; // console.log(`Warning AddNode: Node ${id} at timestep ${t} exists already.`);
  }

  addParent(t, id, pId) {
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

    this.__forEachNodeDepthFirst((node, depth, t) => {
      node.x = +t;
      node.depth = depth;
      this._setSizeAndAggregate(node);
      this._checkSize(node);
      this._checkPositions(node);
    });

    if (this._opts.order == 'minimizeEdgeCrossings')
      this.minimizeEdgeCrossings();
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

  // if node does not have a size, set it's size to the sum of the sizes of its children
  // if a node does not have a size and does not have children, give it size 1
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
    let traverse = function(node, depth, t) {
      if (!!node.children)
        node.children.forEach(child => traverse(child, depth + 1, t));
      callback(node, depth, t);
    };

    for (let t in this._timesteps) traverse(this._timesteps[t].tree, 0, t);
  }

  _createTimestep(t) {
    this._timesteps[t] = {
      references: {},
      tree: null
    };
  }

  // connect nodes which have the same ID in consecutive timesteps
  connectEqualIds() {
    for (let t in this._timesteps) {
      if (!!this._timesteps[+t + 1]) {
        let nodes = this._timesteps[t].references;
        let nodes2 = this._timesteps[+t + 1].references;
        for (let id in nodes) {
          if (!!nodes2[id]) {
            // do not build connections if the nodes next elements were manually set
            if (!nodes[id].next) nodes[id].next = [];
            if (!nodes2[id].prev) nodes2[id].prev = [];

            nodes[id].next.push(nodes2[id]);
            nodes2[id].prev.push(nodes[id]);
          }
        }
      }
    }
  }

  // following the algorithm by Shixia Liu et al. in StoryFlow, based on
  // Methods for Visual Understanding of Hierarchical System Structures by Sugiyama et al.
  minimizeEdgeCrossings(iterations = 100) {
    // create t-1 adjacency matrices for leave nodes
    let leaves = this.__getLeafNodes();
    let M = this.__getAdjacencyMatrices(leaves);
    let timesteps = Object.keys(this._timesteps);

    let calculateBarycenterCols = t => {
      for (let l in leaves[t])
        leaves[t][l].barycenter = this.__getBarycenterCol(M[t - 1], l);
    };

    let calculateBarycenterRows = t => {
      for (let l in leaves[t])
        leaves[t][l].barycenter = this.__getBarycenterRow(M[t], l);
    };

    let reorder = t => {
      this.__orderByBarycenter(this._timesteps[t].tree);
      let newOrder = this.__getNewOrder(this._timesteps[t].tree);
      applyOrder(t, newOrder);
    };

    let applyOrder = (t, order) => {
      // reorder matrix rows
      if (M[t]) M[t] = order.map(i => M[t][i]);
      // reorder same nodes in previous matrix columns
      if (M[t - 1])
        M[t - 1].forEach((row, i) => (M[t - 1][i] = order.map(i => row[i])));
      // reorder leaf array
      leaves[t] = order.map(i => leaves[t][i]);
    };

    //sweep right, reorder columns based on barycenters
    let phase1Down = () => {
      for (let tId = 1; tId < timesteps.length; tId++) {
        let t = timesteps[tId];
        calculateBarycenterCols(t);
        reorder(t);
      }
    };

    // sweep left, reorder rows
    let phase1Up = () => {
      for (let tId = timesteps.length - 2; tId >= 0; tId--) {
        let t = timesteps[tId];
        calculateBarycenterRows(t);
        reorder(t);
      }
    };

    // sweep right, reverse order of nodes with equal barycenter
    let phase2Down = () => {
      for (let tId = 1; tId < timesteps.length; tId++) {
        let t = timesteps[tId];
        calculateBarycenterCols(t);
        this.__reverseEqualBarycenters(this._timesteps[t].tree);
        let newOrder = this.__getNewOrder(this._timesteps[t].tree);
        applyOrder(t, newOrder);
      }
    };

    let phase2Up = () => {
      for (let tId = timesteps.length - 2; tId >= 0; tId--) {
        let t = timesteps[tId];
        calculateBarycenterRows(t);
        this.__reverseEqualBarycenters(this._timesteps[t].tree);
        let newOrder = this.__getNewOrder(this._timesteps[t].tree);
        applyOrder(t, newOrder);
      }
    };

    for (let i = 0; i < iterations; i++) {
      if (i % 2 == 0) {
        phase1Down();
        phase2Down();
        phase2Up();
      } else {
        phase1Up();
        phase2Up();
        phase2Down();
      }

      // TODO: stop if all rows and columns are sorted ascending
      // this is the case when no order changed in an iteration
    }
  }

  // takes an array of barycenter values as input
  // outputs an array of new indices, where elements with equal values are reversed
  __reverseIndicesOfEqualValues(array) {
    let result = [];
    // create an object that contains for each value an array of indices that have this value
    let equals = {};
    array.forEach((val, idx) => {
      if (!equals[val]) equals[val] = [];
      equals[val].push(idx);
    });
    // for each value reverse the index order
    for (let val in equals) {
      let indices = equals[val];
      indices.forEach((idx, i) => {
        result[idx] = indices[indices.length - i - 1];
      });
    }
    return result;
  }

  __reverseEqualBarycenters(tree) {
    let numLeaves = 0;
    let traverse = node => {
      if (!node.children) node.bcMatrixPosition = numLeaves++;
      else {
        node.children.forEach(child => traverse(child));
        // extract an array of barycenters in order
        let barycenterArray = node.children.map(d => d.barycenter);
        // reverse the order of equal barycenters
        let newOrder = this.__reverseIndicesOfEqualValues(barycenterArray);
        // reorder children
        node.children = newOrder.map(idx => node.children[idx]);
      }
    };
    traverse(tree);
  }

  __getNewOrder(tree) {
    let order = [];
    let newLeafOrder = node => {
      if (node.children) node.children.forEach(child => newLeafOrder(child));
      else order.push(node.bcMatrixPosition);
    };
    newLeafOrder(tree);
    return order;
  }

  // bcMatrixRange defines the area of the adjacency matrix in which the node has influence
  // this is necesasry because of hierarchy nodes that span a wider range
  __orderByBarycenter(tree) {
    let numLeaves = 0;
    let traverse = node => {
      if (!node.children) node.bcMatrixPosition = numLeaves++;
      else {
        node.barycenter = 0; // hierarchy nodes get the average of their childrens' barycenter
        let numInvolvedChildren = 0;
        node.children.forEach((child, i) => {
          traverse(child);
          // child.index = i; // store previous child index
          if (!Number.isNaN(child.barycenter)) {
            node.barycenter += child.barycenter;
            numInvolvedChildren++;
          }
        });
        if (numInvolvedChildren > 0) node.barycenter /= numInvolvedChildren;

        node.children.sort((a, b) => {
          if (Number.isNaN(a.barycenter) || Number.isNaN(b.barycenter))
            return 0;
          if (a.barycenter == b.barycenter) return 0;
          else return a.barycenter > b.barycenter ? 1 : -1;
        });
      }
    };

    traverse(tree);
  }

  __getLeafNodes() {
    let leaves = {};
    this.__forEachNodeDepthFirst((node, depth, t) => {
      if (!node.children) {
        if (!leaves[t]) leaves[t] = [];
        leaves[t].push(node);
      }
    });
    return leaves;
  }

  __getAdjacencyMatrices(leaves) {
    let M = [];
    for (let t in this._timesteps) {
      let left = leaves[t];
      let right = leaves[+t + 1];
      if (right)
        // skip the last timestep
        M[t] = this.__getAdjacencyMatrix(left, right);
    }
    return M;
  }

  __getAdjacencyMatrix(left, right) {
    let targetLookup = {};
    let M = [];
    for (let i = 0; i < left.length; i++) {
      M[i] = Array(right.length).fill(0);
      for (let j = 0; j < right.length; j++) targetLookup[right[j].id] = j;
      // set edges to 1
      if (left[i].next)
        for (let next of left[i].next) {
          // only if the edge goes to one of the leaf nodes
          if (typeof M[i][targetLookup[next.id]] !== 'undefined')
            M[i][targetLookup[next.id]] = 1;
        }
    }
    return M;
  }

  // variable names match the equation given in the paper by Sugiyama et al.
  __getNumCrossings(matrix) {
    let crossings = 0;
    let p = matrix.length; // row length (num of leaves in the left layer)
    let q = matrix[0].length; // column length
    for (let j = 0; j < p - 1; j++)
      for (let k = j + 1; k < p; k++)
        for (let a = 0; a < q - 1; a++)
          for (let b = a + 1; b < q; b++)
            crossings += matrix[j][b] * matrix[k][a];
    return crossings;
  }

  __getBarycenterRow(matrix, row) {
    let barycenter = 0;
    let sum = 0;
    let q = matrix[0].length;

    for (let l = 0; l < q; l++) {
      barycenter += (l + 1) * matrix[row][l];
      sum += matrix[row][l];
    }
    return barycenter / sum; // || 0;
  }

  __getBarycenterCol(matrix, col) {
    let barycenter = 0;
    let sum = 0;
    let p = matrix.length;

    for (let l = 0; l < p; l++) {
      barycenter += (l + 1) * matrix[l][col];
      sum += matrix[l][col];
    }
    return barycenter / sum; //|| 0;
  }

  // sort all children of a node by their number of children
  __sortChildrenByNumChildren() {
    for (let t in this._timesteps) {
      let nodes = this._timesteps[t].references;
      for (let id in nodes) {
        let node = nodes[id];
        if (node.children)
          node.children.sort((a, b) => {
            if (a.children && b.children)
              return a.children.length > b.children.length ? 1 : -1;
            else if (a.children) return 1;
            else return -1;
          });
      }
    }
  }
}
