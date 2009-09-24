/**
 * MapFishAPI is a predefined API based on the MapFish framework. It provides
 * a convenient way to rapidly setup map applications using standardized
 * classes and public methods.
 */

Ext.namespace("MapFish");

mapFishApiPool = {

    apiRefs: [],

    createRef: function(ref) {
        var index = this.apiRefs.length;
        this.apiRefs[index] = ref;
        return index;
    }
};

MapFish.API = OpenLayers.Class({
    /**
     * Property: map
     * {OpenLayers.Map}
     */
    map: null,

    /**
     * Property: drawLayer
     * {OpenLayers.Layer.Vector}
     */
    drawLayer: null,

    /**
     * Property: baseConfig
     * baseConfig
     */
    baseConfig: null,

    /**
     * Property: apiId
     * Index of current API instance. Useful when several instances coexist.
     */
    apiId: null,

    /**
     * Property: searcher
     * Instance of Search class
     */
    searcher: null,

    /**
     * Property: debug
     * Flag indicating if debug mode is active.
     */
    debug: false,

    /**
     * Property: tree
     * Layer tree
     */
    tree: null,

    /**
     * Property: isMainApp
     * Boolean. Tells if API is used within main application or in external mode.
     */
    isMainApp: false,

    /**
     * Property: recenterUrl
     * URL part relative to config baseUrl: URL of recentering service
     */
    recenterUrl: '/recenter',

    /**
     * Property: highlightUrl
     * URL part relative to config baseUrl: URL of highlighting service
     */
    highlightUrl: '/geometry',

    /**
     * Property: layerTreeNodes
     * Array storing checked layers ids according to permalink
     */
    layerTreeNodes: [],

    /**
     * Constructor: MapFish.API
     */
    initialize: function(config) {
        this.apiId = mapFishApiPool.createRef(this);

        this.baseConfig = config || {};

        if (this.baseConfig.debug) {
            this.debug = true;
        }

        if (this.baseConfig.isMainApp) {
            this.isMainApp = true;
        }

        // set lang using following order:
        // API instance config > lang param in HTML > extended API class property
        var lang = this.baseConfig.lang || ($('lang') ? $('lang').value : null) || this.lang;
        if (lang) {
            OpenLayers.Lang.setCode(lang);
        }

        if (!this.debug) {
            // keep missing tiles transparent:
            OpenLayers.Util.onImageLoadError = function() {
                this.style.display = "none";
                // set the size to 0x0 because webkit don't take the display into
                // account and display a "broken image" icon.
                this.style.width = "0px";
                this.style.height = "0px";
            };
        }
    },

    /**
     * Method: createMap
     */
    createMap: function(config) {
        config = config || {};

        var options = this.getMapOptions();
        if (config.div) {
            options.div = config.div;
        }

        var layers = this.getLayers(config);

        var controls = this.getControls(config);
        if (controls) {
            options.controls = controls;
        }

        this.map = new OpenLayers.Map(options);

        // Create always a draw layer on top
        this.drawLayer = this.getDrawingLayer();
        layers.push(this.drawLayer);

        this.map.addLayers(layers);

        this.drawLayer.setZIndex(this.map.Z_INDEX_BASE['Feature']);

        // Put Drawing Layer always on top (Map.setLayerIndex reorder always ALL layers)
        this.map.events.on({
            scope: this.drawLayer,
            changelayer: function(evt) {
                if (evt.property == "order") {
                    this.setZIndex(this.map.Z_INDEX_BASE['Feature']);
                }
            }
        });

        if (!this.map.getCenter()) {
            if (config.easting && config.northing) {
                this.map.setCenter(new OpenLayers.LonLat(config.easting, config.northing), config.zoom);
            } else if (config.bbox) {
                this.map.zoomToExtent(new OpenLayers.Bounds.fromArray(config.bbox));
            } else if (this.baseConfig.initialExtent) {
                this.map.zoomToExtent(new OpenLayers.Bounds.fromArray(this.baseConfig.initialExtent));
            } else {
                this.map.zoomToMaxExtent();
            }
        }

        return this.map;
    },

    createMapPanel: function(config) {
        var mapPanel;
        config = config || {};

        if (!this.map) {
            var mapConfig = config.mapInfo || {};
            this.createMap(mapConfig);
        }
        config.map = this.map;

        var center = this.map.getCenter();
        if (center) {
            config.center = [center.lon, center.lat];
        }

        var zoom = this.map.getZoom();
        if (zoom) {
            config.zoom = zoom;
        }

        if (config.showTools) {
            var tbarConfig = config.toolbar || {};
            config.tbar = this.createToolbar(tbarConfig);
        }

        if (config.renderTo) {
            mapPanel = new GeoExt.MapPanel(config);
        } else {
            mapPanel = Ext.apply(config, {
                xtype: 'gx_mappanel'
            });
        }

        return mapPanel;
    },

    /**
     * Method: createLayerTree
     */
    createLayerTree: function(config) {
        config = config || {};
        if (config.div) {
            this.tree = new mapfish.widgets.LayerTree({
                map: this.map,
                renderTo: config.div,
                height: 'auto',
                showWmsLegend: config.showWmsLegend,
                model: this.getLayerTreeModel(),
                plugins: [
                    mapfish.widgets.LayerTree.createContextualMenuPlugin(['opacitySlideDirect'])
                ]
            });
            if (config.layers) {
                var checkedNodes = this.tree.getChecked();
                for (var i = 0, n = checkedNodes.length; i < n; i++) {
                    this.tree.setNodeChecked(checkedNodes[i], false);
                }
                for (var i = 0, n = config.layers.length; i < n; i++) {
                    var layer = config.layers[i];
                    var node = this.tree.nodeIdToNode[layer];
                    this.tree.setNodeChecked(node, true);
                }
            }
        } else {
            // We use a LayerTree object rather than a lazy config because
            // we later need a real object in this.tree.
            this.tree = new mapfish.widgets.LayerTree({
                title: config.title,
                map: this.map,
                showWmsLegend: config.showWmsLegend,
                model: this.getLayerTreeModel(),
                plugins: [
                    mapfish.widgets.LayerTree.createContextualMenuPlugin(['opacitySlideDirect'])
                ],
                listeners: {
                    checkchange: function(node, checked) {
                        var permalink = this.map.getControl('mapfish.api.permalink');
                        if (permalink) {
                            permalink.updateLink();
                        }
                    }
                }
            });
        }
        return this.tree;
    },

    createToolbar: function(config) {
        config = Ext.apply({items: [
            'ZoomToMaxExtent', 'Navigation', 'ZoomBox',
            'LengthMeasure', 'AreaMeasure', 'NavigationHistory'/*,
             'ZoomOut', 'DrawFeature', 'ClearFeatures' */
        ]}, config);
        var items = [], action;

        // FIXME: be gentle with memory allocation
        if (config.items.indexOf('ZoomToMaxExtent') != -1) {
            action = new GeoExt.Action(Ext.apply({
                map: this.map,
                control: new MapFish.API.ZoomToExtent(config.controls),
                iconCls: 'zoomfull'
                //toggleGroup: 'navigation',
                //allowDepress: false,
                //text: "max extent"
            }, config.actions));
            items.push(action);
        }

        if (config.items.indexOf('Navigation') != -1) {
            action = new Ext.Button(Ext.apply({
                toggleGroup: 'navigation',
                allowDepress: false,
                pressed: true,
                //text: 'nav',
                iconCls: 'pan'
            }, config.actions));
            items.push(action);
        }

        if (config.items.indexOf('ZoomBox') != -1) {
            action = new GeoExt.Action(Ext.apply({
                map: this.map,
                control: new OpenLayers.Control.ZoomBox(config.controls),
                toggleGroup: 'navigation',
                allowDepress: false,
                //text: 'zoom box',
                iconCls: 'zoomin'
            }, config.actions));
            items.push(action);
        }

        if (config.items.indexOf('ZoomOut') != -1) {
            action = new GeoExt.Action(Ext.apply({
                map: this.map,
                control: new OpenLayers.Control.ZoomBox(Ext.apply({out: true}, config.controls)),
                toggleGroup: 'navigation',
                allowDepress: false,
                //text: 'zoom box',
                iconCls: 'zoomout'
            }, config.actions));
            items.push(action);
        }

        if (config.items.indexOf('LengthMeasure') != -1) {
            var measure = new MapFish.API.Measure(config.controls);
            action = new GeoExt.Action(Ext.apply({
                map: this.map,
                control: measure.createLengthMeasureControl(),
                toggleGroup: 'navigation',
                allowDepress: false,
                //text: 'length',
                iconCls: 'measureLength'
            }, config.actions));
            items.push(action);
        }

        if (config.items.indexOf('AreaMeasure') != -1) {
            var measure = new MapFish.API.Measure(config.controls);
            action = new GeoExt.Action(Ext.apply({
                map: this.map,
                control: measure.createAreaMeasureControl(),
                toggleGroup: 'navigation',
                allowDepress: false,
                //text: 'area',
                iconCls: 'measureArea'
            }, config.actions));
            items.push(action);
        }

        if (config.items.indexOf('NavigationHistory') != -1) {
            var history = new OpenLayers.Control.NavigationHistory(config.controls);
            history.activate();
            this.map.addControl(history);

            action = new GeoExt.Action(Ext.apply({
                tooltip: OpenLayers.i18n("previous"),
                control: history.previous,
                iconCls: 'previous',
                disabled: true
            }, config.actions));
            items.push(action);

            action = new GeoExt.Action(Ext.apply({
                tooltip: OpenLayers.i18n("next"),
                control: history.next,
                iconCls: 'next',
                disabled: true
            }, config.actions));
            items.push(action);
        }

        if (config.items.indexOf('DrawFeature') != -1) {
            var handlers = mapfish.Util.fixArray(
                    config.drawHandlers || ['Point', 'Path', 'Polygon']);
            for (var i = 0; i < handlers.length; i++) {
                var control = new OpenLayers.Control.DrawFeature(
                        this.getDrawingLayer(),
                        OpenLayers.Handler[handlers[i]],
                        config.controls);
                this.map.addControl(control);
                action = new GeoExt.Action(Ext.apply({
                    map: this.map,
                    control: control,
                    toggleGroup: 'navigation',
                    allowDepress: false,
                    iconCls: 'draw' + handlers[i]
                }, config.actions));
                items.push(action);
            }
        }

        if (config.items.indexOf('ClearFeatures') != -1) {
            var scope = this;
            action = new Ext.Button(Ext.apply({
                handler: function() {
                    scope.getDrawingLayer().destroyFeatures()
                },
                iconCls: 'clearfeatures'
            }, config.actions));
            items.push(action);
        }

        return items;
    },

    showFeatureTooltip: function(config) {
        if (!config.layer || !config.id) return;

        this.getSearcher().recenterProtocol.read({params: {
            layer: config.layer,
            id: config.id
        }});
        // FIXME: cross-domain query!
    },

    /**
     * This method requires a server-side controller located at baseUrl+recenterUrl
     * returning either a JSONified bbox in AJAX mode
     * or some JS code like:
     * mapFishApiPool.apiRefs[2].recenterOnBboxCb({"rows": [{"bbox": [672518.0, 267450.23999999999, 697695.0, 295935.0]}], "results": 1});
     * in cross-domain mode. See Ext.data.ScriptTagProxy doc.
     */
    recenterOnObjects: function(layer, ids) {
        if (this.isMainApp) {
            OpenLayers.Request.GET({
                url: this.baseConfig.baseUrl + this.recenterUrl,
                params: { layers: layer, ids: ids },
                success: function(response) {
                    var f = new OpenLayers.Format.JSON();
                    var bbox = f.read(response.responseText);
                    this.recenterOnBbox(bbox);
                },
                scope: this
            });
        } else {
            // case of integration in external pages (cross-domain workaround)
            var ds = new Ext.data.Store({
                proxy: new Ext.data.ScriptTagProxy({
                    url: this.baseConfig.baseUrl + this.recenterUrl
                }),
                reader: new Ext.data.JsonReader({
                    root: "rows",
                    totalProperty: "results"
                }, [
                    {
                        name: 'bbox'
                    }
                ])
            });
            ds.load({
                params:{
                    layers: layer,
                    ids: [ids],
                    cb: 'mapFishApiPool.apiRefs[' + this.apiId + '].recenterOnBboxCb'
                }
            });
        }
    },

    /**
     * This method requires a server-side controller located at baseUrl+highlightUrl
     * returning some JS code like:
     * mapFishApiPool.apiRefs[2].highlightObjectsCb({"rows": [{"features": {"type": "FeatureCollection", "features": [{"geometry": {"type": "MultiPolygon", "coordinates": [[[[672518.0, 267450.23999999999], [672518.0, 295935.0], [697695.0, 295935.0], [697695.0, 267450.23999999999]]]]}, "type": "Feature", "properties": {}}]}}], "results": 1});
     * See Ext.data.ScriptTagProxy doc.
     */
    highlightObjects: function(layer, ids) {
        var ds = new Ext.data.Store({
            proxy: new Ext.data.ScriptTagProxy({
                url: this.baseConfig.baseUrl + this.highlightUrl
            }),
            reader: new Ext.data.JsonReader({
                root: "rows",
                totalProperty: "results"
            }, [
                {
                    name: 'features'
                }
            ])
        });
        ds.load({
            params:{
                layers: layer,
                ids: [ids],
                cb: 'mapFishApiPool.apiRefs[' + this.apiId + '].highlightObjectsCb'
            }
        });
    },

    showFeatures: function(layer, ids) {
        this.recenterOnObjects(layer, ids);
        this.highlightObjects(layer, ids);
    },

    /*
     * Shows a marker
     * Options:
     * - easting : position of the marker
     *     default: map center
     * - northing : position of the marker
     *     default: map center
     * - iconPath : path of a custom icon for the marker (url or relative)
     *     default: /mfbase/openlayers/img/marker-gold.png
     * - recenter: define if the map has to recentered at the marker position
     *     default: false
     * - graphicHeight: height of the height
     *     default: the icon height
     * - graphicWidth: width of the height
     *     default: the icon width
     * - fillOpacity: opacity of the marker (from 0 to 1)
     *     default: 1
     */
    showMarker: function(options) {
        options = options || {};

        var easting;
        var northing;
        var iconPath;
        var recenter;
        var graphicHeight;
        var graphicWidth;
        var fillOpacity;

        // Get the coordinates
        if (options.easting) {
            easting = options.easting;
        } else {
            easting = this.map.getCenter().lon;
        }
        if (options.northing) {
            northing = options.northing;
        } else {
            northing = this.map.getCenter().lat;
        }
        // Get the iconPath
        if (options.iconPath) {
            if (options.iconPath.indexOf('http://') == 0) {
                iconPath = this.getIconPath(options.iconPath);
            } else {
                if (options.iconPath.indexOf('/') == 0) {
                    iconPath = this.baseConfig.baseUrl + this.getIconPath(options.iconPath);
                } else {
                    iconPath = this.baseConfig.baseUrl + '/' + this.getIconPath(options.iconPath);
                }
            }

        } else {
            iconPath = this.baseConfig.baseUrl + "/mfbase/openlayers/img/marker-gold.png";
        }

        // Get is the map has to be recentered
        if (options.recenter) {
            if (options.recenter == "true" || options.recenter == "True" || options.recenter == "TRUE") {
                recenter = "true";
            } else {
                recenter = "false";
            }
        } else {
            recenter = "false";
        }

        // Get a custom height for the marker
        if (options.graphicHeight) {
            graphicHeight = options.graphicHeight;
        } else {
            var graphic = new Image();
            graphic.src = this.getIconPath(iconPath);
            if (graphic.height) {
                graphicHeight = graphic.height;
            } else {
                graphicHeight = 25;
            }
        }

        // Get a custom width for the marker
        if (options.graphicWidth) {
            graphicWidth = options.graphicWidth;
        } else {
            var graphic = new Image();
            graphic.src = this.getIconPath(iconPath);
            if (graphic.width) {
                graphicWidth = graphic.width;
            } else {
                graphicWidth = 25;
            }
        }

        // Get a custom fillOpacity for the marker
        if (options.fillOpacity) {
            fillOpacity = options.fillOpacity;
        } else {
            fillOpacity = 1;
        }

        // Set a style for the marker
        var style_mark = OpenLayers.Util.extend({}, OpenLayers.Feature.Vector.style['default']);
        style_mark.externalGraphic = this.getIconPath(iconPath);
        style_mark.fillOpacity = fillOpacity;
        style_mark.graphicHeight = graphicHeight;
        style_mark.graphicWidth = graphicWidth;


        // Create a new feature
        var features = new Array(1);
        features[0] = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.Point(easting, northing), null, style_mark
                );


        this.drawLayer.addFeatures(features);

        if (recenter == "true") {
            this.map.setCenter(new OpenLayers.LonLat(easting, northing));
        }
    },

    /*
     * Shows a GeoExt popup
     * Options:
     * - easting : position of the popup
     *     default: map center
     * - northing : position of the popup
     *     default: map center
     * - title: title of the window
     *     defaul: ""
     * - html : html content of the popup
     *     default: ""
     * - recenter: define if the map has to recentered at the popup position
     *     default: false
     * - width: width of the popup
     *     default: 200
     * - collapsible
     *     default: false
     * - unpinnable
     *     default: true
     */
    showPopup: function(options) {
        options = options || {};

        var easting;
        var northing;
        var title;
        var html;
        var recenter;
        var width;
        var collapsible;
        var unpinnable;

        // Manage options
        if (options.easting) {
            easting = options.easting;
        } else {
            easting = this.map.getCenter().lon;
        }
        if (options.northing) {
            northing = options.northing;
        } else {
            northing = this.map.getCenter().lat;
        }
        if (options.title) {
            title = options.title;
        } else {
            title = "";
        }
        if (options.html) {
            html = options.html;
        } else {
            html = "";
        }
        if (options.recenter) {
            if (options.recenter == "true" || options.recenter == "True" || options.recenter == "TRUE") {
                recenter = "true";
            } else {
                recenter = "false";
            }
        } else {
            recenter = "false";
        }

        if (options.width) {
            width = options.width;
        } else {
            width = 200;
        }

        if (options.collapsible) {
            collapsible = options.collapsible;
        } else {
            collapsible = false;
        }

        if (options.unpinnable) {
            unpinnable = options.unpinnable;
        } else {
            unpinnable = true;
        }

        var popup = new GeoExt.Popup({
            map: this.map,
            title: title,
            lonlat: new OpenLayers.LonLat(easting, northing),
            width: width,
            html: html,
            collapsible: collapsible,
            unpinnable: unpinnable
        });
        popup.show();

        if (recenter == "true") {
            this.map.setCenter(new OpenLayers.LonLat(easting, northing));
        }
    },

    /**
     * Works only if layertree is a mapfish.widgets.LayerTree and has id attributes
     * for all of its nodes.
     */
    updateLayerTreeFromPermalink: function() {
        var layertree = this.tree;
        if (layertree && this.layerTreeNodes.length > 0) {

            // unckeck all previously checked nodes
            var checkedNodes = layertree.getChecked();
            for (var i = 0, len = checkedNodes.length; i < len; i++) {
                layertree.setNodeChecked(checkedNodes[i], false);
            }

            // check nodes listed in permalink
            for (var i = 0, len = this.layerTreeNodes.length; i < len; i++) {
                var nodeId = layertree.nodeIdToNode[this.layerTreeNodes[i]];
                if (nodeId) {
                    layertree.setNodeChecked(nodeId, true);
                }
            }
        }
    },

    /* Private methods */

    recenterOnBboxCb: function(r) {
        this.recenterOnBbox(r.rows[0].bbox);
    },

    recenterOnBbox: function(bbox) {
        var bounds = new OpenLayers.Bounds(bbox[0], bbox[1], bbox[2], bbox[3]);
        if (bounds.getWidth() && bounds.getHeight()) {
            this.map.zoomToExtent(bounds);
        } else {
            // bbox is actually a point
            var center = bounds.getCenterLonLat();
            if (center.lat && center.lon) {
                this.map.setCenter(center, 19); // FIXME: make zoom variable
            }
        }
    },

    highlightObjectsCb: function(r) {
        var geo = new OpenLayers.Format.GeoJSON();
        var features = geo.read(r.rows[0].features);
        if (features) {
            var layer = this.getDrawingLayer();
            ;
            layer.addFeatures(features);
        }
    },

    getDrawingLayer: function() {
        if (!this.drawLayer) {
            var myStyles = new OpenLayers.StyleMap({
                "default": new OpenLayers.Style({
                    pointRadius: "10",
                    fillColor: "#FFFF00",
                    fillOpacity: 0.8,
                    strokeColor: "#FF8000",
                    strokeOpacity: 0.8,
                    strokeWidth: 2
                })
            });
            this.drawLayer = new OpenLayers.Layer.Vector("Drawings layer",
            {
                displayInLayerSwitcher: false,
                styleMap: myStyles
            });
        }
        return this.drawLayer;
    },

    getLayers: function(config) {
        // to be implemented
        return null;
    },

    getControls: function(config) {
        // to be implemented
        return null;
    },

    getMapOptions: function() {
        // to be implemented
        return null;
    },

    getLayerTreeModel: function() {
        // to be implemented
        return null;
    },

    getSearcher: function() {
        if (!this.searcher) {
            this.searcher = new MapFish.API.Search({
                api: this,
                url: this.baseConfig.searchUrl
            });
        }
        return this.searcher;
    },

    getIconPath: function(iconPath) {
        return iconPath;
    }
});
