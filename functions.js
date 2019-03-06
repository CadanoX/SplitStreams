function loadJSON(file, callback) {
	var xobj = new XMLHttpRequest();
	xobj.overrideMimeType("application/json");
	xobj.open('GET', file, true); // Replace 'my_data' with the path to your file
	xobj.onreadystatechange = function () {
		if (xobj.readyState == 4 && xobj.status == "200") {
			// Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
			callback(xobj.responseText);
		}
	};
	xobj.send(null);
}

function getRandomColor() {
	var letters = '0123456789ABCDEF';
	var color = '#';
	for (var i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}

function transformVisciousFormat(data)
{
	// init
	let format = { timesteps: []};
	for (let t in data.EN) {
		format.timesteps[t] = {
			deleted: {},
			references: {},
			tree: {
				id: "fakeRoot",
				children: []
			}
		};
	}

	// build history of root node
	for (let t in data.EN) {
		let time = format.timesteps[t];
		let next = format.timesteps[Number(t)+1];
		time.references["fakeRoot"] = time.tree;
		if (next) {
			time.tree.next = [ next.tree ];
			next.tree.prev = [ time.tree ];
		}
	}

	// add all nodes to references
	let minDepth = Infinity; // viscious might have depths of 25, 30 and 35
	for (let id in data.N) {
		minDepth = Math.min(minDepth, data.N[id].l)
	}
	for (let id in data.N) {
		let node = data.N[id];
		let time = format.timesteps[node.t];
		let ref = time.references[id] = { id: id, size: node.w };
		if (node.l == minDepth) { // add roots to fakeRoot
			time.tree.children.push(ref)
			ref.parent = time.tree;
		}
	}

	// build tree structure
	for (let t in data.EN) {
		let time = format.timesteps[t];

		/*// set tree root
		let nodes = Object.keys(data.EN[t]);
		let last = nodes[nodes.length-1];
		time.tree = time.references[last];
		*/

		// connect all children
		for (let id in data.EN[t]) {
			let node = time.references[id];
			let childArray = data.EN[t][id];
			if (childArray.length > 0)
				node.children = [];
			for (let childId of childArray) {
				node.children.push(time.references[childId])
				time.references[childId].parent = node;
			}
		}
	}

	// set prev, next nodes
	for (let stream in data.ET) {
		for (let nodeId in data.ET[stream]) {
			let t = data.N[nodeId].t;
			let node = format.timesteps[t].references[nodeId];

			for (let nextId of data.ET[stream][nodeId]) {
				let next = format.timesteps[Number(t)+1].references[nextId];
				if (!node.next)
					node.next = [];
				node.next.push(next)

				if (!next.prev)
					next.prev = [];
				next.prev.push(node)
			}
		}

	}

    return format
}

function transformGumtreeFormat(data)
{
	// we use references instead of hierarchical ids
	// timesteps holds for each timestime the corresponding tree
	// reference keeps for each node its pointers to all timesteps where it exists
	let format = {timesteps: []};
	let idx = 0;
	let currentTimestep,
		previousTimestep;

	/*let getUniqueID = (pointer) => {
		// initiate IDs
		if (timestep == 0)
			return idx++;

		if (data.changes.matches)
		;
		
		// look if this node has a matching node
		// if it has, use this nodes id, otherwise use new id
		// careful, because later nodes might refer to the data id, not ours
		if (!!format.reference[id][timestep])
		;
	};*/

	// Copy the trees for each timetep from input data to our data format
	let traverse = (src, dest) => {
		// we follow the  data's depth-first post-order traversal
		dest.children = [];
		if (!!src.children)
			for (let i = 0; i < src.children.length; i++) {
				//if (src.children[i].type != 162) { // remove comments
					dest.children[i] = { parent: dest };
					traverse(src.children[i], dest.children[i]);
				//}
			}

		dest.id = idx;
		currentTimestep.references[idx] = dest;
		idx++;
		dest.size = src.length;
		dest.pos = src.pos;
		dest.data = {
			label: src.label,
			type: src.type,
			typeLabel: src.typeLabel,
			pos: src.pos,
			length: src.length
		}
	};

	

	for (t in data.timesteps)
	{
		idx = 0;
		currentTimestep = format.timesteps[t] = { deleted: {}, references: {}, tree: {} };
		traverse(data.timesteps[t].root, currentTimestep.tree);
		
		if (t != 0) {
			previousTimestep = format.timesteps[t-1];

			// Find matching nodes
			if (!!data.changes[t-1].matches)
				for (let match of data.changes[t-1].matches) {
					let prev = previousTimestep.references[match.src];
					currentTimestep.references[match.dest].prev = [ prev ];
					prev.next = [ currentTimestep.references[match.dest] ];
				}

			// find added, deleted nodes
			if (!!data.changes[t-1].actions)
				for (let action of data.changes[t-1].actions) {
					if (action.action == "delete")
						currentTimestep.deleted[action.tree] = previousTimestep.references[action.tree];
					
					/*if (action.action == "insert") {
						currentTimestep.references[action.tree].insertAt = action.at;
					}*/
				}
		}
	}

	return format;
}