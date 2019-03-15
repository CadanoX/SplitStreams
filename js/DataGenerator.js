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
            this._genMerges();
            this._genSplits();
            this._genMoveAcross();
            this._genMoveAlong();
            this._genAdds();
            this._genDeleted();
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
            return this._id++;
        }

        __parent(node) {
            let {N,EN,ET} = this._data;
            let time = N[node].t;
            for (let parent in EN[time]) {
                for (let child in EN[time][parent])
                    if (EN[time][parent][child] == node)
                        return parent;
            }
            return undefined;
        }
        
        _genStreams() {
            let {numStreams, timesteps} = this._opts;
            let {N,EN,ET} = this._data;

            for (let t = 0; t < timesteps-1; t++)
                ET[t] = {};

            for (let n = 0; n < numStreams; n++) {
                let lastId;
                for (let t = 0; t < timesteps; t++) {
                    let id = this.__uniqueID();
                    // create Node
                    N[id] = { t: t, l: 0 }
                    this._numNodes++;
                    // create history
                    if (t != timesteps - 1)
                         ET[t][id] = [];
                    if (t != 0)
                        ET[t-1][lastId].push(id);
                    lastId = id;
                }
            }
        }

        _genHierarchy() {
            // push complete streams into other streams as their child
            let {numStreams, timesteps} = this._opts;
            let {N,EN,ET} = this._data;
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
            let traverseTime = function(node, time = 0) {
                let next = ET[time][node][0];
                let nextTime = time + 1;
                if (typeof next != 'undefined') {
                    N[next].l = N[node].l;
                    EN[nextTime][next] = [];
                    for (let child of EN[time][node]) {
                        let childNext = ET[time][child][0];
                        EN[nextTime][next].push(childNext);
                    }
                    
                    if (!!ET[nextTime])
                        traverseTime(next, nextTime);
                }
            }
            for (let node in EN[0]) {
                traverseTime(node);
            }

            // copy object
            this._basis = JSON.parse(JSON.stringify(this._data));
        }

        _genMerges() {

        }

        _genSplits() {

        }

        _genMoveAcross() {
            let {numMoveAcross} = this._opts;
            let {N,EN,ET} = this._data;
            let nodes = Object.entries(N).filter(([id, node]) => node.t != 0);

            let numMoves = numMoveAcross;
            if (nodes.length < numMoveAcross) {
                console.log("Move across: Not enough nodes to move.");
                numMoves = nodes.length;
            }


            let moveFollowingNodes = function(node, time, parent, newParent, movePos = -1) {
                let children = EN[time][parent];
                for (let pos = 0; pos < children.length; pos++) {
                    if (children[pos] == node) {
                        children.splice(pos, 1);
                        break;
                    }
                }   
                let newChildren = EN[time][newParent];
                if (movePos = -1)
                    movePos = Math.round(Math.random() * (newChildren.length - 1));
                
                newChildren.splice(movePos, 0, node);
                
                if (!!ET[time])
                    moveFollowingNodes(ET[time][node][0], time + 1, ET[time][parent][0], ET[time][newParent][0], movePos);
            }

            let random = nodes.sort(() => Math.random() - 0.5);
            for (let i = 0; i < numMoves; i++) {
                let nodeToMove = random.pop()[0];
                let time = N[nodeToMove].t;
                // choose a new parent
                let possibleNewParents = Object.entries(EN[time]);
                let rand = Math.round(Math.random() * (possibleNewParents.length - 1));
                let newParent = possibleNewParents[rand][0];
                // move node in all following timesteps
                moveFollowingNodes(nodeToMove, time, this.__parent(nodeToMove), newParent);
            }
        }

        _genMoveAlong() {
            let {numMoveAlong} = this._opts;
            let {N,EN,ET} = this._data;
            let nodesWithMoreThanOneChild = [];
            for (let t in EN)
                if (t != 0) // moves at timepoint 0 would not be visible
                nodesWithMoreThanOneChild = nodesWithMoreThanOneChild.concat(Object.entries(EN[t]).filter(([id, children]) => children.length > 1));

            let possibleMoves = [];
            for (let node of nodesWithMoreThanOneChild) {
                for (let child of node[1])
                    possibleMoves.push(child);
            }

            let numMoves = numMoveAlong;
            if (possibleMoves.length < numMoveAlong) {
                console.log("Move along: Not enough nodes to move.");
                numMoves = possibleMoves.length;
            }


            let moveFollowingNodes = function(nodeToMove, time, parent, movePos = -1) {
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
                if (!!ET[time])
                    moveFollowingNodes(ET[time][nodeToMove][0], time + 1, ET[time][parent][0], movePos);
            }

            let random = possibleMoves.sort(() => Math.random() - 0.5);
            for (let i = 0; i < numMoves; i++) {
                let nodeToMove = random.pop();
                let time = N[nodeToMove].t;
                // move node in all following timesteps
                moveFollowingNodes(nodeToMove, time, this.__parent(nodeToMove));
            }
        }

        _genAdds() {

        }

        _genDeleted() {

        }
    }
	window.DataGenerator = (...args) => new DataGenerator(...args);
}