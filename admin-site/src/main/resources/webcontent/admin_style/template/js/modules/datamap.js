define(["jquery"], function ($) {
    function getDataMap(){
        return $(".data-map p").data("data-map");
    }

    function getData(name){
        return getDataMap()[name];
    }

    return {
        dataMap : getDataMap,
        data : getData
    }
});