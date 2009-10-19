Ext.namespace("MapFish");

MapFish.API.ApiFormPanel = Ext.extend(Ext.FormPanel, {
    id: 'apiPanel',
    initComponent: function() {
        this.items = [
            {
                xtype: 'textarea',
                hideLabel: true,
                id: 'apitext',
                width: 350,
                height: 400,
                listeners: {
                    'focus': function() {
                        this.selectText();
                    }
                }
            }
        ];
        MapFish.API.ApiFormPanel.superclass.initComponent.call(this);
    }
});