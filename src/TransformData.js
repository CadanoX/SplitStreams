import SplitStreamInputData from './SplitStreamInputData.js';

const TransformData = {
  viscous: function(data) {
    let format = new SplitStreamInputData();
    // add nodes
    for (let id in data.N) {
      let node = data.N[id];
      format.addNode(node.t, id, node.w, undefined, { labels: [id] });
    }
    // add tree structure
    for (let t in data.EN) {
      for (let id in data.EN[t]) {
        let childArray = data.EN[t][id];
        for (let childId of childArray) {
          format.addParent(t, childId, id);
        }
      }
    }
    // add timeline
    for (let stream in data.ET) {
      for (let nodeId in data.ET[stream]) {
        let t = data.N[nodeId].t;
        for (let nextId of data.ET[stream][nodeId]) {
          format.addNext(t, nodeId, nextId);
        }
      }
    }

    format.finalize();
    return format;
  },

  gumtree: function(data) {
    let format = new SplitStreamInputData();
    let idx = 0;

    // follow the data format's post-order DFS approach
    let traverse = (t, node) => {
      if (!!node.children)
        for (let i = 0; i < node.children.length; i++)
          traverse(t, node.children[i]);

      node.id = idx++;
      format.addNode(t, node.id, node.length, node.pos, {
        label: node.label,
        type: node.type,
        labels: [node.typeLabel]
      });

      // children need to be added in a second step, becaues ID is not known beforehand
      if (!!node.children)
        for (let i = 0; i < node.children.length; i++)
          format.addParent(t, node.children[i].id, node.id);
    };

    for (let t in data.timesteps) {
      idx = 0;
      // add nodes and tree structure
      traverse(t, data.timesteps[t].root);

      // add timeline (start with second, because data needs to be written before being modified)
      if (t > 0) {
        if (!!data.changes[t - 1].matches)
          for (let match of data.changes[t - 1].matches) {
            format.addNext(t - 1, match.src, match.dest);
          }

        // find added, deleted nodes
        // if (!!data.changes[t-1].actions)
        // 	for (let action of data.changes[t-1].actions) {
        // 		if (action.action == "delete")
        // 			currentTimestep.deleted[action.tree] = previousTimestep.references[action.tree];

        // 		/*if (action.action == "insert") {
        // 			currentTimestep.references[action.tree].insertAt = action.at;
        // 		}*/
        //     }
      }
    }

    format.finalize();
    return format;
  },

  titan: function(data) {
    let format = new SplitStreamInputData();
    let t = -1;
    let lastDate;
    for (let entry of data) {
      // when timestamp changes, create a new timestep
      if (entry['observation_time'] != lastDate) {
        lastDate = entry['observation_time'];
        t++;
      }
      format.addNode(t, entry.id, +entry['cell_volume (km3)']);
    }

    t = -1;
    for (let entry of data) {
      if (entry['observation_time'] != lastDate) {
        lastDate = entry['observation_time'];
        t++;
      }
      let children = entry['IDs of children '];
      if (!!children) {
        if (typeof children == 'string') {
          let next = children.split(', ');
          if (next[0] != '')
            next.forEach(nextId => format.addNext(t, entry.id, nextId));
        } // single ID as number
        else format.addNext(t, entry.id, children);
      }
    }

    format.finalize();
    return format;
  },

  allen: function(data) {
    let format = new SplitStreamInputData(/*{forceFakeRoot: true}*/);
    let timesteps = {
      '2': 0,
      '3': 1,
      '5': 2,
      '6': 3,
      '7': 4,
      '8': 5
    };
    let time = t => timesteps[t];

    for (let structureId in data) {
      let structure = data[structureId];
      for (let step in structure.timesteps) {
        let { id, timesteps, name, acronym, color, parent } = structure;
        format.addNode(time(step), id, timesteps[step], undefined, {
          name,
          acronym,
          color
        });
      }
    }

    for (let structureId in data) {
      let structure = data[structureId];
      for (let step in structure.timesteps) {
        let { id, timesteps, name, acronym, color, parent } = structure;
        format.addParent(time(step), id, parent);
      }
    }

    format.connectEqualIds();
    format.finalize();
    return format;
  },

  storyline: function(data) {
    let format = new SplitStreamInputData();
    const characters = [];
    const locations = [];
    for (let char of data.characters)
      characters[char.id] = char.name.replace(/\s+/g, '');
    for (let loc of data.locations)
      locations[loc.id] = loc.name.replace(/\s+/g, '');

    for (let session of data.sessions) {
      for (let t = session.start; t < session.end; t++) {
        format.addNode(
          t,
          locations[session.location],
          undefined,
          undefined,
          locations[session.location]
        );
        for (let member of session.members) {
          format.addNode(
            t,
            characters[member],
            undefined,
            undefined,
            characters[member]
          );
          format.addParent(t, characters[member], locations[session.location]);
        }
      }
    }

    format.connectEqualIds();
    format.finalize();
    return format;
  },

  treemap: function(data) {
    let format = new SplitStreamInputData();
    for (let entry of data) {
      let id = entry[0];
      let parentId = entry[1];
      for (let t = 2; t < entry.length; t++) {
        if (entry[t] > 0) {
          format.addNode(t, id, entry[t]);
          format.addNode(t, parentId);
          format.addParent(t, id, parentId);
        }
      }
    }
    format.connectEqualIds();
    format.finalize();
    return format;
  }
};

export default TransformData;
