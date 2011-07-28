

// google maps map
var MapView = Backbone.View.extend({
    mapOptions: {
            zoom: 5,
            center: new google.maps.LatLng(-7.409408064269147,-50.00213741352536),
            mapTypeId: google.maps.MapTypeId.TERRAIN,
            disableDefaultUI: true,
            disableDoubleClickZoom: true,
            draggableCursor:'default'
    },

    //el: $("#map"),

    initialize: function() {
        _.bindAll(this, 'center_changed', 'ready', 'click', 'set_center', 'reoder_layers');
       this.map_layers = {};
       this.map = new google.maps.Map(this.el[0], this.mapOptions);
       google.maps.event.addListener(this.map, 'center_changed', this.center_changed);
       google.maps.event.addListener(this.map, 'click', this.click);
       //google.maps.event.addListener(this.map, 'idle', this.tilesloaded);
       this.projector = new Projector(this.map);
       this.projector.draw = this.ready;
       this.layers = new LayerCollection();
    },

    center_changed: function() {
            this.trigger('center_changed', this.map.getCenter());
    },

    set_center: function(c) {
        this.map.setCenter(c);
    },

    click: function(e) {
            this.trigger('click', e);
    },

    // called when map is ready
    // its a helper method to avoid calling getProjection whiout map loaded
    ready: function() {
            this.projector.draw = function(){};
            this.trigger('ready');
            this.layers.bind('reset', this.reoder_layers);
    },

    reoder_layers: function() {
        var self = this;
        self.map.overlayMapTypes.clear();
        self.layers.each(function(layer) {
            var lyr;
            if(!(layer.get('id') in self.map_layers)) {
                lyr = self.create_layer(layer.toJSON());
                self.map_layers[layer.get('id')] = lyr;
            }
            lyr = lyr || self.map_layers[layer.get('id')];
            if(lyr) {
                if(layer.get('type') === 'fusion_tables') {
                    // fusion tables can't be added as overlayMapTypes
                    if(layer.enabled) {
                        lyr.setMap(self.map);
                    } else {
                        lyr.setMap(null);
                    }
                } else {
                    if(layer.enabled) {
                        self.map.overlayMapTypes.push(lyr);
                    }
                }
            }
        });
    },

    create_layer: function(model_layer) {
        var layer;
        var type = model_layer.type;
        var url = model_layer.url;
        if (type === '') {
          if (url.search('.kml') != -1 || url.search('.kmz') != -1) {
            type = 'kml';
          } else {
            type = 'xyz';
          }
        }

        if (type === 'kml') {
            layer = new google.maps.KmlLayer(url, { suppressInfoWindows: true, preserveViewport:true});
        } else if (type === 'fusion_tables') {
            layer = new google.maps.FusionTablesLayer({
              query: {
                select: model_layer.select,
                from: model_layer.table
              }
            });
        } else { //xyz
            if (url && url.search('{X}') != -1 && url.search('{Z}') != -1 && url.search('{Y}') != -1) {
                  layer = new google.maps.ImageMapType({
                  getTileUrl: function(tile, zoom) {
                    var y = tile.y;
                    var tileRange = 1 << zoom;
                    if (y < 0 || y  >= tileRange) {
                      return null;
                    }
                    var x = tile.x;
                    if (x < 0 || x >= tileRange) {
                      x = (x % tileRange + tileRange) % tileRange;
                    }
                    return this.urlPattern.replace("{X}",x).replace("{Y}",y).replace("{Z}",zoom);
                  },
                  tileSize: new google.maps.Size(256, 256),
                  opacity: 1.0,
                  isPng: true,
                  urlPattern:url
               });
            }
        }
        return layer;
    }


});
