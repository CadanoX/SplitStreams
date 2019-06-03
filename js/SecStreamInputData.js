{
    class SecStreamInputData {
        constructor(options = {})
        {
			this._opts = {
                forceFakeRoot: false,
                ...options // overwrite default settings with user settings
            }
            // hold a tree (root node) for each timestep
            // hold a reference array which includes all nodes present in a single timestep
            this._timesteps = [];
        }

        get data() { return { timesteps: this._timesteps }};;

        addNode(t, id, size = undefined, pos = undefined, data = undefined) {
            if (!this._timesteps[t])
                this._createTimestep(t);
            
            if (!this._timesteps[t].references[id])
                this._timesteps[t].references[id] = { id, size, pos, data }
        }

        addParent(t, id, pId) {
            let nodes = this._timesteps[t].references;
            let node = nodes[id];
            let parent = nodes[pId];
            if (!node) { console.log(`Error 'addParent': Node '${id}' does not exist.`); return; }
            if (!parent) { console.log(`Error 'addParent': Parent node '${pId}' does not exist.`); return; }
            node.parent = parent;
            if (!parent.children)
                parent.children = [];
            parent.children.push(node);
        }

        addNext(t, id, nextId) {
            if (!this._timesteps[+t+1]) { console.log(`Error 'addNext': Timestep '${+t+1}' does not exist.`); return; }
            let node = this._timesteps[t].references[id];
            if (!node) { console.log(`Error 'addNext': Node '${id}' does not exist.`); return; }
            let nextNode = this._timesteps[+t+1].references[nextId];
            if (!nextNode) console.log(`Error 'addNext': Next node  '${nextId}' does not exist.`);
            else {
                if (!node.next) node.next = [];
                node.next.push(nextNode);
                if (!nextNode.prev) nextNode.prev = [];
                nextNode.prev.push(node);
            }
        }

        finalize() {
            this._checkParents();
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
                        if (!nodesWithoutParents[t])
                            nodesWithoutParents[t] = [];
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
                    this._timesteps[t].tree = this._timesteps[t].references['fakeRoot'] = {
                        id: "fakeRoot",
                        children: [...nodesWithoutParents[t]]
                    };
                    nodesWithoutParents[t].forEach((node) => {
                        node.parent = this._timesteps[t].tree;
                    });
                    // connect fake roots
                    if (!!prevT) {
                        this._timesteps[t].tree.prev = [this._timesteps[prevT].tree];
                        this._timesteps[prevT].tree.next = [this._timesteps[t].tree];
                    }
                    prevT = t;
                }
            }
            else { // every timepoint has a single root node
                for (let t in nodesWithoutParents) {
                    this._timesteps[t].tree = nodesWithoutParents[t][0];
                }
            }
        }

        _createTimestep(t) {
            this._timesteps[t] = {
                references: {},
                tree: null
            }
        }

        _buildTimeConnections() {
            for (let t in this._timesteps) {
                if (!!this._timesteps[+t+1]) {
                    let nodes = this._timesteps[t].references;
                    let nodes2 = this._timesteps[+t+1].references;
                    for (let id in nodes) {
                        if (!!nodes2[id]) {
                            nodes[id].next = [ nodes2[id] ] ;
                            nodes2.prev = [ nodes[id] ];
                        }
                    }
                }
            }
        }

        _buildTreeConnections() {
            for (let t in this._timesteps) {
                let nodes = this._timesteps[t].references;
                for (let id in nodes) {
                    let node = nodes[id];
                    let p = nodes[node.pId];
                    if(!p)
                        console.log(`Parent ${pId} of node ${id} does not exist.`)
                    else {
                        if (!p.children)
                            p.children = [];
                        p.children.append(node);
                        node.parent = p;
                    }
                }
            }
        }
    }

    d3.SecStreamInputData = (...args) => new SecStreamInputData(...args);
}