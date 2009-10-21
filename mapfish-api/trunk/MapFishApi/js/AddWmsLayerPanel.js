Ext.namespace("MapFish");

MapFish.API.AddWmsLayerFormPanel = Ext.extend(Ext.Panel, {
    id: 'addWmsLayerFormPanel',
    api: null,
    layout: 'form',
    constructor: function(config) {
        this.api = config;
        this.items = [
            {
                xtype: 'label',
                text: 'Add a WMS layer in your map',
                cls: 'labelAddWmsLayerFormPanel'
            },
            {
                xtype: 'textfield',
                id: 'cbWMSUrlAddWmsLayerFormPanel',
                fieldLabel: 'WMS URL',
                value: 'http://dev.geoext.org/trunk/geoext/examples/data/wmscap.xml',
                width: 280
            },
            {
                xtype: 'button',
                text: 'Discover layers',
                cls: 'buttonAddWmsLayerFormPanel',
                width: 200,
                handler: function() {
                    var WmsUrl = Ext.getCmp('cbWMSUrlAddWmsLayerFormPanel').getValue();
                    if (WmsUrl.length > 0) {
                        var win = new Ext.Window({
                            width:800,
                            height:600,
                            autoScroll: true,
                            title:"API Code source",
                            html:''
                        });
                        win.show();
                    } else {
                        Ext.Msg.alert('WMS Url', 'Please enter a valid WMS URL');
                    }
                },
                scope: this
            }
        ];
        MapFish.API.AddWmsLayerFormPanel.superclass.constructor.call(this, config);
    }

});