var items = Vars.content.items()


var colorRepresentations = [
    Color.blue, Color.red, Color.green, Color.white,
    Color.cyan, Color.magenta, Color.yellow, Color.black,
    Color.sky, Color.pink, Color.olive, Color.lightGray
]

var colorIcons = colorRepresentations.map(function (color) {
    var pixmap = new Pixmap(24, 24);
    pixmap.setColor(color)
    pixmap.fill()
    return TextureRegionDrawable(TextureRegion(Texture(pixmap)))
})



var colors;
var registryVersion;
function newRegistry() {
    colors = new Array(12);
    registryVersion = Time.time();
    for (var i = 0; i < 12; i++) {
        colors[i] = [];
    }
}
function register(entity) {
    if (entity.colorCode() == -1) return
	
	const acceptingItems = entity.acceptingItems();
	
	for (var itemId in acceptingItems) {
		if (colors[entity.colorCode()].length < items.size) {
			var delta = items.size - colors[entity.colorCode()].length
			for (var i = 0; i < delta; i++) colors[entity.colorCode()].push({ids: [], offset: 0, lastRefusal: 0})
		}
		colors[entity.colorCode()][acceptingItems[itemId]].ids.push(entity.id())
	}
}

function unregister(entity) {
    if (entity.colorCode() == -1) return
	for (var i in colors[entity.colorCode()]) {
		var index = colors[entity.colorCode()][i].ids.indexOf(entity.id())
		if (index !== -1)
			colors[entity.colorCode()][i].ids.splice(index, 1)
	}
}

function gameReloadDetected() {
    if (registryVersion + 100 < Time.time()) {
        newRegistry()
    }
}

function getPeers(entity, item) {
	return colors[entity.colorCode()][item.id]
}
newRegistry()







var entities = {};
function entity(a) {
    var entity = a.ent()
    
    if (entities[entity.id] == undefined) {
        var initialized = false;
        var offset = 0;
        var registry = -1;
        var initialized = false;
        var lastCachedTime = 0;
        var accepts = {}
		var _colorCode = null
		var _proximity = null
		var needToRegisterAgain = false;
        entities[entity.id] = {
            realEntity: entity,
            
            init() {
                if (!initialized) {
                    initialized = true
					needToRegisterAgain = true
                }
            },
			
            id() {return entity.id},
			
            tryToOutput(item, forReal) {
				
				this.cacheProximity()
				
                if (Time.time() === lastCachedTime && accepts[item.id] === false) {
                    return false
                } else if (Time.time() !== lastCachedTime) {
                    accepts = {}
                }
                
                for (var i = 0; i < _proximity.length; i++) {
                    var target = _proximity[(offset + i) % _proximity.length]
                    
                    if (!target.block().instantTransfer && target.block().acceptItem(item, target, entity.tile)) {
                        if (forReal) {
                            target.block().handleItem(item, target, entity.tile);
                            offset += i + 1
                        } else {
                            offset += i
                        }
                        return true
                    }
                }
                lastCachedTime = Time.time();
                accepts[item.id] = false;
                return false
            },
			
			acceptingItems() {
				var accept = {}
				
				this.cacheProximity()
				
				for (var i in _proximity) {
					var block = _proximity[i].block();
					print(block)
					
					var acceptMaterials = block instanceof LaunchPad || block instanceof CoreBlock
					
					var acceptAll = (block.group === BlockGroup.transportation && !block.instantTransfer) || (block instanceof StorageBlock && !acceptMaterials)
					
					
					for (var i = 0; i < items.size; i++) {
						print(i)
						if (acceptAll || (acceptMaterials && items.get(i).type === ItemType.material) || block.consumes.itemFilters.get(i))
							accept[i] = true
					}
				}
				
				var ret = []
				for (var i = 0; i < items.size; i++)
					if (accept[i]) ret.push(i)
				return ret
			},
			
			cacheProximity() {
				if (_proximity !== null) return
				
				_proximity = []
				var proximity = entity.proximity();
                const size = proximity.size;
                
				for (var i = 0; i < size; i++) {
                    _proximity.push(proximity.get(i))
                }
			},
			
            onProximityUpdate(tile) {
				needToRegisterAgain = true
				_proximity = null;
			},
			
            removed() {
                unregister(this);
            },

            colorCode(value) {
                if (value === undefined) {
                    if (_colorCode == null) _colorCode = entity.link
					return _colorCode
                } else {
                    lastColor = entity.link = _colorCode = value
				needToRegisterAgain = true
                }
            },
            
            update() {
                if (!initialized) {
                    gameReloadDetected();
                    this.init()
                }
				
				if (needToRegisterAgain) {
					unregister(this)
					register(this)
					needToRegisterAgain = false
				}
            }
        }
    }
    return entities[entity.id]
}
function entityFromId (id) {
    return entities[id]
}


var lastColor = -1
function Block__tryToOutput(item, myTile, forReal) {
    var peers = getPeers(entity(myTile), item)
	if (peers === undefined) return false
	
	var now = Time.time()
	if (peers.lastRefusal === now) return false
	
    var length = peers.ids.length;
    for (var i = 0; i < length; i++) {
        var teleporter = entityFromId(peers.ids[(i + peers.offset) % length]);
        
        if (teleporter.tryToOutput(item, forReal)) {
            if (forReal) {
                peers.offset += i + 1;
            } else {
                peers.offset +=i 
            }
            return true;
        }
    }
	peers.lastRefusal = now
    return false;
}
var superInstance = new Block('teleporter-super')
const teleporter = extendContent(Block, "teleporter", {
    outputsItems: () => true,

    acceptItem(item, myTile, srcTile) {
        return Block__tryToOutput(item, myTile, false);
    },
    
    handleItem(item, myTile, srcTile) {
        return Block__tryToOutput(item, myTile, true);
    },
    
	onProximityUpdate(tile) {
		superInstance.onProximityUpdate(tile)
		entity(tile).onProximityUpdate(tile)
	},

    playerPlaced(tile) {
        entity(tile).init()
        tile.configure(lastColor)
    },
    
    placed(tile) {
        entity(tile).init()
    },

    removed(tile) {
        entity(tile).removed()
    },
    
    update(tile) {
        entity(tile).update()
    },
	
    configured (tile, player, value){
        entity(tile).colorCode(value)
    },
    
    buildConfiguration(tile, table) {
        var group = new ButtonGroup()
        group.setMinCheckCount(0);
        var cont = new Table();
        cont.defaults().size(38);
        
        for(var i = 0; i < 12; i++){
            (function (i, tile) {
                var button = cont.addImageButton(Tex.whiteui, Styles.clearToggleTransi, 24, run(() => Vars.control.input.frag.config.hideConfig())).group(group).get();
                button.changed(run(() => tile.configure((button.isChecked() ? i : -1))));
                button.getStyle().imageUp = colorIcons[i];
                button.update(run(() => button.setChecked(entity(tile).colorCode() == i)));
            })(i, tile)
            if(i % 4 == 3){
                cont.row();
            }
        }

        table.add(cont);
    },
    drawRequestConfig(req, list) {
        if (req.config === -1) return
        Draw.color(colorRepresentations[req.config])
        Draw.rect("center", req.drawx(), req.drawy(), 5, 5);
        Draw.color()
    },
    draw(tile) {
        superInstance.draw(tile)
        if (entity(tile).colorCode() == -1) return
        Draw.color(colorRepresentations[entity(tile).colorCode()]);
        Draw.rect("center", tile.worldx(), tile.worldy(), 5, 5);
        Draw.color();
    }
})

var a = new ItemBridge('nothing')

teleporter.entityType = new Prov({
    get: ()=>a.newEntity()
})

teleporter.description = "Advanced item transport block. Teleporters input items to other teleporters of the same color. Does nothing if no teleporters of the same color exist. If multiple teleporters exist of the same color, items are distributed evenly. Tap to change color."


