/**
 * @requires OpenLayers/Control/SelectFeature.js
 */

Ext.namespace("MapFish");
 
MapFish.API.Search = OpenLayers.Class({

    /**
     * Property: api
     * {MapFish.API} instance
     */
    api: null,
    markers: null,
    select: null,
    popup: null,
    recenterFeature: null,
    recenterProtocol: null,
    popupEvents: null,
    featuresCache: null,
    searcher: null,
    queryProtocol: null,
    eventProtocol: null,
    filterProtocol: null,

    /**
     * Constructor: MapFish.API.Search(config)
     * Create a search engine
     *
     * Parameters:
     * config.api - api
     */
    initialize: function(config) {
    
        this.api = config.api;

        this.featuresCache = [];
    
        if (!config.disableSearch) {
            this.markers = this.getMarkersLayer();
            this.api.map.addLayer(this.markers);
    
            this.select = new OpenLayers.Control.SelectFeature(
                this.markers, {hover: true, multiple: false}
            );
            this.api.map.addControl(this.select);
            this.select.activate();
    
            this.recenterProtocol = new mapfish.Protocol.MapFish({
                url: this.api.baseConfig.recenterUrl,
                params: {
                    lang: OpenLayers.Lang.getCode()
                },
                callback: this.recenterProtocolCallback,
                scope: this
            });
        }
        
        if (!config.disableQuery) { 
            this.queryProtocol = new mapfish.Protocol.MapFish({
                url: this.api.baseConfig.queryUrl,
                params: {
                    lang: OpenLayers.Lang.getCode()
                },
                format: new OpenLayers.Format.JSON()
            });
            
            this.eventProtocol = new mapfish.Protocol.TriggerEventDecorator({
                protocol: this.queryProtocol
            });
            
            this.filterProtocol = new mapfish.Protocol.MergeFilterDecorator({
                protocol: this.eventProtocol
            }); 
            this.filterProtocol.register({
                getFilter: function() {
                    var layers = [];
                    var olLayers = this.api.map.getLayersByName({test: function(str) {return true;}});
                    for (l in olLayers) {
                        if (olLayers[l].params &&
                            olLayers[l].params.LAYERS &&
                            olLayers[l].params.LAYERS.length > 0) {
                            layers = layers.concat(olLayers[l].params.LAYERS);
                        }
                    }
                    return {layers: layers};
                }.createDelegate(this)
            });
            
            this.searcher = new mapfish.Searcher.Map({
                mode: mapfish.Searcher.Map.CLICK,
                searchTolerance: 10,
                protocol: this.filterProtocol
            });
            
            this.eventProtocol.events.on({
                crudfinished: this.queryProtocolCallback,
                scope: this
            });

            this.api.map.addControl(this.searcher);
            this.searcher.activate(); 
        }
    },

    /* Private methods */

    getMarkersLayer: function() {
        return new OpenLayers.Layer.Vector(OpenLayers.Util.createUniqueID(), {
            styleMap: new OpenLayers.StyleMap({
                "default": {
                    pointRadius: 11, 
                    fillColor: "#CCFF33",
                    fillOpacity: 0.8,
                    strokeColor: "#668800",
                    strokeOpacity: 0.8,
                    strokeWidth: 1
                },
                "select": {
                    pointRadius: 15, 
                    fillColor: "#FF0000",
                    strokeColor: "#880000",
                    cursor: "pointer"
                }
            })
        });
    },

    recenterProtocolCallback: function(response) {
        var f = response.features[0];

        this.featuresCache.push({id : this.recenterFeature.fid,
                                 feature: f});

        this.finishRecenter(f);
    },
    
    finishRecenter: function(f) {

        this.hidePopup();
        this.api.map.zoomToExtent(f.bounds);
        this.showPopup(f.data.name, f.data.content, this.recenterFeature);

        // Finished
        this.recenterFeature = null;
    },

    recenter: function(f) {

        this.recenterFeature = f;

        var feature = null;
        for (var i = 0; i < this.featuresCache.length; i++) {
            if (this.featuresCache[i].id == f.fid) {
                feature = this.featuresCache[i].feature;
            }
        }
        if (feature) {

            this.finishRecenter(feature);
        } else {
            
            var attr = this.recenterFeature.attributes;
            this.recenterProtocol.read({params: {
                layer: attr.layer,
                id: attr.id
            }});
        }
    },

    queryProtocolCallback: function(response) {

        if (response.features) {
            var lonlat = this.searcher.popupLonLat;
            var feature = new OpenLayers.Feature.Vector(new
                              OpenLayers.Geometry.Point(lonlat.lon, lonlat.lat));
            this.showPopup(response.features.title, response.features.content, feature, 400);
        }
    },
    
    hidePopup: function() {

        if (this.popup) {
            this.popup.destroy();
        }
    },

    showPopup: function(title, html, feature, width) {

        if (typeof(width) == 'undefined') {
            width = 250;
        }
        if (feature) {

            this.hidePopup();
            this.popup = new GeoExt.Popup({
                map: this.api.map,
                title: title,
                feature: feature,
                width: width,
                html: html,
                unpinnable: false,
                border: false
            });

            if (this.popupEvents) {
                this.popup.on(this.popupEvents);
            }

            this.popup.show();
        }
    },
    
    hideLayer: function() {
        
        this.hidePopup();
        this.markers.destroyFeatures();
        this.markers.setVisibility(false);
    },
    
    showLayer: function() {
        this.markers.setVisibility(true);
    }    
});
