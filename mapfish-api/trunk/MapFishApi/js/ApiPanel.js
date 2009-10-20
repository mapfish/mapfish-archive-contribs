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
    constructor: function(config) {
        this.api = config;
        this.items = [
            {
                xtype: 'button',
                text: 'Show API code',
                width: 200,
                handler: function() {
                    var code = this.api.createApiCode(true).replaceAll('<br>', 'blablabla');
                    var code = code.replaceAll('<', '&#60;');
                    var code = code.replaceAll('>', '&#62;');
                    var code = code.replaceAll(' ','&nbsp;');
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