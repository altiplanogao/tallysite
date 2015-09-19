/**
 * Created by Gao Yuan on 2015/6/14.
 */
;(function ($, window, undefined) {
    'use strict';

    var $doc = $(document);

    $(document).ready(function() {
        tallybook.menu ? tallybook.menu.initOnDocReady($doc) : null;
        tallybook.entity.initOnDocReady($doc);
        tallybook.entity.scrollGrid ? tallybook.entity.scrollGrid.initOnDocReady( $doc) : null;
        tallybook.entity.form ? tallybook.entity.form.initOnDocReady( $doc) : null;
    });

    if (!Array.prototype.last) {
        Array.prototype.last = function() {
            return this[this.length - 1];
        };
    }


})(jQuery, this);

