Ext.namespace("MapFish");

// Replaces all instances of the given substring.
String.prototype.replaceAll = function(
        strTarget, // The substring you want to replace
        strSubString // The string you want to replace in.
        ) {
    var strText = this;
    var intIndexOfMatch = strText.indexOf(strTarget);

    // Keep looping while an instance of the target string
    // still exists in the string.
    while (intIndexOfMatch != -1) {
        // Relace out the current instance.
        strText = strText.replace(strTarget, strSubString)

        // Get the index of any next matching substring.
        intIndexOfMatch = strText.indexOf(strTarget);
    }

    // Return the updated string with ALL the target strings
    // replaced out with the new substring.
    return( strText );
};

MapFish.API.ApiFormPanel = Ext.extend(Ext.Panel, {
    id: 'apiPanel',
    api: null,
    layout: 'form',
    constructor: function(config) {
        this.api = config;
        this.items = [
            {
                xtype: 'label',
                text: 'API configuration',
                cls: 'labelApiFormPanel'
            },
            {
                xtype: 'checkbox',
                id: 'cbMarkerApiFormPanel',
                hideLabel: true,
                boxLabel: 'Show marker in the middle of the map',
            },
            {
                xtype: 'checkbox',
                id: 'cbPopupApiFormPanel',
                hideLabel: true,
                boxLabel: 'Show popup in the middle of the map',
                handler: function(cb,checked) {
                    if (checked) {
                        Ext.getCmp('cbPopupContentApiFormPanel').enable();
                    } else {
                       Ext.getCmp('cbPopupContentApiFormPanel').disable(); 
                    }
                }
            },
            {
                xtype: 'textfield',
                id: 'cbPopupContentApiFormPanel',
                fieldLabel: 'Html content: ',
                width: 250,
                disabled: true
            },
            {
                xtype: 'button',
                text: 'Generate API code',
                cls: 'buttonApiFormPanel',
                width: 200,
                handler: function() {
                    var code = this.api.createApiCode(true).replaceAll('<br>', 'blablabla');
                    var code = code.replaceAll('<', '&#60;');
                    var code = code.replaceAll('>', '&#62;');
                    var code = code.replaceAll(' ', '&nbsp;');
                    var code = code.replaceAll('blablabla', '<br>');
                    var win = new Ext.Window({
                        width:800,
                        height:600,
                        autoScroll: true,
                        title:"API Code source",
                        html:code
                    });
                    win.show();
                },
                scope: this
            }
        ];
        MapFish.API.ApiFormPanel.superclass.constructor.call(this, config);
    }

});