/**
 * Created by Gao Yuan on 2015/6/14.
 */
;(function ($, window, undefined) {
    'use strict';

    var $doc = $(document);

    $(document).ready(function() {
        tallybook.menu ? tallybook.menu.initOnDocReady($doc) : null;
        tallybook.entity.grid.initOnDocReady($doc);
        tallybook.entityGrid.initOnDocReady(window, $doc);
        tallybook.entity.filter.initOnDocReady($doc);
    });

})(jQuery, this);

