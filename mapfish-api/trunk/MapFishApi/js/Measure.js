Ext.namespace("MapFish");

MapFish.API.Measure = OpenLayers.Class({

    prevPopup: null,

    initialize: function(config) {
        Ext.apply(this, config);
    },

    createLengthMeasureControl: function() {
        return new OpenLayers.Control.Measure(
            OpenLayers.Handler.Path, {
                persist: true,
                handlerOptions: {
                    layerOptions: {styleMap: this.getStyleMap()}
                },
                eventListeners: {
                    'measure': this.renderMeasure,
                    'measurepartial': this.clearMeasure,
                    'deactivate': this.deactivateTool,
                    scope: this
                }
                
            }
        );
    },

    createAreaMeasureControl: function() {
        return new OpenLayers.Control.Measure(
            OpenLayers.Handler.Polygon, {
                persist: true,
                handlerOptions: {
                    layerOptions: {styleMap: this.getStyleMap()}
                },
                eventListeners: {
                    'measure': this.renderMeasure,
                    'measurepartial': this.clearMeasure,
                    'deactivate': this.deactivateTool,
                    scope: this
                }
            }
        );
    },

    getStyleMap: function() {
        var sketchSymbolizers = {
            "Point": {
                pointRadius: 4,
                graphicName: "square",
                fillColor: "white",
                fillOpacity: 1,
                strokeWidth: 1,
                strokeOpacity: 1,
                strokeColor: "#FFFF33"
            },
            "Line": {
                strokeWidth: 3,
                strokeOpacity: 1,
                strokeColor: "#FFFF33"
            },
            "Polygon": {
                strokeWidth: 2,
                strokeOpacity: 1,
                strokeColor: "#FFFF33",
                fillColor: "white",
                fillOpacity: 0.3
            }
        };
        var style = new OpenLayers.Style();
        style.addRules([
            new OpenLayers.Rule({symbolizer: sketchSymbolizers})
        ]);
        return new OpenLayers.StyleMap({"default": style});
    },

    renderMeasure: function(event) {
        var out = event.measure.toFixed(3) + " " + event.units;
        if (event.order != 1) {
            out += "<sup>2</" + "sup>";
        }
        this.createPopup(out);
    },

    createPopup: function(out) {
        this.clearMeasure();
        var popup = new Ext.Window({
            title: OpenLayers.i18n('Measure'),
            html:  out,
            width: 150,
            bodyStyle: 'background-color: #FFFFD0;'
        });
        this.prevPopup = popup;
        popup.show();

    },

    clearMeasure: function() {
        var th = this.scope || this;
        if (th.prevPopup) {
            th.prevPopup.close();
        }
        th.prevPopup = null;
    },

    deactivateTool: function() {
        this.clearMeasure();
    }
});
