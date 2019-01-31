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

	// Copy the trees for each timetep
	let traverse = (src, dest) => {
		// we follow the  data's depth-first post-order traversal
		dest.children = [];
		for (c in src.children) {
			dest.children[c] = {};
			traverse(src.children[c], dest.children[c]);
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
		let a = currentTimestep;
		let b = data.timesteps[t].root;
		traverse(b, a.tree);
		
		if (t != 0) {
			previousTimestep = format.timesteps[t-1];

			// Find matching nodes
			for (m in data.changes[t-1].matches) {
				let match = data.changes[t-1].matches[m];
				currentTimestep.references[match.dest].origin = previousTimestep.references[match.src];
			}

			// find added, deleted nodes
			for (a in data.changes[t-1].actions) {
				let action = data.changes[t-1].actions[a];
				if (action.action == "delete")
					currentTimestep.deleted[action.tree] = true;
				if (action.action == "insert")
					currentTimestep.references[action.tree].origin = -1;
			}
		}
	}

	return format;
}

document.addEventListener("DOMContentLoaded", function(event)
{
	//transformVisciousIntoFormat(examples.Viscous);
	let data = transformGumtreeFormat(examples.gumtreeMin);

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