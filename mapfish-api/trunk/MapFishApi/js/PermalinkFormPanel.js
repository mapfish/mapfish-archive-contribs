Ext.namespace("MapFish");

MapFish.API.PermalinkFormPanel = Ext.extend(Ext.FormPanel, {
    id: 'linkPanel',
    labelAlign: 'top',
    initComponent: function() {
        this.items = [
            {
                xtype: 'textfield',
                fieldLabel: 'Permalink',
                id: 'permalink',
                width: 250,
                listeners: {
                    'focus': function() {
                        this.selectText();
                    }
                }

            }
        ];
        MapFish.API.PermalinkFormPanel.superclass.initComponent.call(this);
    }
});