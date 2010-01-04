/**
 * @requires OpenLayers/Control/ArgParser.js
 */

Ext.namespace("MapFish");

MapFish.API.ArgParser = OpenLayers.Class(OpenLayers.Control.ArgParser, {

    /**
     * Property: coordsParams
     * lon and lat coordinate of map center
     */
    coordsParams: null,

    /**
     * Property: api
     * {MapFish.API} instance
     */
    api: null,

    /**
     * Constructor: MapFish.API.ArgParser(options)
     * This class is an extension of {OpenLayers.Control.ArgParser}
     * It is used to parse arguments from the URL when loading a page.
     *
     * Parameters:
     * options.api - api
     * options.coordsParams - coordinate
     *
     */
    initialize: function(options) {
        OpenLayers.Control.prototype.initialize.apply(this, arguments);

        this.api = options && options.api;
        this.coordsParams = options && options.coordsParams || {lon: 'lon', lat: 'lat'};
    },

    /**
     * Method: setMap(map)
     * Set the map base on the layer nodes, the map center and the zoom level
     * 
     * Parameters:
     * map - map created based on the url paramaters
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
