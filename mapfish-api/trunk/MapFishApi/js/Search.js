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
    
        this.markers = this.getMarkersLayer();
        this.api.map.addLayer(this.markers);

        this.select = new OpenLayers.Control.SelectFeature(
            this.markers, {hover: true}
        );
        this.api.map.addControl(this.select);
        this.select.activate();

        this.recenterProtocol = new mapfish.Protocol.MapFish({
            url: this.api.baseConfig.recenterUrl,
            callback: this.recenterProtocolCallback,
            scope: this
        });
    },

    /* Private methods */

    getMarkersLayer: function() {
        return new OpenLayers.Layer.Vector("Markers", {
            styleMap: new OpenLayers.StyleMap({
                "default": {
                    pointRadius: 11, 
                    fillColor: "#FFFFFF",
                    fillOpacity: 0.8,
                    strokeColor: "#666666",
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
        this.showPopup(f.data.name, f.data.content);

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

    hidePopup: function() {

        if (this.popup) {
            this.popup.destroy();
        }
    },

    showPopup: function(title, html) {

        if (this.recenterFeature) {

            this.hidePopup();
            this.popup = new GeoExt.Popup({
                map: this.api.map,
                title: title,
                feature: this.recenterFeature,
                width: 250,
                html: html,
                unpinnable: false,
                border: false
            });

            if (this.popupEvents) {
                this.popup.on(this.popupEvents);
            }

            this.popup.show();
        }
    }
});
