Ext.namespace("MapFish");

MapFish.API.GeoNamesSearchCombo = Ext.extend(Ext.form.ComboBox, {
    /**
     * Property: api
     * {MapFish.API} instance
     */
    api: null,

    minChars: 1,

    queryDelay: 50,

    id: 'GeonamesCombo',

    hideTrigger: true,

    displayField: 'name',

    forceSelection: true,

    queryParam: 'name_startsWith',

    tpl: '<tpl for="."><div class="x-combo-list-item"><h1>{name}<br></h1>{fcodeName} - {countryName}</div></tpl>',


    initComponent: function() {
        MapFish.API.GeoNamesSearchCombo.superclass.initComponent.call(this);

        this.store = new Ext.data.Store({
            proxy: new Ext.data.ScriptTagProxy({
                url: 'http://ws.geonames.org/searchJSON?',
                method: 'GET'
            }),
            baseParams: {
                maxRows: '20'
            },
            reader: new Ext.data.JsonReader({
                idProperty: 'geonameId',
                root: "geonames",
                totalProperty: "totalResultsCount",
                fields: [
                    {
                        name: 'geonameId'
                    },
                    {
                        name: 'countryName'
                    },
                    {
                        name: 'lng'
                    },
                    {
                        name: 'lat'
                    },
                    {
                        name: 'name'
                    },
                    {
                        name: 'fcodeName'
                    }
                ]  })
        });
        this.store.load();

        this.on("select", function(combo, record, index) {
            var position = new OpenLayers.LonLat(record.data.lng, record.data.lat);
            position.transform(new OpenLayers.Projection("EPSG:4326"), this.api.map.getProjectionObject());
            this.api.map.setCenter(position, 14);
        }, this);


        //fields: ['countryName', 'adminCode1', 'fclName', 'countryCode', 'lng', 'fcodeName', 'fcl','name','fcode', 'geonameId', 'lat', 'population', 'adminName1' ]
    },

    initList : function() {
        MapFish.API.GeoNamesSearchCombo.superclass.initList.call(this);
        // record the click target dom node.
        this.view.on('beforeclick', function(view, index, node, event) {
            this.lastTarget = event.getTarget();
        }, this);
    }
});