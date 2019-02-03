function transformVisciousIntoFormat(data)
{
	let SecStreamInput = { reference: [], timesteps: []};
	for (t in data.EN)
	{
		format.timesteps[t]
	}
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
		for (let i = 0; i < src.children.length; i++) {
			dest.children[i] = { parent: dest };
			traverse(src.children[i], dest.children[i]);
		}

		dest.id = idx;
		currentTimestep.references[idx] = dest;
		idx++;
		dest.size = src.length;
		dest.pos = src.pos;
	};

	for (t in data.timesteps)
	{
		idx = 0;
		currentTimestep = format.timesteps[t] = { deleted: {}, references: {}, tree: {} };
		traverse(data.timesteps[t].root, currentTimestep.tree);
		
		if (t != 0) {
			previousTimestep = format.timesteps[t-1];

			// Find matching nodes
			for (match of data.changes[t-1].matches) {
				let o = previousTimestep.references[match.src];
				currentTimestep.references[match.dest].origin = o;
				o.future = currentTimestep.references[match.dest];
			}

			// find added, deleted nodes
			for (action of data.changes[t-1].actions) {
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

document.addEventListener("DOMContentLoaded", function(event)
{
	//transformVisciousIntoFormat(examples.Viscous);
	let data = transformGumtreeFormat(examples.gumtree);

	let app = new Vue({
		el: '#app',
		data: {
			selected: null,
			search: "force",
			size: window.innerWidth,
			settings: {
				bgColor: "#757575",
				width: window.innerWidth,
				height: window.innerHeight
			},
			test: 1
		},
		methods: {
			add: function () {
				this.csv.push({
					id: "flare.physics.Dummy",
					value: 0
				})
			},
			select: function(index, node) {
				this.selected = index;
			}
		},
		watch: {
			size: function () {
				this.settings.width = this.size * 1.0;
				this.settings.height = this.size * window.innerHeight/window.innerWidth;
				stream.resize(this.settings.width, this.settings.height);
			}
		}
	});

	let div = document.querySelector('#wrapper');
	const stream = d3.SecStream(div)
		.data(data);
});