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
     * {OpenLayers.Map}: map component
     */
    map: null,

    /**
     * Property: drawLayer
     * {OpenLayers.Layer.Vector}: drawing layer over the map
     */
    drawLayer: null,

    /**
     * Property: baseConfig
     * baseConfig of the api
     */
    baseConfig: null,

    /**
     * Property: apiId
     * Index of current API instance. Useful when several instances coexist.
     */
    apiId: null,

    /**
     * Property: searcher
     * Instance of {MapFish.API.Search} class
     */
    searcher: null,

    /**
     * Property: debug
     * Flag indicating if debug mode is active.
     */
    debug: null,

    /**
     * Property: tree
     * Instance of {mapfish.widgets.LayerTree} class
     */
    tree: null,

    /**
     * Property: isMainApp
     * Boolean to tell if API is used within main application or in external mode.
     */
    isMainApp: null,

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
    layerTreeNodes: null,

    /**
     * Property: selectCtrl
     * Instance of {OpenLayers.Control.SelectFeature}
     */
    selectCtrl: null,

    /**
     * Property: popup
     * GeoExt.Popup
     */
    popup: null,

    /**
     * Property: apiName
     * Name of the API
     */
    apiName: 'MapFish',

    /**
     * Property: tools
     * list of enabled tools's actions
     */
    tools: null,

    /**
     * Constructor: MapFish.API(config)
     * Create and return an instance of the MapFish API
     *
     * MapFishAPI is an API based on the MapFish framework. It provides
     * a convenient way to rapidly setup map applications using standardized
     * classes and public methods.
     *
     * Parameters:
     * config.debug - set the debug mode (prod or debug)
     * config.isMainApp - define is the API is an instance of the main application or of a derived application
     * config.lang - set the lang
     * config.baseUrl - base url of the main application
     * config.initialExtent - initial extent of the map
     * config.searchUrl - search url
     *
     * Example:
     * (code)
     * api = new MapFish.API({
     *         baseUrl: '<main application url>'
     * });
     * (end)
     */
    initialize: function(config) {
        this.apiId = mapFishApiPool.createRef(this);

        this.baseConfig = config || {};

        this.debug = Boolean(this.baseConfig.debug);
        this.isMainApp = Boolean(this.baseConfig.isMainApp);
        this.layerTreeNodes = [];

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
                // set the img src because webkit don't take the display into
                // account and display a "broken image" icon.
                this.src = Ext.BLANK_IMAGE_URL;
            };
        }
    },

    /**
     * Method: createMap(config)
     * Create and return an {OpenLayers.Map} and place a vector drawing layer {OpenLayers.Layer.Vector} on top
     *
     *
     * Parameters:
     * config.div - div where to place the map
     * config.easting - center of the map, easting value
     * config.northing - center of the map, northing value
     * config.zoom - zoom level
     * config.bbox - bbox of the initial extent
     *
     * Example:
     * (code)
     * api.createMap({
     *          div: 'mymap1',
     *          zoom: 14,
     *          easting: 518752,
     *          northing: 147276,
     * });
     * (end)
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

    getCreateMapDescription: function(html) {
        var separator = this.getReturnLine(html);
        var comment = "      // createMap config parameters" + separator;
        comment = comment + "      //  div - div where to place the map" + separator;
        comment = comment + "      //  easting - center of the map, easting value" + separator;
        comment = comment + "      //  northing - center of the map, northing value" + separator;
        comment = comment + "      //  zoom - zoom level" + separator;
        comment = comment + "      //  bbox - bbox of the initial extent" + separator;
        return comment;
    },

    createPermalinkFormPanel: function() {
        return new MapFish.API.PermalinkFormPanel();
    },

    createApiFormPanel: function() {
        return new MapFish.API.ApiFormPanel(this);
    },

    createAddWmsLayerFormPanel: function() {
        return new MapFish.API.AddWmsLayerFormPanel(this);
    },

    getReturnLine: function(html) {
        var separator = "\n";
        if (html) {
            separator = "<br>";
        }
        return separator;
    },
    createApiCode: function(html) {
        var separator = this.getReturnLine(html);
        var apiText = '<html xmlns=\"http://www.w3.org/1999/xhtml\">';
        apiText = apiText + separator;
        apiText = apiText + "  <head>";
        apiText = apiText + separator;
        apiText = apiText + "    <meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf8\" />";
        apiText = apiText + separator;
        apiText = apiText + "    <meta name=\"content-language\" content=\"en\" />";
        apiText = apiText + separator;
        apiText = apiText + "    <title>API</title>";

        s = document.styleSheets;
        for (i = 0; i < s.length; i++) {
            apiText = apiText + separator;
            apiText = apiText + "    <link rel=\"stylesheet\" type=\"text/css\" href=\"" + s[i].href + "\"/>";
        }

        var scripts = document.getElementsByTagName('script');
        for (i = 0; i < scripts.length; i++) {
            var script = scripts[i];
            if (script.src.indexOf('init.js') < 0 && script.src.indexOf('ws.geonames.org') < 0) {
                apiText = apiText + separator;
                apiText = apiText + "    <script type=\"text/javascript\" src=\"" + script.src + "\"></script>";
            }
        }
        apiText = apiText + separator;
        apiText = apiText + "  <script type=\"text/javascript\">" + separator;
        apiText = apiText + "    Ext.onReady(function() {" + separator;
        apiText = apiText + "      geo = new " + this.apiName + ".API();" + separator;
        apiText = apiText + this.getCreateMapDescription(html);
        apiText = apiText + "      geo.createMap({" + separator;
        apiText = apiText + "         div: 'mymap1'," + separator;
        apiText = apiText + "         zoom: " + this.map.zoom + "," + separator,
                apiText = apiText + "         easting: " + this.map.getCenter().lon + "," + separator,
                apiText = apiText + "         northing: " + this.map.getCenter().lat + separator,
                apiText = apiText + "      });" + separator;
        var cbShowMarker = Ext.getCmp('cbMarkerApiFormPanel');
        if (cbShowMarker) {
            if (cbShowMarker.getValue()) {
                apiText = apiText + this.getShowMarkerDescription(html);
                apiText = apiText + "      geo.showMarker();" + separator;
            }
        }
        var cbShowPopup = Ext.getCmp('cbPopupApiFormPanel');
        if (cbShowPopup) {
            if (cbShowPopup.getValue()) {
                apiText = apiText + this.getShowPopupDescription(html);
                apiText = apiText + "      geo.showPopup({" + separator;
                apiText = apiText + "         html: '" + Ext.getCmp('cbPopupContentApiFormPanel').getValue() + "'" + separator;
                apiText = apiText + "      });" + separator;
            }
        }
        apiText = apiText + "    });" + separator;
        apiText = apiText + "  </script>" + separator;
        apiText = apiText + "  </head>";
        apiText = apiText + separator;
        apiText = apiText + "    <body>";
        apiText = apiText + separator;
        apiText = apiText + "       <div id=\"mymap1\" style=\"width:800px;height:600px;border:1px solid black;\"></div>";
        apiText = apiText + separator;
        apiText = apiText + "    </body>";
        apiText = apiText + separator;
        apiText = apiText + "</html>";
        apiText = apiText + separator;
        return apiText;

    },

    /**
     * Method: createMapPanel(config)
     * Create and return an {GeoExt.MapPanel}
     * and create an {OpenLayers.Map} if it doesn't exist
     *
     *
     * Parameters:
     * config.mapfinfo - map config object (see createMap(config))
     * config.showTools - define is the tools are shown in the MapPanel
     * config.renderTo - renderTo
     */
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
     * Method: createLayerTree(config)
     * Create and return an {mapfish.widgets.LayerTree}
     *
     * Parameters:
     * config.div - div where to place the LayerTree
     * config.layers - layers in the tree
     * config.title - title of the tree
     * config.showWmsLegend - define is te WMS legend is shown
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

    /**
     * Method: createToolbar(config)
     * Create and return an array of functions.
     * Supported function: 'ZoomToMaxExtent', 'Navigation', 'ZoomBox','LengthMeasure', 'AreaMeasure', 'NavigationHistory','ZoomOut', 'DrawFeature', 'ClearFeatures'
     *
     * Parameters:
     * config.items - array of function to activate. Possible values: 'ZoomToMaxExtent', 'Navigation', 'ZoomBox','LengthMeasure', 'AreaMeasure', 'NavigationHistory','ZoomOut', 'DrawFeature', 'ClearFeatures'
     */

    createToolbar: function(config) {
        config = Ext.apply({items: [
            'ZoomToMaxExtent', 'Navigation', 'ZoomBox',
            'LengthMeasure', 'AreaMeasure', 'NavigationHistory'/*,
             'ZoomOut', 'DrawFeature', 'ClearFeatures' */
        ]}, config);
        this.tools = [];
        
        // init all enabled tools
        for (var i = 0; i < config.items.length; i++) {
          this['init' + config.items[i]](config);
        }

        return this.tools;
    },
    
    initZoomToMaxExtent: function (config) {
        var action = new GeoExt.Action(Ext.apply({
            map: this.map,
            control: new MapFish.API.ZoomToExtent(config.controls),
            iconCls: 'zoomfull'
            //toggleGroup: 'navigation',
            //allowDepress: false,
            //text: "max extent"
        }, config.actions));
        this.tools.push(action);
    },

    initNavigation: function (config) {
        var action = new Ext.Button(Ext.apply({
            toggleGroup: 'navigation',
            allowDepress: false,
            pressed: true,
            id: 'navigationButton',
            //text: 'nav',
            iconCls: 'pan'
        }, config.actions));
        this.tools.push(action);
    },

    initZoomBox: function (config) {
        var action = new GeoExt.Action(Ext.apply({
            map: this.map,
            control: new OpenLayers.Control.ZoomBox(config.controls),
            toggleGroup: 'navigation',
            allowDepress: false,
            //text: 'zoom box',
            iconCls: 'zoomin'
        }, config.actions));
        this.tools.push(action);
    },

    initZoomOut: function (config) {
        var action = new GeoExt.Action(Ext.apply({
            map: this.map,
            control: new OpenLayers.Control.ZoomBox(Ext.apply({out: true}, config.controls)),
            toggleGroup: 'navigation',
            allowDepress: false,
            //text: 'zoom box',
            iconCls: 'zoomout'
        }, config.actions));
        this.tools.push(action);
    },

    initLengthMeasure: function (config) {
        var measure = new MapFish.API.Measure(config.controls);
        var action = new GeoExt.Action(Ext.apply({
            map: this.map,
            control: measure.createLengthMeasureControl(),
            toggleGroup: 'navigation',
            allowDepress: false,
            //text: 'length',
            iconCls: 'measureLength'
        }, config.actions));
        this.tools.push(action);
    },

    initAreaMeasure: function (config) {
        var measure = new MapFish.API.Measure(config.controls);
        var action = new GeoExt.Action(Ext.apply({
            map: this.map,
            control: measure.createAreaMeasureControl(),
            toggleGroup: 'navigation',
            allowDepress: false,
            //text: 'area',
            iconCls: 'measureArea'
        }, config.actions));
        this.tools.push(action);
    },

    initNavigationHistory: function (config) {
        var history = new OpenLayers.Control.NavigationHistory(config.controls);
        history.activate();
        this.map.addControl(history);

        var action = new GeoExt.Action(Ext.apply({
            tooltip: OpenLayers.i18n("previous"),
            control: history.previous,
            iconCls: 'previous',
            disabled: true
        }, config.actions));
        this.tools.push(action);

        action = new GeoExt.Action(Ext.apply({
            tooltip: OpenLayers.i18n("next"),
            control: history.next,
            iconCls: 'next',
            disabled: true
        }, config.actions));
        this.tools.push(action);
    },

    initDrawFeature: function (config) {
        var handlers = mapfish.Util.fixArray(
                config.drawHandlers || ['Point', 'Path', 'Polygon']);
        for (var i = 0; i < handlers.length; i++) {
            var control = new OpenLayers.Control.DrawFeature(
                    this.getDrawingLayer(),
                    OpenLayers.Handler[handlers[i]],
                    config.controls);
            this.map.addControl(control);
            var action = new GeoExt.Action(Ext.apply({
                map: this.map,
                control: control,
                toggleGroup: 'navigation',
                allowDepress: false,
                iconCls: 'draw' + handlers[i]
            }, config.actions));
            this.tools.push(action);
        }
    },

    initClearFeatures: function (config) {
        var scope = this;
        var action = new Ext.Button(Ext.apply({
            handler: function() {
                scope.getDrawingLayer().destroyFeatures()
            },
            iconCls: 'clearfeatures'
        }, config.actions));
        this.tools.push(action);
    },

    /**
     * Method: showFeatureTooltip(config)
     * Show a feature tooltip. Experimental.
     *
     * Parameters:
     * config.layer - name of the layer
     * config.id - id of the object
     */
    showFeatureTooltip: function(config) {
        if (!config.layer || !config.id) return;

        this.getSearcher().recenterProtocol.read({params: {
            layer: config.layer,
            id: config.id
        }});
        // FIXME: cross-domain query!
    },

    /**
     * Method: recenterOnObjects(layer, ids)
     * Recenter map based on list of features
     *
     * This method requires a server-side controller located at baseUrl+recenterUrl
     * returning either a JSONified bbox in AJAX mode
     * or some JS code like:
     * mapFishApiPool.apiRefs[2].recenterOnBboxCb({"rows": [{"bbox": [672518.0, 267450.23999999999, 697695.0, 295935.0]}], "results": 1});
     * in cross-domain mode. See Ext.data.ScriptTagProxy doc.
     *
     * Parameters:
     * layer - name of the layer
     * ids - array of feature id
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
     * Method: highlightObjects(layer, ids)
     * Highlight features in the map
     *
     * This method requires a server-side controller located at baseUrl+highlightUrl
     * returning some JS code like:
     * mapFishApiPool.apiRefs[2].highlightObjectsCb({"rows": [{"features": {"type": "FeatureCollection", "features": [{"geometry": {"type": "MultiPolygon", "coordinates": [[[[672518.0, 267450.23999999999], [672518.0, 295935.0], [697695.0, 295935.0], [697695.0, 267450.23999999999]]]]}, "type": "Feature", "properties": {}}]}}], "results": 1});
     * See Ext.data.ScriptTagProxy doc.
     *
     * Parameters:
     * layer - name of the layer
     * ids - array of feature id
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
    /**
     * Method: showFeatures(layer, ids)
     * Recenter and highlight a list of features
     *
     * Parameters:
     * layer - name of the layer
     * ids - array of feature id
     */
    showFeatures: function(layer, ids) {
        this.recenterOnObjects(layer, ids);
        this.highlightObjects(layer, ids);
    },

    /**
     * Method: showMarker(options)
     * Show a marker in the map and associate a popup if an html content is provided
     *
     * Parameters:
     * options.easting - position of the marker, default: map center
     * options.northing - position of the marker, default: map center
     * options.iconPath - path of a custom icon for the marker (url or relative), default: /mfbase/openlayers/img/marker-gold.png
     * options.recenter - define if the map has to recentered at the marker position, default: false
     * options.graphicHeight - height of the height, default: the icon height
     * options.graphicWidth - width of the height, default: the icon width
     * options.fillOpacity - opacity of the marker (from 0 to 1), default: 1
     * options.html - html content of a popup, default: null
     *
     * Example:
     * (code)
     * api.showMarker({
     *          easting: 518752,
     *          northing: 147276,
     *          html: "Marker with popup"
     * });
     * (end)
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
        var html;

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
        if (options.html) {
            html = options.html;
        } else {
            html = null;
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
                new OpenLayers.Geometry.Point(easting, northing),
        {
            html: html
        }, style_mark);


        this.drawLayer.addFeatures(features);

        if (recenter == "true") {
            this.map.setCenter(new OpenLayers.LonLat(easting, northing));
        }
        return features;
    },

    getShowMarkerDescription: function(html) {
        var separator = this.getReturnLine(html);
        var comment = "      // showMarker config parameters" + separator;
        comment = comment + "      //  easting - position of the marker, default: map center" + separator;
        comment = comment + "      //  northing - position of the marker, default: map center" + separator;
        comment = comment + "      //  iconPath - path of a custom icon for the marker (url or relative), default: /mfbase/openlayers/img/marker-gold.png" + separator;
        comment = comment + "      //  recenter - define if the map has to recentered at the marker position, default: false" + separator;
        comment = comment + "      //  graphicHeight - height of the height, default: the icon height" + separator;
        comment = comment + "      //  graphicWidth - width of the height, default: the icon width" + separator;
        comment = comment + "      //  fillOpacity - opacity of the marker (from 0 to 1), default: 1" + separator;
        comment = comment + "      //  html - html content of a popup, default: null" + separator;
        return comment;
    },
    /**
     * Method: showPopup(options)
     * Shows a {GeoExt.Popup}
     *
     * Parameters:
     * options.easting - position of the popup - default: map center
     * options.northing - position of the popup, default: map center
     * options.title - title of the window, default: ""
     * options.html - html content of the popup, default: "" . If empty, no popup is shown
     * options.recenter - define if the map has to recentered at the popup position, default: false
     * options.width - width of the popup, default: 200
     * options.collapsible - default: false
     * options.unpinnable - default: true
     * options.feature - feature associated with the popup
     *
     * Example:
     * (code)
     * api.showPopup({
     *          easting: 518752,
     *          northing: 147276,
     *          html: "<h1>Example</h1><br>Popup without marker",
     *          title: "Simple Popup"
     * });
     * (end)
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
        var feature;

        // Manage options
        if (options.feature) {
            feature = options.feature;
            html = options.feature.attributes.html;
        } else {
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
            if (options.html) {
                html = options.html;
            } else {
                html = null;
            }
        }
        if (options.title) {
            title = options.title;
        } else {
            title = "";
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

        if (this.popup) {
            this.popup.close();
        }

        if (html) {
            this.popup = new GeoExt.Popup({
                map: this.map,
                feature: feature,
                title: title,
                lonlat: new OpenLayers.LonLat(easting, northing),
                width: width,
                html: html,
                collapsible: collapsible,
                unpinnable: unpinnable
            });
            if (feature) {
                this.popup.on({
                    close: function() {
                        if (OpenLayers.Util.indexOf(this.drawLayer.selectedFeatures,
                                feature) > -1) {
                            this.selectCtrl.unselect(feature);
                        }
                    },
                    scope: this
                });
            }
            this.popup.show();
        }

        if (recenter == "true") {
            this.map.setCenter(new OpenLayers.LonLat(easting, northing));
        }
    },

    getShowPopupDescription: function(html) {
        var separator = this.getReturnLine(html);
        var comment = "      // showPopup config parameters" + separator;
        comment = comment + "      //  easting - position of the popup - default: map center" + separator;
        comment = comment + "      //  northing - position of the popup, default: map center" + separator;
        comment = comment + "      //  title - title of the window, default: " + separator;
        comment = comment + "      //  html - html content of the popup, default: '' . If empty, no popup is shown" + separator;
        comment = comment + "      //  recenter - define if the map has to recentered at the popup position, default: false" + separator;
        comment = comment + "      //  width - width of the popup, default: 200" + separator;
        comment = comment + "      //  collapsible - default: false" + separator;
        comment = comment + "      //  unpinnable - default: true" + separator;
        comment = comment + "      //  feature - feature associated with the popup" + separator;
        return comment;
    },

    /**
     * Method: updateLayerTreeFromPermalink()
     * Update the permalink according to the layer tree
     *
     * Works only if layertree is a mapfish.widgets.LayerTree and has id attributes
     * for all of its nodes.
     *
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
            if (!this.selectCtrl) {
                this.selectCtrl = new OpenLayers.Control.SelectFeature(this.drawLayer);
                this.map.addControl(this.selectCtrl);
                this.selectCtrl.activate();
                this.drawLayer.events.on({
                    featureselected: function(e) {
                        this.showPopup({
                            feature: e.feature
                        });
                        document.body.style.cursor = 'default';
                    },
                    scope: this
                });
            }
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
