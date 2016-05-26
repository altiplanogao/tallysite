/**
 * Created by Gao Yuan on 2016/3/24.
 */
requirejs.config({
    baseUrl: '/js/admin',
    paths: {
//        "menu": 'jsx!/js/modules/menu',
        "datamap": '/js/modules/datamap',
        "react":"/lib/react/react-with-addons",
        "react-dom":"/lib/react/react-dom",
        "JSXTransformer": "JSXTransformer",
        "jquery": "/lib/jquery/jquery-2.1.4.min",
        "underscore" : "/lib/underscore/underscore-min"
    },
    shim: {
        'underscore': {
            exports: '_'
        },
        'jquery': {
            exports: '$'
        }
    },
    jsx: {
        fileExtension: '.jsx'
    }
});

// Start the main app logic.
requirejs(['react', 'react-dom', 'jsx!../modules/menu', 'jsx!../modules/tgrid', "datamap"],
    function   (React, ReactDom, menu, tgrid,datamap) {
        var menuData = datamap.data("menu");
        var menuPath = datamap.data("menuPath");
        menu.renderMenu( menuData, menuPath, document.getElementById('sideMenu'));
        menu.renderBreadcrumb( menuData, menuPath, document.getElementById('breadcrumbSection'));

        //var tgrid = require('jsx!../modules/tgrid');
        var queryResult = datamap.data("queryResult");
        tgrid.renderGrid(queryResult, document.getElementById("viewSlot"));
        //jQuery, canvas and the app/sub module are all
        //loaded and can be used here now.
    });