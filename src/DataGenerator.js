{
  /* Constructing data based on certain parameters:
      * set the number of timesteps
      * create as many streams as wanted, stretching over the whole time period, without any hierarchy
      * push whole streams as children to other streams --> we now have a static hierarchy
      * create hierarchical changes:
          * add: remove the beginning of a stream (random stream, random timepoint)
              * only for streams without children 
          * remove: remove the end of a stream (random stream, random timepoint)
              * only for streams without children
          * move within:
          * move across: change the parent at a random timepoint and for all following timepoints
          * merge: replace a nodes follow-up node by one of another stream at the same timepoint. remove the end of the former stream
          * split: add a node to the follow-up nodes of another stream at the same timepoint. remove the beginning of the former stream
  */
  class DataGenerator {
    constructor(
      {
        options: opts = {
          timesteps: 0,
          maxDepth: 0,
          maxChildren: 0,
          numMerges: 0,
          numSplits: 0,
          numMoveAcross: 0,
          numMoveAlong: 0,
          numStreams: 0,
          numAdds: 0,
          numDeletes: 0,
          minValue: 1,
          maxValue: 1
        }
      } = {}) {
      this._opts = opts;

      this._data = {
        N: {},
        EN: {},
        ET: {}
      };

      this._basis; // store data after the hierarchy is created to apply hierarchical changes on the same data

      this._id;
      this._numNodes = 0;

    }

    options(opts) { Object.assign(this._opts, opts); }

    generate() {
      this._clear();
      this._genStreams();
      //console.log(Object.keys(this._data.N).length);
      this._genHierarchy();
      //console.log(Object.keys(this._data.N).length);
      this._genMoveAcross();
      //console.log(Object.keys(this._data.N).length);
      this._genMoveAlong();
      //console.log(Object.keys(this._data.N).length);

      //this._genMerges();

      this._genAdds();
      //console.log(Object.keys(this._data.N).length);
      this._genDeletes();
      //console.log(Object.keys(this._data.N).length);

      this._applyWeights();
    }

    get() {
      return this._data;
    }

    _clear() {
      this._id = 0;
      this._numNodes = 0;
      this._data = {
        N: {},
        EN: {},
        ET: {}
      };
    }

    __uniqueID() {
      return (this._id++).toString();
    }

    __parent(node) {
      let { N, EN } = this._data;
      let time = N[node].t;
      for (let parent in EN[time]) {
        for (let child in EN[time][parent])
          if (EN[time][parent][child] == node)
            return parent;
      }
      return undefined;
    }

    __children(node) {
      let { N, EN } = this._data;
      return EN[N[node].t][node];
    }

    // return an array of the nodes in the next timestep, this node maps to
    __next(node) {
      let { N, ET } = this._data;
      if (!!ET[N[node].streamId])
        return ET[N[node].streamId][node];
      else
        return undefined;

    }

    __previous(node) {
      let { N, ET } = this._data;
      let stream = ET[N[node].streamId]
      let prev = []
      for (let streamNode in stream)
        for (let next of stream[streamNode])
          if (next == node)
            prev.push(streamNode);

      return (prev.length) > 0 ? prev : undefined;
    }

    __subtree(node) {
      let children = this.__children(node);
      let subtree = [node];
      for (let child in children)
        subtree.push(...this.__subtree(children[child]))
      return subtree;
    }

    __nodeOrFollowingNodesHaveChildren(node) {
      let children = this.__children(node);
      if (children.length > 0)
        return true;

      let next = this.__next(node);
      if (!!next)
        return this.__nodeOrFollowingNodesHaveChildren(next);

      return false;
    }

    __deleteNode(node) {
      let { N, EN, ET } = this._data;
      let time = N[node].t;
      let stream = N[node].streamId;

      // don't delete node if the node has children
      if (this.__children(node).length > 0) {
        console.log("ERROR deleting node: node has children");
        return;
      }
      // delete in tree
      // delete in children array of parent
      let parent;
      let numParents = 0;
      while (parent = this.__parent(node)) { // we do this because of a bug, normally there should only be one parent
        numParents++;
        if (numParents > 1)
          console.log("WARNING: a node got assigned more than one parent --> this should never have happened")

        let children = this.__children(parent);
        for (let pos = 0; pos < children.length; pos++) {
          if (children[pos] == node) {
            children.splice(pos, 1);
            break;
          }
        }
      }

      // delete node itself
      delete EN[time][node];

      // delete in stream
      // find prev node of the stream and delete node as next
      if (!!ET[stream]) {
        for (let streamNode in ET[stream]) {
          let next = ET[stream][streamNode];
          for (let pos = 0; pos < next.length; pos++) {
            if (next[pos] == node) {
              next.splice(pos, 1);
              if (next.length == 0)
                delete ET[stream][streamNode];
              break;
            }
          }
        }

        if (!!ET[stream][node])
          delete ET[stream][node];
        /*if (Object.keys(ET[stream]).length == 0)
            delete ET[stream];*/
      }

      // delete in nodes
      delete N[node];
    }

    _genStreams() {
      let { numStreams, timesteps } = this._opts;
      let { N, EN, ET } = this._data;

      for (let n = 0; n < numStreams; n++) {
        ET[n] = {};
        let lastId;
        for (let t = 0; t < timesteps; t++) {
          let id = this.__uniqueID();
          // create Node
          N[id] = {
            t: t,
            l: 0, // initialize depth
            modified: false,
            streamId: n // set ID in ET array
          }
          this._numNodes++;
          // create history
          // last timestep does not define a next node
          if (t > 0) {
            ET[n][lastId] = [id];
          }

          lastId = id;
        }
      }
    }

    _genHierarchy() {
      // push complete streams into other streams as their child
      let { numStreams, timesteps } = this._opts;
      let { N, EN } = this._data;
      for (let t = 0; t < timesteps; t++) {
        EN[t] = {};
      }

      // get nodes of first timestep
      let nodesUnassigned = Object.entries(N).filter(([name, val]) => val.t == 0);
      let nodesInHierarchy = {};

      // build a random tree for timepoint 0
      let nodesAssigned = 0;
      while (nodesUnassigned.length > 0) {
        // choose a random node
        let rand = Math.round(Math.random() * (nodesUnassigned.length - 1));
        let node = nodesUnassigned[rand];
        nodesUnassigned.splice(rand, 1);


        // find a random node in the hierarchy to assign to
        let rand2 = Math.round(Math.random() * (nodesAssigned));
        if (rand2 < nodesAssigned)
          // add node as child to its parent
          EN[0][Object.keys(nodesInHierarchy)[rand2]].push(node[0]);
        else // new root node
          N[node[0]].modified = true;

        /*
                        if (nodesAssigned > 0) {
                            // find a random node in the hierarchy to assign to
                            let rand2 = Math.round(Math.random() * (nodesAssigned - 1));
                            EN[0][Object.keys(nodesInHierarchy)[rand2]].push(node[0]);
                        }
                        else {
                            N[node[0]].modified = true; // we later don't want to change the root node
                        }
                        */

        // flag the node to say it is in the hierarchy
        EN[0][node[0]] = [];
        nodesInHierarchy[node[0]] = true;
        nodesAssigned++;
      }

      // set depth values for each node
      let traverse = function (node) {
        for (let child of EN[0][node]) {
          N[child].l++;
          traverse(child);
        }
      }
      for (let node in EN[0]) {
        traverse(node);
      }

      // apply the same hierarchy throughout the whole timeline
      let traverseTime = (node, time = 0) => {
        let nextNodes = this.__next(node);
        // next is either undefined or an array
        if (typeof nextNodes != 'undefined') {
          //take first element, because at this moment only one next element exists
          let next = nextNodes[0];
          // apply same properties
          N[next].l = N[node].l;
          N[next].modified = N[node].modified;

          // apply same hierarchy
          let nextTime = time + 1;
          EN[nextTime][next] = [];
          for (let child of EN[time][node]) {
            let childNext = this.__next(child)[0];
            EN[nextTime][next].push(childNext);
          }

          traverseTime(next, nextTime);
        }
      }
      for (let node in EN[0]) {
        traverseTime(node);
      }

      // copy object
      this._basis = JSON.parse(JSON.stringify(this._data));
    }

    _genMoveAcross() {
      let { numMoveAcross } = this._opts;
      // Nodes, Tree of Trees with timestamp, Reference which maps current node to future node in the timestamp.
      let { N, EN } = this._data;

      // get all nodes that can be moved (not modified yet and not from timestep 0)
      let nodes = Object.entries(N).filter(([id, node]) => node.t > 0 && node.modified == false);

      let setNewDepth = (node, depth) => {
        N[node].l = depth++;
        for (let child of this.__children(node)) {
          setNewDepth(child, depth);
        }
      }

      let moveFollowingNodes = (node, time, parent, newParent, movePos = -1) => {
        // make sure not to create loops
        if (this.__subtree(node).includes(newParent))
          return;

        // find the current node in its parent's children array
        let children = this.__children(parent);
        for (let pos = 0; pos < children.length; pos++) {
          if (children[pos] == node) {
            // remove the node from its parent
            children.splice(pos, 1);
            break;
          }
        }

        // find the new parent's children array
        let newChildren = this.__children(newParent);
        // include the node randomly in the new parent's children array
        if (movePos == -1)
          movePos = Math.round(Math.random() * (newChildren.length - 1));
        // since we update following timesteps, previous moves might have reduced the children array
        else if (movePos > newChildren.length - 1)
          movePos = newChildren.length - 1;

        // add the node as child to the new parent
        newChildren.splice(movePos, 0, node);
        // set new depth value to node
        setNewDepth(node, N[newParent].l + 1);

        // if the next timestep exists
        let next = this.__next(node);
        if (!!next)
          moveFollowingNodes(next[0], time + 1, this.__next(parent)[0], this.__next(newParent)[0], movePos);
      }

      // randomize the array of movable nodes
      let random = nodes.sort(() => Math.random() - 0.5);
      let numMoved = 0;
      for (let i = 0; i < numMoveAcross; i++) {
        // get node from array
        let nodeToMove = random.pop();
        // if user requests more moves than are possible in the data, do only as many as possible
        if (typeof nodeToMove == 'undefined') {
          console.log("Delete: Not enough streams to move across. (Moved " + numMoved + ")");
          break;
        }
        nodeToMove = nodeToMove[0];
        // get the timestep in which the node is defined
        let time = N[nodeToMove].t;

        // choose a new parent in the same timestep in which the node shall move into
        // the new parent can not be in the subtree of the current node
        let subtree = this.__subtree(nodeToMove);
        // the node should not be the current parent, because that would be a moveAlong
        let parent = this.__parent(nodeToMove);
        if (typeof parent == 'undefined') {
          // this should never occur, because the root node was initially flagged as modified
          console.log("ERROR Move across: node has no parent. this state should never be reached")
          continue;
        }
        // the node should not be modified, to not create infinite loops
        let possibleNewParents = Object.entries(EN[time]).filter(([key, val]) => !subtree.includes(key) && key != parent && !N[key].modified);

        if (possibleNewParents.length > 0) {
          // choose one of the possible new parents randomly
          let rand = Math.round(Math.random() * (possibleNewParents.length - 1));
          let newParent = possibleNewParents[rand][0];
          // move node to its new parent and do this for all following timesteps as well
          moveFollowingNodes(nodeToMove, time, parent, newParent);

          // flag as modified, to not modify by other actions
          N[nodeToMove].modified = true;
          numMoved++;
        }
        else
          console.log("Move across: not enough possible parents to move to")
      }
    }

    // move position within a parent
    _genMoveAlong() {
      let { numMoveAlong } = this._opts;
      let { N, EN } = this._data;
      // find nodes with at least two children. Both their children are possible move candidates
      let possibleMoves = [];
      for (let t in EN) {
        // moves at timepoint 0 would not be visible
        if (t != 0) {
          for (let node in EN[t]) {
            let children = EN[t][node];
            if (children.length > 1) {
              for (let child of children) {
                // only move nodes which were not already modified at this timepoint
                if (!N[child].modified)
                  possibleMoves.push(child);
              }
            }
          }
        }
      }

      let moveFollowingNodes = (nodeToMove, time, parent, movePos = -1) => {
        // make sure no previously applied movements are overwritten
        if (N[nodeToMove].modified)
          return;

        let children = this.__children(parent);
        for (let pos = 0; pos < children.length; pos++) {
          if (children[pos] == nodeToMove) {
            if (movePos == -1) {
              // choose a random position different from the node's previous position
              movePos = pos;
              while (movePos == pos)
                movePos = Math.round(Math.random() * (children.length - 1));
            }
            // use the previously assigned random pos
            children.splice(pos, 1);
            children.splice(movePos, 0, nodeToMove);
            break;
          }
        }

        // if the next timestep exists
        let next = this.__next(nodeToMove);
        if (!!next)
          moveFollowingNodes(next[0], time + 1, this.__next(parent)[0], movePos);
      }

      let random = possibleMoves.sort(() => Math.random() - 0.5);
      let numMoved = 0;
      for (let i = 0; i < numMoveAlong; i++) {
        let nodeToMove = random.pop();
        // if user requests more moves than are possible in the data, do only as many as possible
        if (typeof nodeToMove == 'undefined') {
          console.log("Move Along: Not enough streams to move along. (Moved " + numMoved + ")");
          break;
        }
        let time = N[nodeToMove].t;
        // move node in all following timesteps
        moveFollowingNodes(nodeToMove, time, this.__parent(nodeToMove));
        numMoved++;
      }
    }

    // create adds by removing the beginning of a stream
    _genAdds() {
      // choose a random position to cut the stream
      // this method will not choose the last nodes of a stream, which is why we will delete the chosen node as well

      let { numAdds, timesteps } = this._opts;
      let { N, EN, ET } = this._data;


      // start out with all nodes
      let possibleNodes = { ...N };

      let removeNodeAndFollowing = (node) => {
        delete possibleNodes[node];
        let next = this.__next(node);
        if (!!next)
          removeNodeAndFollowing(next);
      };
      // if a node has children, do not consider them or any following nodes for adds
      for (let node in N) {
        if (!!possibleNodes[node]) {
          // don't use already modified nodes
          if (N[node].modified || N[node].t == timesteps - 1)
            delete possibleNodes[node];
          else if (this.__children(node).length > 0)
            removeNodeAndFollowing(node);
        }
      }

      //find random order
      let random = Object.keys(possibleNodes).sort(() => Math.random() - 0.5);

      // make sure that every stream is only represented once
      let streams = {};
      let remainingNodes = [];
      for (let node of random) {
        let streamId = N[node].streamId;
        if (!streams[streamId]) {
          streams[streamId] = true;
          remainingNodes.push(node);
        }
      }

      let deleteNodeAndPreviousNodes = (node) => {
        let prev = this.__previous(node);
        this.__deleteNode(node);
        if (!!prev)
          for (let n of prev)
            deleteNodeAndPreviousNodes(n);
      };

      let numAdded = 0;
      for (let i = 0; i < numAdds; i++) {
        let node = remainingNodes.pop();
        // if user requests more deletes than are possible in the data, do only as many as possible
        if (typeof node == 'undefined') {
          console.log("Add: Not enough streams to add. (Added " + numAdded + ")");
          break;
        }
        let parent = this.__parent(node);
        deleteNodeAndPreviousNodes(node);
        numAdded++;

        // check if the nodes parent is now free of children
        possibleNodes = { ...ET[N[parent].streamId] };
        // if a node has children, delete it and all following nodes from possible nodes
        for (let node in possibleNodes) {
          // don't use already modified nodes
          if (N[node].modified || N[node].t == timesteps - 1)
            delete possibleNodes[node];
          else if (this.__children(node).length > 0)
            removeNodeAndFollowing(node);
        }

        possibleNodes = Object.keys(possibleNodes);
        if (possibleNodes.length > 0) {
          // choose random node of the parents stream (because every stream can only be deleted at one point)
          let randomNodeOfParentStream = possibleNodes[Math.round(Math.random() * (possibleNodes.length - 1))];
          // add this random node of the stream to our random array at a random position
          remainingNodes.splice(Math.round(Math.random() * remainingNodes), 0, randomNodeOfParentStream);
        }
      }
    }

    _genDeletes() {
      let { numDeletes } = this._opts;
      let { N, EN, ET } = this._data;

      // only nodes without children are interesting
      // since moveAcross is called earlier, we have to check if the node gets children later            
      let possibleNodes = [];
      for (let node in N)
        if (!N[node].modified && N[node].t > 0 && !this.__nodeOrFollowingNodesHaveChildren(node))
          possibleNodes.push(node);

      //find random order
      let random = possibleNodes.sort(() => Math.random() - 0.5);

      // make sure that every stream is only represented once
      let streams = {};
      let remainingNodes = [];
      for (let node of random) {
        let streamId = N[node].streamId;
        if (!streams[streamId]) {
          streams[streamId] = true;
          remainingNodes.push(node);
        }
      }

      let deleteNodeAndFollowingNodes = (node) => {
        let next = this.__next(node);
        this.__deleteNode(node);
        if (!!next)
          for (let n of next)
            deleteNodeAndFollowingNodes(n);
      };

      // take all streams and apply a random order
      let numDeleted = 0;
      for (let i = 0; i < numDeletes; i++) {
        let node = remainingNodes.pop();
        // if user requests more deletes than are possible in the data, do only as many as possible
        if (typeof node == 'undefined') {
          console.log("Delete: Not enough streams to delete. (Deleted " + numDeleted + ")");
          break;
        }
        let parent = this.__parent(node);
        deleteNodeAndFollowingNodes(node);
        numDeleted++;

        // check if the nodes parent is now free of children
        if (!this.__nodeOrFollowingNodesHaveChildren(parent)) {
          // add parent and all its succeeding nodes to possible nodes to delete
          let streamNodesOfParent = [];
          let next = [parent];
          do {
            streamNodesOfParent.push(next[0]);
          } while (next == this.__next(next));
          // choose random node of the parents stream (because every stream can only be deleted at one point)
          let randomNodeOfParentStream = streamNodesOfParent[Math.round(Math.random() * (streamNodesOfParent.length - 1))];
          // add this random node of the stream to our random array at a random position
          remainingNodes.splice(Math.round(Math.random() * remainingNodes), 0, randomNodeOfParentStream);
        }
      }
    }

    // set a nodes next node to another node which exists in the next timestep
    // delete all next nodes
    // every stream can only merge once
    _genMerges() {
      let { numMerges } = this._opts;
      let { N, EN, ET } = this._data;

      // get all nodes that can be merged (not modified yet and not from last timestep)
      let nodes = Object.entries(N).filter(([id, node]) =>
        !(node.t == Object.keys(EN).length)
        && node.modified == false
        && this.__next(id)
      );

      let random = nodes.sort(() => Math.random() - 0.5);
      // make sure that every stream is only represented once
      let streams = {};
      let remainingNodes = [];
      for (let node of random) {
        let streamId = N[node[0]].streamId;
        if (!streams[streamId]) {
          streams[streamId] = true;
          remainingNodes.push(node[0]);
        }
      }

      let merge = (node, mergeNode) => {
        let time = N[node].t;
        // change the children's parent
        let children = this.__children(node);
        EN[time][mergeNode].push(...children);
        EN[time][node] = [];
        let next = this.__next(node)
        // delete node
        this.__deleteNode(node);

        if (!!next)
          for (let nextNode of next)
            merge(nextNode, this.__next(mergeNode)[0])
      }

      let numMerged = 0;
      for (let i = 0; i < numMerges; i++) {
        let node = remainingNodes.pop();
        // if user requests more moves than are possible in the data, do only as many as possible
        if (typeof node == 'undefined') {
          console.log("Merge: Not enough streams to merge. (Merged " + numMerged + ")");
          break;
        }
        let next = this.__next(node)[0];
        let time = N[next].t;
        let possibleMerges = [];
        let subtree = this.__subtree(next);

        // node can not merge with its children
        for (let mergeNode in EN[time])
          if (!subtree.includes(mergeNode))
            possibleMerges.push(mergeNode);

        if (possibleMerges.length > 0) {
          // merge
          let mergeNode = possibleMerges[Math.round(Math.random() * (possibleMerges.length - 1))];
          // set node's next node to merge node
          ET[N[node].streamId][node] = [mergeNode];
          merge(next, mergeNode);

          numMerged++;
        }
      }
    }

    _genSplits() {

    }

    _applyWeights() {
      let { minValue, maxValue } = this._opts;
      let { N, EN, ET } = this._data;

      let nodesWithoutSize = { ...N };
      while (Object.keys(nodesWithoutSize).length > 0) {
        for (let node in nodesWithoutSize) {
          let children = this.__children(node);
          // set size for leaf nodes
          if (children.length == 0) {
            N[node].w = minValue + Math.random() * (maxValue - minValue);
            delete nodesWithoutSize[node];
          }
          else {
            let allChildrenHaveSize = true;
            let aggregate = 0;
            for (let child of children) {
              if (typeof N[child].w === 'undefined')
                allChildrenHaveSize = false;
              else
                aggregate += N[child].w;
            }
            if (allChildrenHaveSize) {
              N[node].w = aggregate + minValue + Math.random() * (maxValue - minValue);
              delete nodesWithoutSize[node];
            }
          }
        }
      }
    }
  }
  window.DataGenerator = (...args) => new DataGenerator(...args);
}