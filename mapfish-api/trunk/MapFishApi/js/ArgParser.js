/**
 * This class is an extension of OpenLayers control ArgParser.
 *
 * It is used to parse arguments from the URL when loading a page.
 */
Ext.namespace("MapFish");

MapFish.API.ArgParser = OpenLayers.Class(OpenLayers.Control.ArgParser, {

    coordsParams: {lon: 'lon', lat: 'lat'},

    initialize: function(options) {
        OpenLayers.Control.prototype.initialize.apply(this, arguments);

        if (options && options.coordsParams) {
            this.coordsParams = options.coordsParams;
        }
    },

    /**
     * Method: setMap
     */
    setMap: function(map) {
        OpenLayers.Control.prototype.setMap.apply(this, arguments);

        var args = OpenLayers.Util.getParameters();

        if (args.layerNodes) { 
            if (typeof args.layerNodes == 'string') {
                args.layerNodes = [args.layerNodes];
            }
            this.api.layerTreeNodes = args.layerNodes;
        }

        var lon = args[this.coordsParams.lon];
        var lat = args[this.coordsParams.lat];
        if (lon && lat) {
            this.center = new OpenLayers.LonLat(parseFloat(lon),
                                                parseFloat(lat));
            if (args.zoom) {
                this.zoom = parseInt(args.zoom);
            }
    
            // when we add a new baselayer to see when we can set the center
            this.map.events.register('changebaselayer', this, 
                                     this.setCenter);
            this.setCenter();
        }
    },

    CLASS_NAME: "MapFish.API.ArgParser"
});
