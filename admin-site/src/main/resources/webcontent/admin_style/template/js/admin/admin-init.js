/**
 * Created by Gao Yuan on 2015/6/14.
 */
;(function ($, window, undefined) {
    'use strict';

    var $doc = $(document);

    $(document).ready(function() {
        tallybook.menu.initOnDocReady($doc);
        tallybook.entity.grid.initOnDocReady($doc);
        tallybook.entityGrid.initOnDocReady(window, $doc);
    });

})(jQuery, this);

