/**
* @requires MapFishApi/js/mapfish_api.js
* @requires OpenLayers/BaseTypes/Class.js
* @requires OpenLayers/Control.js
*/

Ext.namespace("MapFish");

MapFish.API.ZoomToExtent = OpenLayers.Class(OpenLayers.Control, {

    /**
     * Property: type
     * {OpenLayers.Control.TYPE_BUTTON}
     */
    type: OpenLayers.Control.TYPE_BUTTON,

    /**
     * Constructor: MapFish.API.ZoomToExtent(config)
     * Create a ZoomToExtent {OpenLayers.Control}
     *
     */
    initialize: function(config) {
        Ext.apply(this, config);
        OpenLayers.Control.prototype.initialize.apply(this, arguments);
    },
    
    trigger: function() {
        if (this.map) {
            if (this.extent) {
                this.map.zoomToExtent(this.extent);
            } else if (this.center && this.zoom) {
                this.map.setCenter(this.center, this.zoom);
            } else {
                this.map.zoomToMaxExtent();
            }
        }    
    },

    CLASS_NAME: "MapFish.API.ZoomToExtent"
});
