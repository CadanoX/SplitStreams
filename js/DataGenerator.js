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
                    numDeleted: 0
                }
            } = {})
        {
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
            this._genHierarchy();
            this._genAdds();
            this._genDeleted();
            this._genMoveAcross();
            this._genMoveAlong();
            this._genMerges();
            this._genSplits();
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
            let {N,EN} = this._data;
            let time = N[node].t;
            for (let parent in EN[time]) {
                for (let child in EN[time][parent])
                    if (EN[time][parent][child] == node)
                        return parent;
            }
            return undefined;
        }

        __children(node) {
            let {N,EN} = this._data;
            return EN[N[node].t][node];
        }

        // return an array of the nodes in the next timestep, this node maps to
        __next(node) {
            let {N,ET} = this._data;
            return ET[N[node].streamId][node];
        }

        __subtree(node) {
            let children = this.__children(node);
            let subtree = [node];
            for (let child in children)
                subtree.push(...this.__subtree(children[child]))
            return subtree;
        }
        
        _genStreams() {
            let {numStreams, timesteps} = this._opts;
            let {N,EN,ET} = this._data;

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
            let {numStreams, timesteps} = this._opts;
            let {N,EN} = this._data;
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

                if (nodesAssigned > 0) {
                    // find a random node in the hierarchy to assign to
                    let rand2 = Math.round(Math.random() * (nodesAssigned - 1));
                    EN[0][Object.keys(nodesInHierarchy)[rand2]].push(node[0]);
                }
                else {
                    N[node[0]].modified = true; // we later don't want to change the root node
                }

                // flag the node to say it is in the hierarchy
                EN[0][node[0]] = [];
                nodesInHierarchy[node[0]] = true;
                nodesAssigned++;
            }

            // set depth values for each node
            let traverse = function(node) {
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

        // create adds by removing the beginning of a stream
        _genAdds() {
            
                // choose a random position to cut the stream
                // this method will not choose the last nodes of a stream, which is why we will delete the chosen node as well
                
        }

        _genDeleted() {
            let {numDeleted} = this._opts;
            let {N,EN,ET} = this._data;

            // only nodes without children are interesting
            let possibleNodes = [];
            for (let t in EN) {
                for (let node in EN[t]) {
                    let children = EN[t][node];
                    if (children.length == 0 && !N[node].modified) {
                        possibleNodes.push(node);
                    }
                }
            }
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

            let deleteNode = (node) => {
                let time = N[node].t;
                let stream = N[node].streamId;

                // don't delete node if the node has children
                if (EN[time][node].length > 0) {
                    console.log("ERROR deleting node: node has children");
                    return;
                }
                // delete in tree
                // delete in children array of parent
                let parent = this.__parent(node);
                let children = EN[time][parent];
                for (let pos = 0; pos < children.length; pos++) {
                    if (children[pos] == node) {
                        children.splice(pos, 1);
                        break;
                    }
                }
                // delete node itself
                delete EN[time][node];

                // delete in stream
                // find prev node of the stream and delete node as next
                for (let streamNode in ET[stream]) {
                    let next = ET[stream][streamNode];
                    for (let pos = 0; pos < next.length; pos++) {
                        if (next[pos] == node) {
                            next.splice(pos, 1);
                            break;
                        }
                    }
                }
                
                // delete in nodes
                delete N[node];

                if (!!ET[stream][node])
                    delete ET[stream][node];
            };

            let deleteFollowing = (node) => {
                let next = this.__next(node);
                deleteNode(node);
                if (!!next)
                    for (let n of next)
                        deleteFollowing(n);
            };

            // if user requests more deletes than are possible in the data, do only as many as possible
            let numDelete = numDeleted;
            if (remainingNodes.length < numDeleted) {
                console.log("Delete: Not enough streams to delete.");
                numDelete = remainingNodes.length;
            }

            // take all streams and apply a random order
            for (let i = 0; i < numDelete; i++) {
                let node = remainingNodes.pop();
                deleteFollowing(node);
            }
        }

        _genMerges() {

        }

        _genSplits() {

        }

        _genMoveAcross() {
            let {numMoveAcross} = this._opts;
            // Nodes, Tree of Trees with timestamp, Reference which maps current node to future node in the timestamp.
            let {N,EN} = this._data;

            // get all nodes that can be moved (not modified yet and not from timestep 0)
            let nodes = Object.entries(N).filter(([id, node]) => node.t > 0 && node.modified == false);

            // if user requests more moves than are possible in the data, do only as many as possible
            let numMoves = numMoveAcross;
            if (nodes.length < numMoveAcross) {
                console.log("Move across: Not enough nodes to move.");
                numMoves = nodes.length;
            }

            let moveFollowingNodes = (node, time, parent, newParent, movePos = -1) => {
                // make sure not to create loops
                if (this.__subtree(node).includes(newParent))
                    return;

                // find the current node in its parent's children array
                let children = EN[time][parent];
                for (let pos = 0; pos < children.length; pos++) {
                    if (children[pos] == node) {
                        // remove the node from its parent
                        children.splice(pos, 1);
                        break;
                    }
                }
            
                // find the new parent's children array
                let newChildren = EN[time][newParent];
                // include the node randomly in the new parent's children array
                if (movePos == -1)
                    movePos = Math.round(Math.random() * (newChildren.length - 1));
                // since we update following timesteps, previous moves might have reduced the children array
                else if (movePos > newChildren.length-1)
                    movePos = newChildren.length-1;
                    
                // add the node as child to the new parent
                newChildren.splice(movePos, 0, node);
                
                // if the next timestep exists
                let next = this.__next(node);
                if (!!next)
                    moveFollowingNodes(next[0], time + 1, this.__next(parent)[0], this.__next(newParent)[0], movePos);
            }

            // randomize the array of movable nodes
            let random = nodes.sort(() => Math.random() - 0.5);
            // only move the first "numMoves" nodes from the random array
            for (let i = 0; i < numMoves; i++) {
                // get node from array
                let nodeToMove = random.pop()[0];
                // get the timestep in which the node is defined
                let time = N[nodeToMove].t;

                // choose a new parent in the same timestep in which the node shall move into
                // the new parent can not be in the subtree of the current node
                let subtree = this.__subtree(nodeToMove);
                // the node should not be the current parent, because that would be a moveAlong
                let parent = this.__parent(nodeToMove);
                if (typeof parent == 'undefined') {
                    // this should never occur, because the root node was initially flagged as modified
                    console.log("ERROR Move across: node has no parent. this state should not be reached")
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
                }
                else
                    console.log("Move across: not enough possible parents to move to")
            }
        }

        // move position within a parent
        _genMoveAlong() {
            let {numMoveAlong} = this._opts;
            let {N,EN} = this._data;
            // only nodes with more than one child are interesting
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

            let numMoves = numMoveAlong;
            if (possibleMoves.length < numMoveAlong) {
                console.log("Move along: Not enough nodes to move.");
                numMoves = possibleMoves.length;
            }

            let moveFollowingNodes = (nodeToMove, time, parent, movePos = -1) => {
                // make sure no previoursly applied movements are overwritten
                if (N[nodeToMove].modified)
                    return;

                let children = EN[time][parent];
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
            for (let i = 0; i < numMoves; i++) {
                let nodeToMove = random.pop();
                let time = N[nodeToMove].t;
                // move node in all following timesteps
                moveFollowingNodes(nodeToMove, time, this.__parent(nodeToMove));
            }
        }
    }
	window.DataGenerator = (...args) => new DataGenerator(...args);
}