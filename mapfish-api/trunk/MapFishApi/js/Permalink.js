/**
 * This class is an extension of OpenLayers control Permalink.
 *
 * It is used to save the current app context as URL parameters.
 */

Ext.namespace("MapFish");

MapFish.API.Permalink = OpenLayers.Class(OpenLayers.Control.Permalink, {

    coordsParams: {lon: 'lon', lat: 'lat'},
    id: 'mapfish.api.permalink',

    argParserClass: MapFish.API.ArgParser,

    initialize: function(element, base, options) {
        OpenLayers.Control.Permalink.prototype.initialize.apply(this, arguments);

        if (options && options.coordsParams) {
            this.coordsParams = options.coordsParams;
        }
    },

    /**
     * Method: draw
     */
    draw: function() {
        OpenLayers.Control.prototype.draw.apply(this, arguments);
    
        this.map.events.on({
            'moveend': this.updateLink,
            'changelayer': this.updateLink,
            'changebaselayer': this.updateLink,
            scope: this
        });

        // Make it so there is at least a link even though the map may not have
        // moved yet.
        this.updateLink();
    
        return this.div;
    },  
   
    /** 
     * Method: updateLink 
     */
    updateLink: function() {
        var href = this.base;
        if (href.indexOf('?') != -1) {
            href = href.substring( 0, href.indexOf('?') );
        }

        href += '?' + OpenLayers.Util.getParameterString(this.createParams());
        if (this.element) {
           this.element.value = href; // FIXME: only OK for input fields
        }
    },

    createParams: function(center, zoom, layers) {
        if (this.map) {
           center = center || this.map.getCenter();
        } else {
            return '';
        }

        var params = OpenLayers.Util.getParameters(this.base);

        // If there's still no center, map is not initialized yet. 
        // Break out of this function, and simply return the params from the
        // base link.
        if (center) {

            //zoom
            params.zoom = zoom || this.map.getZoom();

            //lon,lat
            var lat = center.lat;
            var lon = center.lon;

            if (this.displayProjection) {
                var mapPosition = OpenLayers.Projection.transform(
                  { x: lon, y: lat },
                  this.map.getProjectionObject(),
                  this.displayProjection );
                lon = mapPosition.x;
                lat = mapPosition.y;
            }
            params[this.coordsParams.lat] = Math.round(lat*100000)/100000;
            params[this.coordsParams.lon] = Math.round(lon*100000)/100000;

            // layers selection
            params.layers = null; // neutralizes OL behaviour for layers
            var layertree = this.api.tree;
            if (layertree) {
                var nodes = []; 
                var checkedNodes = layertree.getChecked();
                for (var i = 0, len = checkedNodes.length; i < len; i++) {
                    var node = checkedNodes[i];
                    if (node.id) {
                        nodes.push(node.id);
                    }
                }
                if (nodes.length > 0) {
                    params.layerNodes = nodes;
                }
            }
        }

        return params;
    },

    CLASS_NAME: "MapFish.API.Permalink"
});
