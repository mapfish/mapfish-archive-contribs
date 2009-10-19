Ext.namespace("MapFish");

MapFish.API.PermalinkFormPanel = Ext.extend(Ext.FormPanel, {
    id: 'linkPanel',
    initComponent: function() {
        this.items = [
            {
                xtype: 'textfield',
                hideLabel: true,
                id: 'permalink',
                width: 350,
                listeners: {
                    'focus': function() {
                        this.selectText();
                    }
                }
            },
            {
                xtype:'box',
                autoEl: {html:'<a href="" onclick="var permalinkHref=Ext.getCmp(\'permalink\').getValue();window.open(permalinkHref);return false;">Permalink</a>'}
            }
        ];
        MapFish.API.PermalinkFormPanel.superclass.initComponent.call(this);
    }
});